import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ValidationError } from '@shared/domain/domain-error';
import { CaseInTerminalStateError, NotResponsibleLawyerError } from '../errors/case.errors';
import { ProceduralStateRef } from '../ports/legal-parameters-lookup.port';
import { DayType } from '../value-objects/day-type';
import { Deadline } from '../value-objects/deadline';
import { HarmfulActDeadline } from '../value-objects/harmful-act';
import { Instructor } from '../value-objects/instructor';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { ProceduralRole } from '../value-objects/procedural-role';
import { CaseSnapshot } from './case-snapshot';
import { ProceduralAct } from './procedural-act';

/** Name of the role that may register procedural acts (together with being the responsible lawyer). */
const LAWYER_ROLE = 'LAWYER';

const INVALID_DATA_MESSAGE = 'Los datos enviados no son válidos.';

/** The state an act takes the case to: from the table, or hand-written. */
export interface TargetState {
  // Exactly one of the two.
  proceduralStateId: number | null;
  customState: string | null;
  // The row of the table. `null` for a hand-written state, which opens no term.
  state: ProceduralStateRef | null;
}

/**
 * What the user chose, with what the use case found out about it. The aggregate
 * decides whether it is a valid target ({@link Case.resolveTargetState}); the use
 * case only looks the references up.
 */
export interface TargetStateChoice {
  proceduralStateId: number | null;
  customState: string | null;
  // The row of `proceduralStateId`, or `null` if there is none.
  state: ProceduralStateRef | null;
  // Whether `customState` repeats the name of an active state of the table of the jurisdiction (CA-26.7).
  customStateNamesTableState: boolean;
}

/** What a state tells about the deadline of an act, before the due date is computed. */
export interface OpenedTerm {
  timeLimitDays: number;
  dayType: DayType;
  countsFrom: Date;
}

export interface RegisterProceduralActInput {
  id: number;
  // Already validated by {@link Case.resolveTargetState}.
  target: TargetState;
  actDate: Date;
  notificationDate: Date | null;
  notes: string | null;
  // Already built from the term of the target state (or empty for a hand-written state).
  deadline: Deadline;
  actor: AuthenticatedUser;
  // Civil date of the study today, and the instant of registration.
  today: Date;
  now: Date;
}

export interface RegisterProceduralActOutcome {
  act: ProceduralAct;
  // `false` when the act is older than the current one: it is on record but does not move the case (CA-26.10).
  becameCurrent: boolean;
}

export interface CaseProps {
  id: number;
  // Optional (D-33). When present it is unique system-wide (RN2).
  sacNumber: string | null;
  caption: string;
  court: string | null;
  jurisdictionId: number;
  proceduralRole: ProceduralRole;
  instructor: Instructor;
  clientId: number;
  responsibleLawyerId: number;
  // Only a case with a SAC number has one: it is when it started in court.
  startDate: Date | null;
  // Whether the court fee was paid (RN10, D-67). In the three jurisdictions.
  courtFeePaid: boolean;
  // Current state: exactly one of the two is set. A new case starts in the
  // initial state of its jurisdiction ("Iniciada").
  currentStateId: number | null;
  currentCustomState: string | null;
  // Act that led to the current state. Null while in the initial state.
  currentProceduralActId: number | null;
  // Whether the current state is terminal. A hand-written state never is.
  currentStateTerminal: boolean;
  proceduralActs: ProceduralAct[];
  active: boolean;
  createdByUserId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Case (causa). Aggregate root of `cases`. Other aggregates (client, lawyer,
 * user, jurisdiction, state) are referenced by id only.
 *
 * One subclass per jurisdiction; all of them are stored in the `cases` table.
 */
export abstract class Case {
  protected constructor(protected readonly props: CaseProps) {}

  /** The jurisdiction this kind of case belongs to. */
  abstract get jurisdictionCode(): JurisdictionCode;

  /**
   * Date the deadline of an act counts from (MODP `fechaInicioComputo`): the
   * notification date in ADMINISTRATIVE cases (RN6), the act date in the rest.
   * @throws ValidationError if the notification date is missing or not allowed for the jurisdiction.
   */
  abstract resolveCountsFrom(actDate: Date, notificationDate: Date | null, stateOpensTerm: boolean): Date;

  /**
   * The case as plain data, with the part of its own jurisdiction filled in
   * (see {@link CaseSnapshot}). Each subclass adds what it has on top of
   * {@link commonSnapshot}.
   */
  abstract toSnapshot(): CaseSnapshot;

