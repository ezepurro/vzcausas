import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { ValidationError } from '@shared/domain/domain-error';
import { TRANSACTION_MANAGER, TransactionManagerPort } from '@shared/domain/transaction-manager.port';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { Case, TargetState } from '../../../domain/entities/case/case.entity';
import { ProceduralAct } from '../../../domain/entities/procedural-act.entity';
import { CaseNotFoundError } from '../../../domain/errors/case.errors';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';
import { PROCEDURAL_ACT_REPOSITORY, ProceduralActRepository } from '../../../domain/ports/procedural-act/procedural-act.repository';
import { PEOPLE_LOOKUP, PeopleLookupPort } from '../../../domain/ports/case/people-lookup.port';
import { DEADLINE_CALCULATOR, DeadlineCalculatorPort } from '../../../domain/ports/procedural-act/deadline-calculator.port';
import { LEGAL_PARAMETERS_LOOKUP, LegalParametersLookupPort } from '../../../domain/ports/case/legal-parameters-lookup.port';
import { Deadline } from '../../../domain/value-objects/deadline/deadline.vo';
import {
  DeadlinePreviewResult,
  PreviewProceduralActDeadlineQuery,
  RegisterProceduralActCommand,
  RegisterProceduralActResult,
} from './register-procedural-act.interfaces';

const INVALID_DATA_MESSAGE = 'Los datos enviados no son válidos.';

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

    // Checked here, before the data, to keep the order of the contract (422 before 400);
    // `registerProceduralAct` guards the same invariant on its own.
    targetCase.assertAcceptsActs();

    if (Number.isNaN(command.actDate.getTime())) {
      throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, {
        actDate: 'Debe ser una fecha válida (AAAA-MM-DD).',
      });
    }

    const target = await this.resolveTargetState(targetCase, command);
    const deadline = await this.buildDeadline(targetCase, target, command);

    const { act, becameCurrent } = targetCase.registerProceduralAct({
      id: await this.acts.nextId(),
      target,
      actDate: command.actDate,
      notificationDate: command.notificationDate ?? null,
      notes: command.notes ?? null,
      deadline,
      actor: command.actor,
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
   * Looks up what the user chose; whether it is a valid target is the rule of the
   * case ({@link Case.resolveTargetState}).
   * @throws ValidationError
   */
  private async resolveTargetState(targetCase: Case, command: RegisterProceduralActCommand): Promise<TargetState> {
    const proceduralStateId = command.proceduralStateId ?? null;
    const customState = command.customState?.trim() || null;

    // Only the lookup that the choice needs: if both or none were sent, the case rejects it.
    const state =
      proceduralStateId !== null && customState === null
        ? await this.legalParameters.findProcStateById(proceduralStateId)
        : null;
    const customStateNamesTableState =
      proceduralStateId === null && customState !== null
        ? await this.legalParameters.existsProcStateActiveByName(targetCase.jurisdictionId, customState)
        : false;

    return targetCase.resolveTargetState({ proceduralStateId, customState, state, customStateNamesTableState });
  }

  /**
   * Copies the term of the target state into a new deadline and computes its due
   * date (RN5). What the state means for the term is the rule of the case
   * ({@link Case.openTerm}); the calendar is the calculator's.
   * @throws ValidationError
   */
  private async buildDeadline(
    targetCase: Case,
    target: TargetState,
    command: RegisterProceduralActCommand,
  ): Promise<Deadline> {
    const manualDueDate = command.manualDueDate ?? null;
    const { timeLimitDays, dayType, countsFrom } = targetCase.openTerm(target, {
      actDate: command.actDate,
      notificationDate: command.notificationDate ?? null,
      manualDueDate,
    });
    const computedDueDate =
      timeLimitDays > 0 ? await this.calculator.computeDueDate(countsFrom, timeLimitDays, dayType) : null;

    return Deadline.create({ timeLimitDays, dayType, countsFrom, computedDueDate, manualDueDate });
  }
}
