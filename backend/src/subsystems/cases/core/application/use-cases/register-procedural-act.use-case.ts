import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { ValidationError } from '@shared/domain/domain-error';
import { TRANSACTION_MANAGER, TransactionManagerPort } from '@shared/domain/transaction-manager.port';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { Case } from '../../domain/entities/cases';
import { ProceduralAct } from '../../domain/entities/procedural-act';
import { CaseNotFoundError } from '../../domain/errors/case.errors';
import { CASE_REPOSITORY, CaseRepository } from '../../domain/ports/case.repository';
import { PROCEDURAL_ACT_REPOSITORY, ProceduralActRepository } from '../../domain/ports/procedural-act.repository';
import { PEOPLE_LOOKUP, PeopleLookupPort } from '../../domain/ports/people-lookup.port';
import { DEADLINE_CALCULATOR, DeadlineCalculatorPort } from '../../domain/ports/deadline-calculator.port';
import {
  LEGAL_PARAMETERS_LOOKUP,
  LegalParametersLookupPort,
  ProceduralStateRef,
} from '../../domain/ports/legal-parameters-lookup.port';
import { DayType } from '../../domain/value-objects/day-type';
import { Deadline } from '../../domain/value-objects/deadline';
import {
  DeadlinePreviewResult,
  PreviewProceduralActDeadlineQuery,
  RegisterProceduralActCommand,
  RegisterProceduralActResult,
} from '../common/register-procedural-act.interfaces';

const INVALID_DATA_MESSAGE = 'Los datos enviados no son válidos.';

/** The state an act takes the case to: from the table, or hand-written. */
interface TargetState {
  proceduralStateId: number | null;
  customState: string | null;
  // The row of the table. `null` for a hand-written state, which opens no term.
  state: ProceduralStateRef | null;
}

/**
 * HU26: registers a procedural act, which moves the case to a state and opens
 * the term of that state.
 *
 * The order of the checks is the one of the contract: the case exists (404),
 * the user is its lawyer (403), the case is not closed (422) and then the data
 * of the act (400).
 */