  /**
   * The term to file the amparo as of `today` (D-78). Only an amparo has one, and
   * only while it has the date of the harmful act loaded.
   */
  harmfulActDeadline(_today: Date): HarmfulActDeadline | null {
    return null;
  }

  /** What every case has; the part of each jurisdiction is `null` or empty until a subclass fills it. */
  protected commonSnapshot(): CaseSnapshot {
    const props = this.props;
    return {
      id: props.id,
      sacNumber: props.sacNumber,
      caption: props.caption,
      court: props.court,
      jurisdictionId: props.jurisdictionId,
      jurisdictionCode: this.jurisdictionCode,
      proceduralRole: props.proceduralRole,
      instructor: { ...props.instructor },
      clientId: props.clientId,
      responsibleLawyerId: props.responsibleLawyerId,
      startDate: props.startDate,
      courtFeePaid: props.courtFeePaid,
      currentStateId: props.currentStateId,
      currentCustomState: props.currentCustomState,
      currentProceduralActId: props.currentProceduralActId,
      counterparty: null,
      subjectMatter: null,
      clientDetained: null,
      offenses: [],
      injunctionGranted: null,
      harmfulActDate: null,
      harmfulActRenews: null,
      harmfulActRenewalDays: null,
      harmfulActTermDays: null,
      harmfulActTermDayType: null,
      administrativeRemedyExhaustedOn: null,
      active: props.active,
      createdByUserId: props.createdByUserId,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }

  /** Counting from the act date; the notification date is only for ADMINISTRATIVE cases. */
  protected countsFromActDate(actDate: Date, notificationDate: Date | null): Date {
    if (notificationDate !== null) {
      throw new ValidationError('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
        notificationDate: 'Solo se informa en el fuero administrativo.',
      });
    }
    return actDate;
  }

  /**
   * Only the responsible lawyer of the case registers its acts (D-30): the
   * user must have the lawyer role and be the lawyer assigned to this case.
   * Not even an administrator may do it for a case that is not theirs.
   *
   * The same rule governs interruptive acts (HU31, D-50); `message` lets that
   * story word the refusal as its contract does. Omitted, it is HU26's.
   * @throws NotResponsibleLawyerError
   */
  assertCanRegisterActs(actor: AuthenticatedUser, message?: string): void {
    const isLawyer = actor.roleNames.includes(LAWYER_ROLE);
    if (!isLawyer || actor.lawyerId === null || actor.lawyerId !== this.props.responsibleLawyerId) {
      throw new NotResponsibleLawyerError(message);
    }
  }

  /**
   * A case in a terminal state is closed: it admits no more acts — procedural
   * or interruptive (HU31). `message`, as in {@link assertCanRegisterActs}.
   * @throws CaseInTerminalStateError
   */
  assertAcceptsActs(message?: string): void {
    if (this.props.currentStateTerminal) {
      throw new CaseInTerminalStateError(message);
    }
  }

  /**
   * Checks the state the user chose against the table of the jurisdiction of the case.
   * A terminal state is a valid target: it is how a case is closed, e.g. "Archivada" (D-69).
   * The exceptions are "Prescripta", which has its own form (HU33), and the initial state (D-34).
   * @throws ValidationError
   */
  resolveTargetState(choice: TargetStateChoice): TargetState {
    const { proceduralStateId, customState, state } = choice;
    const fail = (field: string, message: string): never => {
      throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, { [field]: message });
    };

    if ((proceduralStateId === null) === (customState === null)) {
      return fail('proceduralStateId', 'Indicá un estado procesal de la tabla o un estado escrito a mano, no ambos.');
    }

    if (proceduralStateId !== null) {
      if (!state || !state.isActive) {
        return fail('proceduralStateId', 'No existe un estado procesal vigente con ese identificador.');
      }
      if (state.jurisdictionId !== this.props.jurisdictionId || state.isPrescribed || state.isInitial) {
        return fail('proceduralStateId', 'El estado procesal no pertenece al fuero de la causa o es el estado Prescripta.');
      }
      return { proceduralStateId, customState: null, state };
    }

    // A hand-written state is kept only in this case: it cannot repeat one of the table (CA-26.7).
    if (choice.customStateNamesTableState) {
      return fail('customState', 'Coincide con un estado de la tabla del fuero: elegilo de la lista.');
    }
    return { proceduralStateId: null, customState, state: null };
  }

