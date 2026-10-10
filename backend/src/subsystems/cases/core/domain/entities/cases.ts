import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ValidationError } from '@shared/domain/domain-error';
import { CaseInTerminalStateError, NotResponsibleLawyerError } from '../errors/case.errors';
import { Deadline } from '../value-objects/deadline';
import { Instructor } from '../value-objects/instructor';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { ProceduralRole } from '../value-objects/procedural-role';
import { ProceduralAct } from './procedural-act';

/** Name of the role that may register procedural acts (together with being the responsible lawyer). */
const LAWYER_ROLE = 'LAWYER';

export interface RegisterProceduralActInput {
  id: number;
  // Exactly one of the two (the use case checked it against the table of the jurisdiction).
  proceduralStateId: number | null;
  customState: string | null;
  actDate: Date;
  notificationDate: Date | null;
  notes: string | null;
  // Already built from the table of the jurisdiction (or empty for a hand-written state).
  deadline: Deadline;
  actor: AuthenticatedUser;
  // Whether the state the case is in now is terminal.
  currentStateIsTerminal: boolean;
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
  // Current state: exactly one of the two is set. A new case starts in the
  // initial state of its jurisdiction ("Iniciada").
  currentStateId: number | null;
  currentCustomState: string | null;
  // Act that led to the current state. Null while in the initial state.
  currentProceduralActId: number | null;
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
   * @throws NotResponsibleLawyerError
   */
  assertCanRegisterActs(actor: AuthenticatedUser): void {
    const isLawyer = actor.roleNames.includes(LAWYER_ROLE);
    if (!isLawyer || actor.lawyerId === null || actor.lawyerId !== this.props.responsibleLawyerId) {
      throw new NotResponsibleLawyerError();
    }
  }

  /**
   * A case in a terminal state is closed: it admits no more acts.
   * @throws CaseInTerminalStateError
   */
  assertAcceptsActs(currentStateIsTerminal: boolean): void {
    if (currentStateIsTerminal) {
      throw new CaseInTerminalStateError();
    }
  }

  /**
   * Registers a procedural act (HU26). The act is always put on record, but
   * the case only moves to its state if the act is not older than the current
   * one (CA-26.10): then the act becomes the current one and the case takes its
   * state and deadline. A tie goes to the act registered last.
   */
  registerProceduralAct(input: RegisterProceduralActInput): RegisterProceduralActOutcome {
    this.assertCanRegisterActs(input.actor);
    this.assertAcceptsActs(input.currentStateIsTerminal);

    const act = ProceduralAct.create({
      id: input.id,
      caseId: this.props.id,
      proceduralStateId: input.proceduralStateId,
      customState: input.customState,
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

  get currentStateId(): number | null {
    return this.props.currentStateId;
  }

  get currentCustomState(): string | null {
    return this.props.currentCustomState;
  }

  get currentProceduralActId(): number | null {
    return this.props.currentProceduralActId;
  }

  get proceduralActs(): ProceduralAct[] {
    return this.props.proceduralActs;
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