@Injectable()
export class RegisterProceduralAct {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(PROCEDURAL_ACT_REPOSITORY) private readonly acts: ProceduralActRepository,
    @Inject(LEGAL_PARAMETERS_LOOKUP) private readonly legalParameters: LegalParametersLookupPort,
    @Inject(PEOPLE_LOOKUP) private readonly people: PeopleLookupPort,
    @Inject(DEADLINE_CALCULATOR) private readonly calculator: DeadlineCalculatorPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(TRANSACTION_MANAGER) private readonly transactions: TransactionManagerPort,
  ) {}

  async execute(command: RegisterProceduralActCommand): Promise<RegisterProceduralActResult> {
    const targetCase = await this.loadCaseForActor(command.caseId, command.actor);

    // The actor is the lawyer in charge, so the record exists: a missing one is broken data, not a user error.
    const registeredBy = await this.people.findActiveLawyerById(command.actor.lawyerId!);
    if (!registeredBy) {
      throw new Error(`The lawyer ${command.actor.lawyerId} in charge of the case ${targetCase.id} is not active.`);
    }

    // The state the case is in may be inactive by now: it is read as it is.
    const currentState =
      targetCase.currentStateId === null
        ? null
        : await this.legalParameters.findProcStateById(targetCase.currentStateId);
    const currentStateIsTerminal = currentState?.terminal ?? false;
    targetCase.assertAcceptsActs(currentStateIsTerminal);

    if (Number.isNaN(command.actDate.getTime())) {
      throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, {
        actDate: 'Debe ser una fecha válida (AAAA-MM-DD).',
      });
    }

    const target = await this.resolveTargetState(targetCase, command);
    const deadline = await this.buildDeadline(targetCase, target, command);

    const { act, becameCurrent } = targetCase.registerProceduralAct({
      id: await this.acts.nextId(),
      proceduralStateId: target.proceduralStateId,
      customState: target.customState,
      actDate: command.actDate,
      notificationDate: command.notificationDate ?? null,
      notes: command.notes ?? null,
      deadline,
      actor: command.actor,
      currentStateIsTerminal,
      today: this.clock.today(),
      now: this.clock.now(),
    });

    // Every read and check is done: the writes go together or not at all. The act first, because the case points to it.
    await this.transactions.runInTransaction(async () => {
      await this.acts.save(act);
      // An act older than the current one is on record, but the case does not move (CA-26.10).
      if (becameCurrent) {
        await this.cases.saveCurrentAct(targetCase);
      }
    });
    return { act, becameCurrent, resultingStateName: (target.state?.name ?? target.customState)!, registeredBy };
  }

  /**
   * The deadline an act would open, without registering anything (API contract §3.8). It
   * serves the "Cómputo del plazo" panel of the form, so what the user sees is
   * what is saved: it goes through the same checks and the same calculation as
   * {@link execute}. A hand-written state and a manual due date have nothing to preview.
   *
   * Unlike the registration, it answers even if the case is closed (that is the
   * registration's 422), and its data errors are the contract's `INVALID_REQUEST`.
   * @throws ValidationError `INVALID_REQUEST`
   */
  async previewDeadline(query: PreviewProceduralActDeadlineQuery): Promise<DeadlinePreviewResult> {
    const targetCase = await this.loadCaseForActor(query.caseId, query.actor);

    try {
      const dateErrors = ProceduralAct.validateDates({
        actDate: query.actDate,
        notificationDate: query.notificationDate,
        today: this.clock.today(),
      });
      if (Object.keys(dateErrors).length > 0) {
        throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, dateErrors);
      }
      if (query.proceduralStateId == null) {
        throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, { proceduralStateId: 'Es obligatorio.' });
      }

      const command: RegisterProceduralActCommand = { ...query, customState: null };
      const target = await this.resolveTargetState(targetCase, command);
      const deadline = await this.buildDeadline(targetCase, target, command);

      return {
        proceduralStateId: query.proceduralStateId,
        timeLimitDays: deadline.timeLimitDays,
        dayType: deadline.dayType,
        countsFrom: deadline.countsFrom,
        dueDate: deadline.dueDate,
        businessDaysRemaining:
          deadline.dueDate === null ? null : await this.calculator.businessDaysUntil(this.clock.today(), deadline.dueDate),
      };
    } catch (error) {
      // The contract reports the problems of a query with its own code.
      if (error instanceof ValidationError && error.code === 'VALIDATION_ERROR') {
        throw new ValidationError('INVALID_REQUEST', 'Parámetros de query inválidos.', error.details);
      }
      throw error;
    }
  }

  /** The case, if it exists (404) and the user is the lawyer in charge of it (403). */
  private async loadCaseForActor(caseId: number, actor: AuthenticatedUser): Promise<Case> {
    const targetCase = await this.cases.findById(caseId);
    if (!targetCase) {
      throw new CaseNotFoundError();
    }
    targetCase.assertCanRegisterActs(actor);
    return targetCase;
  }

  /**
   * Checks the state the user chose against the table of the jurisdiction of the case.
   * A terminal state is not offered as a target, and neither is the initial one (CA-26.8, D-34).
   * @throws ValidationError
   */
  private async resolveTargetState(targetCase: Case, command: RegisterProceduralActCommand): Promise<TargetState> {
    const proceduralStateId = command.proceduralStateId ?? null;
    const customState = command.customState?.trim() || null;
    const fail = (field: string, message: string): never => {
      throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, { [field]: message });
    };

    if ((proceduralStateId === null) === (customState === null)) {
      return fail('proceduralStateId', 'Indicá un estado procesal de la tabla o un estado escrito a mano, no ambos.');
    }

    if (proceduralStateId !== null) {
      const state = await this.legalParameters.findProcStateById(proceduralStateId);
      if (!state || !state.isActive) {
        return fail('proceduralStateId', 'No existe un estado procesal vigente con ese identificador.');
      }
      if (state.jurisdictionId !== targetCase.jurisdictionId || state.terminal || state.isInitial) {
        return fail('proceduralStateId', 'El estado procesal no pertenece al fuero de la causa o es terminal.');
      }
      return { proceduralStateId, customState: null, state };
    }

    // A hand-written state is kept only in this case: it cannot repeat one of the table (CA-26.7).
    if (await this.legalParameters.existsProcStateActiveByName(targetCase.jurisdictionId, customState!)) {
      return fail('customState', 'Coincide con un estado de la tabla del fuero: elegilo de la lista.');
    }
    return { proceduralStateId: null, customState, state: null };
  }

  /**
   * Copies the term of the state into a new deadline and computes its due date
   * (RN5). A hand-written state opens no term: it only has a due date if the
   * lawyer enters one by hand (CA-26.7).
   * @throws ValidationError
   */
  private async buildDeadline(
    targetCase: Case,
    target: TargetState,
    command: RegisterProceduralActCommand,
  ): Promise<Deadline> {
    const timeLimitDays = target.state?.timeLimitDays ?? 0;
    const dayType = target.state?.dayType ?? DayType.NONE;

    const countsFrom = targetCase.resolveCountsFrom(
      command.actDate,
      command.notificationDate ?? null,
      timeLimitDays > 0,
    );
    const computedDueDate =
      timeLimitDays > 0 ? await this.calculator.computeDueDate(countsFrom, timeLimitDays, dayType) : null;

    return Deadline.create({
      timeLimitDays,
      dayType,
      countsFrom,
      computedDueDate,
      manualDueDate: command.manualDueDate ?? null,
    });
  }
}
