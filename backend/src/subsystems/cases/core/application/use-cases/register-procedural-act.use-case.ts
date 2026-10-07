import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { ValidationError } from '@shared/domain/domain-error';
import { Case } from '../../domain/entities/cases';
import { CaseNotFoundError } from '../../domain/errors/case.errors';
import { CASE_REPOSITORY, CaseRepository } from '../../domain/ports/case.repository';
import { DEADLINE_CALCULATOR, DeadlineCalculatorPort } from '../../domain/ports/deadline-calculator.port';
import {
  PROC_STATE_LOOKUP,
  ProcStateLookupPort,
  ProceduralStateRef,
} from '../../domain/ports/proc-state-lookup.port';
import { DayType } from '../../domain/value-objects/day-type';
import { Deadline } from '../../domain/value-objects/deadline';
import {
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
    @Inject(PROC_STATE_LOOKUP) private readonly procStates: ProcStateLookupPort,
    @Inject(DEADLINE_CALCULATOR) private readonly calculator: DeadlineCalculatorPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(command: RegisterProceduralActCommand): Promise<RegisterProceduralActResult> {
    const targetCase = await this.cases.findById(command.caseId);
    if (!targetCase) {
      throw new CaseNotFoundError();
    }
    targetCase.assertCanRegisterActs(command.actor);

    // The state the case is in may be inactive by now: it is read as it is.
    const currentState =
      targetCase.currentStateId === null ? null : await this.procStates.findById(targetCase.currentStateId);
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
      id: await this.cases.nextProceduralActId(),
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

    await this.cases.saveProceduralAct(targetCase, act);
    return { act, becameCurrent };
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
      const state = await this.procStates.findById(proceduralStateId);
      if (!state || !state.isActive) {
        return fail('proceduralStateId', 'No existe un estado procesal vigente con ese identificador.');
      }
      if (state.jurisdictionId !== targetCase.jurisdictionId || state.terminal || state.isInitial) {
        return fail('proceduralStateId', 'El estado procesal no pertenece al fuero de la causa o es terminal.');
      }
      return { proceduralStateId, customState: null, state };
    }

    // A hand-written state is kept only in this case: it cannot repeat one of the table (CA-26.7).
    if (await this.procStates.existsActiveByName(targetCase.jurisdictionId, customState!)) {
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