  /**
   * What the target state says about the term of an act (RN5): its days, its day
   * type and the date it counts from. A hand-written state opens no term: it only
   * has a due date if the lawyer enters one by hand (CA-26.7). A terminal state
   * closes the case, so it takes no due date at all, not even a manual one (D-69).
   * @throws ValidationError
   */
  openTerm(
    target: TargetState,
    dates: { actDate: Date; notificationDate: Date | null; manualDueDate: Date | null },
  ): OpenedTerm {
    if (target.state?.terminal && dates.manualDueDate != null) {
      throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, {
        manualDueDate: 'Un estado terminal cierra la causa y no admite vencimiento.',
      });
    }
    const timeLimitDays = target.state?.timeLimitDays ?? 0;
    const dayType = target.state?.dayType ?? DayType.NONE;
    const countsFrom = this.resolveCountsFrom(dates.actDate, dates.notificationDate, timeLimitDays > 0);
    return { timeLimitDays, dayType, countsFrom };
  }

  /**
   * Registers a procedural act (HU26). The act is always put on record, but
   * the case only moves to its state if the act is not older than the current
   * one (CA-26.10): then the act becomes the current one and the case takes its
   * state and deadline. A tie goes to the act registered last.
   */
  registerProceduralAct(input: RegisterProceduralActInput): RegisterProceduralActOutcome {
    this.assertCanRegisterActs(input.actor);
    this.assertAcceptsActs();

    const act = ProceduralAct.create({
      id: input.id,
      caseId: this.props.id,
      proceduralStateId: input.target.proceduralStateId,
      customState: input.target.customState,
      actDate: input.actDate,
      notificationDate: input.notificationDate,
      notes: input.notes,
      deadline: input.deadline,
      registeredByUserId: input.actor.userId,
      // The act records who was in charge of the case when it was registered.
      registeredByLawyerId: this.props.responsibleLawyerId,
      today: input.today,
      now: input.now,
    });

    const current = this.currentProceduralAct();
    const becameCurrent = current === null || act.actDate >= current.actDate;

    this.props.proceduralActs.push(act);
    if (becameCurrent) {
      this.props.currentStateId = act.proceduralStateId;
      this.props.currentCustomState = act.customState;
      this.props.currentProceduralActId = act.id;
      this.props.currentStateTerminal = input.target.state?.terminal ?? false;
      this.props.updatedAt = input.now;
    }
    return { act, becameCurrent };
  }

  /** The act that led the case to its current state, or `null` while it is in the initial state. */
  private currentProceduralAct(): ProceduralAct | null {
    if (this.props.currentProceduralActId === null) {
      return null;
    }
    const current = this.props.proceduralActs.find((act) => act.id === this.props.currentProceduralActId);
    if (!current) {
      // The repository must load the current act together with the case.
      throw new Error(`The current act ${this.props.currentProceduralActId} of the case ${this.props.id} is not loaded.`);
    }
    return current;
  }

  get id(): number {
    return this.props.id;
  }

  get sacNumber(): string | null {
    return this.props.sacNumber;
  }

  get caption(): string {
    return this.props.caption;
  }

  get court(): string | null {
    return this.props.court;
  }

  get jurisdictionId(): number {
    return this.props.jurisdictionId;
  }

  get proceduralRole(): ProceduralRole {
    return this.props.proceduralRole;
  }

  get instructor(): Instructor {
    return this.props.instructor;
  }

  get clientId(): number {
    return this.props.clientId;
  }

  get responsibleLawyerId(): number {
    return this.props.responsibleLawyerId;
  }

  get startDate(): Date | null {
    return this.props.startDate;
  }

  get courtFeePaid(): boolean {
    return this.props.courtFeePaid;
  }

  get currentStateId(): number | null {
    return this.props.currentStateId;
  }

  get currentCustomState(): string | null {
    return this.props.currentCustomState;
  }

  get currentProceduralActId(): number | null {
    return this.props.currentProceduralActId;
  }

  /** A copy: the only way to add an act is {@link registerProceduralAct}. */
  get proceduralActs(): readonly ProceduralAct[] {
    return [...this.props.proceduralActs];
  }

  get active(): boolean {
    return this.props.active;
  }

  get createdByUserId(): number {
    return this.props.createdByUserId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
