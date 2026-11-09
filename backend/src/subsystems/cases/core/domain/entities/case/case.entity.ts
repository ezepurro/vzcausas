import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ValidationError } from '@shared/domain/domain-error';
import {
  CannotDeclarePrescriptionError,
  CaseInTerminalStateError,
  EmptyCaseUpdateError,
  NotResponsibleLawyerError,
  PrescriptionNotApplicableError,
} from '../../errors/case.errors';
import { CaseDataRules, FieldErrors } from '../../rules/case-data-rules';
import { CaseChangeSet } from '../../value-objects/case/case-change-set.vo';
import { CaseDeactivation } from '../../value-objects/case/case-deactivation.vo';
import { isRoleAllowedIn } from '../../value-objects/case/procedural-role';
import { CASE_FIELDS, CaseChanges, CaseField, CaseModificationContext, PendingChanges } from './case-changes';
import { ProceduralStateRef } from '../../ports/case/legal-parameters-lookup.port';
import { DayType } from '../../value-objects/deadline/day-type';
import { Deadline } from '../../value-objects/deadline/deadline.vo';
import { HarmfulActDeadline } from '../../value-objects/case/harmful-act.vo';
import { Instructor } from '../../value-objects/case/instructor';
import { PrescriptionDeclaration, PrescriptionDeclarationInput } from '../../value-objects/prescription/prescription-declaration.vo';
import { JurisdictionCode } from '../../value-objects/case/jurisdiction-code';
import { ProceduralRole } from '../../value-objects/case/procedural-role';
import { CaseSnapshot } from './case-snapshot';
import {
  PROCEDURAL_ACT_FIELDS,
  ProceduralAct,
  ProceduralActChanges,
  ProceduralActData,
  ProceduralActField,
} from '../procedural-act.entity';

/** Name of the role that may register procedural acts (together with being the responsible lawyer). */
const LAWYER_ROLE = 'LAWYER';
const ADMINISTRATOR_ROLE = 'ADMINISTRATOR';
const SECRETARY_ROLE = 'SECRETARY';

const INVALID_DATA_MESSAGE = 'Los datos enviados no son válidos.';
const TERMINAL_HAS_NO_DUE_DATE = 'Un estado terminal cierra la causa y no admite vencimiento.';

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

/** What marking a case as prescribed needs (HU33). */
export interface DeclarePrescriptionInput {
  // What the form sends; validated by {@link PrescriptionDeclaration}.
  data: PrescriptionDeclarationInput;
  // The "Prescripta" state of the jurisdiction of the case (D-53), or `null` if there is none.
  prescribedState: ProceduralStateRef | null;
  actor: AuthenticatedUser;
  // Civil date of the study today, and the instant of the declaration.
  today: Date;
  now: Date;
}

/** D-113 — declaring the prescription of one legal qualification of the case. */
export interface DeclareQualificationPrescriptionInput extends DeclarePrescriptionInput {
  legalQualificationId: number;
}

/**
 * What the use case found out about the state an act would end up in (HU28). The
 * aggregate decides with it; it only looks it up.
 */
export interface ActModificationRefs {
  // The row of the resulting table state: the one sent, or the current one if none was. `null` for a hand-written state.
  state: ProceduralStateRef | null;
  // Whether a hand-written state sent repeats an active state of the table (CA-26.7).
  customStateNamesTableState: boolean;
}

/** {@link Case.planActModification}: the act as it will end up, the term to compute and what changed. */
export interface ActModificationPlan extends ProceduralActData {
  term: OpenedTerm;
  // Whether the resulting state closes the case.
  terminal: boolean;
  changedFields: ProceduralActField[];
}

/** What {@link Case.recalculateCurrentAct} needs to apply D-14 after a modification (D-99). */
export interface RecalculateCurrentActInput {
  modified: ProceduralAct;
  modifiedTerminal: boolean;
  // The most recent of the other acts of the case, or `null` if it has no other.
  latestOther: ProceduralAct | null;
  latestOtherTerminal: boolean;
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
  // Who gave the case de baja, when and why (HU21). Absent or `null` while it is in force.
  deactivation?: CaseDeactivation | null;
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

  /**
   * Marks the case as prescribed (HU33). Only a criminal case prescribes
   * (D-74, CA-33.9): every other jurisdiction refuses it here, and
   * `CriminalCase` overrides it. Who asks for it is checked before, by
   * {@link Case.assertCanDeclarePrescriptionBy}.
   * @throws PrescriptionNotApplicableError
   */
  declarePrescription(_input: DeclarePrescriptionInput): void {
    throw new PrescriptionNotApplicableError();
  }

  /**
   * D-113 — declares one legal qualification prescribed. Same as
   * {@link Case.declarePrescription}: only a criminal case prescribes, and
   * `CriminalCase` overrides it, so the jurisdiction is refused before looking
   * for the qualification.
   * @throws PrescriptionNotApplicableError
   */
  declareQualificationPrescription(_input: DeclareQualificationPrescriptionInput): void {
    throw new PrescriptionNotApplicableError();
  }

  /**
   * D-113: the legal qualifications whose prescription is not declared yet.
   * Only a criminal case has any.
   */
  get qualificationsPendingPrescription(): number[] {
    return [];
  }

  /** The declaration that the case prescribed. Only a criminal case can have one. */
  get prescriptionDeclaration(): PrescriptionDeclaration | null {
    return null;
  }

  /**
   * HU21 — gives the case de baja (contract V5, `DELETE /cases/{caseId}`). The
   * baja is logical (RN12): the case keeps its acts, interruptive acts and
   * folder, and only stops existing for the client (D-97).
   *
   * Any jurisdiction and any state, terminal ones included (CA-21.9): what is
   * withdrawn is a wrongly registered case, not a finished one. That is why it
   * lives in the base class and asks nothing about acts or the state.
   *
   * A case already given de baja does not exist for the client, so the use case
   * answers 404 before getting here; reaching it twice is a programming error.
   */
  deactivate(deactivation: CaseDeactivation): void {
    if (!this.props.active) {
      throw new Error(`The case ${this.props.id} was already given de baja.`);
    }
    this.props.active = false;
    this.props.deactivation = deactivation;
    this.props.updatedAt = deactivation.deactivatedAt;
  }

  /**
   * HU19 — corrects the data of the case (contract V5, `PATCH /cases/{caseId}`).
   *
   * A template method. The base validates what every case has (SAC and start
   * date, caption, court, instructor, procedural role, client, responsible
   * lawyer, court fee) and rejects the data of other jurisdictions; each
   * jurisdiction validates its own in {@link validateOwnChanges}. Everything is
   * validated **before** anything is applied, and every problem is reported in
   * one `400`: either the whole change lands or the case stays as it was.
   *
   * A case in a terminal state can be corrected too (D-96, CA-19.13): nothing
   * here asks whether it accepts acts. What a jurisdiction refuses outright is
   * checked first, in {@link assertCanBeModifiedWith}, the business before the data.
   *
   * @returns what actually changed: a field sent with the value it had is not a change.
   * @throws {EmptyCaseUpdateError} no field was sent (CA-19.2).
   * @throws {CaseInTerminalStateError} what the jurisdiction refuses (CA-19.13).
   * @throws {ValidationError} `VALIDATION_ERROR` with every invalid field.
   */
  modify(changes: CaseChanges, context: CaseModificationContext): CaseChangeSet {
    if (!CASE_FIELDS.some((field) => changes[field] !== undefined)) {
      throw new EmptyCaseUpdateError();
    }
    this.assertCanBeModifiedWith(changes);

    const errors: FieldErrors = { ...context.referenceErrors };
    const applyCommon = this.validateCommonChanges(changes, context.today, errors);
    this.rejectDataOfOtherJurisdictions(changes, errors);
    const applyOwn = this.validateOwnChanges(changes, context, errors);
    if (Object.keys(errors).length > 0) {
      throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, errors);
    }

    const changed = [...applyCommon(), ...applyOwn()];
    if (changed.length > 0) {
      this.props.updatedAt = context.now;
    }
    return CaseChangeSet.of(changed);
  }

  /**
   * What a jurisdiction refuses to change regardless of the data. Nothing, by
   * default; `CriminalCase` refuses new qualifications once it prescribed.
   * @throws CaseInTerminalStateError
   */
  protected assertCanBeModifiedWith(_changes: CaseChanges): void {}

  /** The fields that belong to this jurisdiction only: the rest are rejected here (CA-19.4). */
  protected abstract ownFields(): readonly CaseField[];

  /** Validates the data of this jurisdiction and returns how to apply it. */
  protected abstract validateOwnChanges(
    changes: CaseChanges,
    context: CaseModificationContext,
    errors: FieldErrors,
  ): PendingChanges;

  /** The data of one jurisdiction, with the message for sending it in another: the registration's. */
  private static readonly DATA_OF_ONE_JURISDICTION: Partial<Record<CaseField, string>> = {
    legalQualifications: CaseDataRules.ONLY_CRIMINAL_QUALIFICATIONS,
    clientDetained: CaseDataRules.ONLY_CRIMINAL,
    counterparty: CaseDataRules.NOT_IN_CRIMINAL,
    subjectMatter: CaseDataRules.NOT_IN_CRIMINAL,
    injunctionGranted: CaseDataRules.ONLY_AMPARO,
    harmfulActDate: CaseDataRules.ONLY_AMPARO,
    harmfulActRenews: CaseDataRules.ONLY_AMPARO,
    harmfulActRenewalDays: CaseDataRules.ONLY_AMPARO,
    harmfulActTermDays: CaseDataRules.ONLY_AMPARO,
    harmfulActTermDayType: CaseDataRules.ONLY_AMPARO,
    administrativeRemedyExhaustedOn: CaseDataRules.ONLY_ADMINISTRATIVE,
  };

  private rejectDataOfOtherJurisdictions(changes: CaseChanges, errors: FieldErrors): void {
    const own = this.ownFields();
    for (const [field, message] of Object.entries(Case.DATA_OF_ONE_JURISDICTION) as [CaseField, string][]) {
      if (!own.includes(field) && CaseDataRules.isSent(changes[field])) {
        errors[field] = message;
      }
    }
  }

  /** What every case has: validated against the case as it would end up, applied later. */
  private validateCommonChanges(changes: CaseChanges, today: Date, errors: FieldErrors): PendingChanges {
    const sent = (field: CaseField) => changes[field] !== undefined;
    const cannotBeEmptied = (field: CaseField) => {
      if (changes[field] === null) {
        errors[field] = CaseDataRules.CANNOT_BE_EMPTIED;
      }
    };

    // SAC and start date go together, as in the registration: they are checked as they would end up.
    const sacNumber = sent('sacNumber') ? CaseDataRules.clean(changes.sacNumber) : this.props.sacNumber;
    if (sent('sacNumber') && sacNumber !== null && !CaseDataRules.isSacNumber(sacNumber)) {
      errors.sacNumber = 'Debe contener exactamente 8 dígitos.';
    }
    const startDate = sent('startDate') ? (changes.startDate ?? null) : this.props.startDate;
    if (sent('startDate') && startDate !== null) {
      CaseDataRules.checkPastDate(errors, 'startDate', startDate, today);
    }
    if ((sent('sacNumber') || sent('startDate')) && !errors.startDate) {
      if (sacNumber === null && startDate !== null) {
        errors.startDate = 'Sin número de SAC la causa no tiene fecha de inicio.';
      } else if (sacNumber !== null && startDate === null) {
        errors.startDate = 'Es obligatoria cuando se informa el número de SAC.';
      }
    }

    const caption = sent('caption') ? CaseDataRules.clean(changes.caption) : this.props.caption;
    if (sent('caption')) {
      if (caption === null) {
        errors.caption = 'Es obligatoria.';
      }
      CaseDataRules.checkLength(errors, 'caption', caption);
    }
    const court = sent('court') ? CaseDataRules.clean(changes.court) : this.props.court;
    const instructor = {
      name: sent('instructorName') ? CaseDataRules.clean(changes.instructorName) : this.props.instructor.name,
      phone: sent('tribunalPhone') ? CaseDataRules.clean(changes.tribunalPhone) : this.props.instructor.phone,
      extension: sent('instructorExtension')
        ? CaseDataRules.clean(changes.instructorExtension)
        : this.props.instructor.extension,
    };
    CaseDataRules.checkLength(errors, 'court', court);
    CaseDataRules.checkLength(errors, 'instructorName', instructor.name);
    CaseDataRules.checkLength(errors, 'tribunalPhone', instructor.phone);
    CaseDataRules.checkLength(errors, 'instructorExtension', instructor.extension);

    cannotBeEmptied('responsibleLawyerId');
    cannotBeEmptied('courtFeePaid');
    cannotBeEmptied('proceduralRole');
    if (changes.proceduralRole && !isRoleAllowedIn(changes.proceduralRole, this.jurisdictionCode)) {
      errors.proceduralRole = 'El rol procesal no corresponde al fuero.';
    }

    return () => {
      const changed: CaseField[] = [];
      const props = this.props;
      Case.track(changed, 'sacNumber', props.sacNumber, sacNumber, () => (props.sacNumber = sacNumber));
      Case.track(changed, 'startDate', props.startDate, startDate, () => (props.startDate = startDate));
      Case.track(changed, 'caption', props.caption, caption, () => (props.caption = caption as string));
      Case.track(changed, 'court', props.court, court, () => (props.court = court));
      // The instructor is one object with three fields the contract names apart:
      // each is recorded on its own, and the object is replaced once.
      const noop = () => undefined;
      Case.track(changed, 'instructorName', props.instructor.name, instructor.name, noop);
      Case.track(changed, 'tribunalPhone', props.instructor.phone, instructor.phone, noop);
      Case.track(changed, 'instructorExtension', props.instructor.extension, instructor.extension, noop);
      props.instructor = instructor;
      if (sent('responsibleLawyerId')) {
        Case.track(changed, 'responsibleLawyerId', props.responsibleLawyerId, changes.responsibleLawyerId, () => {
          props.responsibleLawyerId = changes.responsibleLawyerId!;
        });
      }
      if (sent('proceduralRole')) {
        Case.track(changed, 'proceduralRole', props.proceduralRole, changes.proceduralRole, () => {
          props.proceduralRole = changes.proceduralRole!;
        });
      }
      if (sent('courtFeePaid')) {
        Case.track(changed, 'courtFeePaid', props.courtFeePaid, changes.courtFeePaid, () => {
          props.courtFeePaid = changes.courtFeePaid!;
        });
      }
      return changed;
    };
  }

  /**
   * Applies a field only if its value is really different, and records it as
   * changed. Dates are compared by their instant, not by reference.
   */
  protected static track(changed: CaseField[], field: CaseField, before: unknown, after: unknown, apply: () => void): void {
    const same =
      before instanceof Date && after instanceof Date ? before.getTime() === after.getTime() : before === after;
    if (!same) {
      apply();
      changed.push(field);
    }
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
    if (!this.isResponsibleLawyer(actor)) {
      throw new NotResponsibleLawyerError(message);
    }
  }

  /**
   * Who operates the case (D-110, V5 §4 "Operación de la causa"): its
   * responsible lawyer, an administrator or a secretary. A lawyer who is not
   * the responsible one only consults it. One role among several is enough.
   * Used by modifying, giving de baja and the folder; `message` words the
   * refusal as the contract does for each.
   * @throws NotResponsibleLawyerError
   */
  assertCanBeOperatedBy(actor: AuthenticatedUser, message: string): void {
    if (actor.roleNames.includes(ADMINISTRATOR_ROLE) || actor.roleNames.includes(SECRETARY_ROLE)) {
      return;
    }
    if (!this.isResponsibleLawyer(actor)) {
      throw new NotResponsibleLawyerError(message);
    }
  }

  /**
   * Who marks the case as prescribed (HU33, D-110): an administrator, or the
   * responsible lawyer. The secretariat alone may not (CA-33.2); a lawyer who
   * is not the responsible one is refused with the contract's own wording:
   * `message` is the one of the case (HU33) by default, and D-113 passes its own
   * for declaring a qualification.
   * @throws NotResponsibleLawyerError
   * @throws CannotDeclarePrescriptionError
   */
  assertCanDeclarePrescriptionBy(
    actor: AuthenticatedUser,
    message: string = NotResponsibleLawyerError.FOR_DECLARING_PRESCRIPTION,
  ): void {
    if (actor.roleNames.includes(ADMINISTRATOR_ROLE) || this.isResponsibleLawyer(actor)) {
      return;
    }
    if (actor.roleNames.includes(LAWYER_ROLE)) {
      throw new NotResponsibleLawyerError(message);
    }
    throw new CannotDeclarePrescriptionError();
  }

  private isResponsibleLawyer(actor: AuthenticatedUser): boolean {
    return (
      actor.roleNames.includes(LAWYER_ROLE) && actor.lawyerId !== null && actor.lawyerId === this.props.responsibleLawyerId
    );
  }

  /**
   * Moves the case to a state that no act led it to, and that closes it:
   * "Prescripta" (HU33, D-54). There is no current act, so no open deadline
   * either (CA-33.4).
   */
  protected closeInState(stateId: number, now: Date): void {
    this.props.currentStateId = stateId;
    this.props.currentCustomState = null;
    this.props.currentProceduralActId = null;
    this.props.currentStateTerminal = true;
    this.props.updatedAt = now;
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
        manualDueDate: TERMINAL_HAS_NO_DUE_DATE,
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

  /**
   * HU28 — only the **current** responsible lawyer modifies the acts of the case
   * (CA-28.2), with the same rule as registering them (D-30).
   * @throws NotResponsibleLawyerError
   */
  assertCanModifyActs(actor: AuthenticatedUser): void {
    this.assertCanRegisterActs(actor, NotResponsibleLawyerError.FOR_MODIFYING_ACTS);
  }

  /**
   * HU28 — whether the acts of the case can still be corrected. Any case can,
   * terminal or not (CA-28.9); `CriminalCase` refuses it once prescribed (D-99).
   * @throws CaseInTerminalStateError
   */
  assertActsCanBeModified(): void {}

  /**
   * HU28 — validates a change of one of its acts against the act as it would end
   * up, reporting every problem at once (CA-28.3), and decides which term it
   * takes: the table's of today if the state changes, the copied one if not (D-98).
   * @throws EmptyCaseUpdateError no field was sent.
   * @throws ValidationError `VALIDATION_ERROR` with every invalid field.
   */
  planActModification(
    act: ProceduralAct,
    changes: ProceduralActChanges,
    refs: ActModificationRefs,
    today: Date,
  ): ActModificationPlan {
    if (!PROCEDURAL_ACT_FIELDS.some((field) => changes[field] !== undefined)) {
      throw new EmptyCaseUpdateError();
    }
    const resolved = act.resolveChanges(changes, today);
    const errors: Record<string, string> = { ...resolved.errors };
    // Runs a rule that throws, and keeps its problems with the rest: they are all reported at once.
    const collect = <T>(rule: () => T): T | null => {
      try {
        return rule();
      } catch (error) {
        if (!(error instanceof ValidationError)) throw error;
        Object.assign(errors, error.details);
        return null;
      }
    };

    // A new state must be a valid target, as in the registration. The same state sent again is not re-checked.
    if (resolved.stateChanged && !errors.proceduralStateId && !errors.customState) {
      collect(() => this.resolveTargetState({ ...resolved, ...refs }));
    }

    // D-98: a new state takes the table's term of today; otherwise the act keeps the one it copied.
    const tableState = resolved.proceduralStateId !== null ? refs.state : null;
    const timeLimitDays = resolved.stateChanged ? (tableState?.timeLimitDays ?? 0) : act.deadline.timeLimitDays;
    const dayType = resolved.stateChanged ? (tableState?.dayType ?? DayType.NONE) : act.deadline.dayType;
    const terminal = tableState?.terminal ?? false;
    const countsFrom = collect(() =>
      this.resolveCountsFrom(resolved.actDate, resolved.notificationDate, timeLimitDays > 0),
    );

    // A manual due date, also one that was kept, is checked against the act as it ends up (CA-28.6).
    if (resolved.manualDueDate !== null) {
      if (terminal) {
        errors.manualDueDate = TERMINAL_HAS_NO_DUE_DATE;
      } else if (countsFrom !== null && resolved.manualDueDate < countsFrom) {
        errors.manualDueDate = Deadline.MANUAL_BEFORE_COUNTS_FROM;
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, errors);
    }
    return {
      proceduralStateId: resolved.proceduralStateId,
      customState: resolved.customState,
      actDate: resolved.actDate,
      notificationDate: resolved.notificationDate,
      manualDueDate: resolved.manualDueDate,
      notes: resolved.notes,
      term: { timeLimitDays, dayType, countsFrom: countsFrom! },
      terminal,
      changedFields: resolved.changedFields,
    };
  }

  /**
   * HU28 — after a modification the case is in the state of the act with the
   * most recent date, the last registered on a tie (D-14, D-99). It closes or
   * reopens with it (CA-28.7, CA-28.8).
   */
  recalculateCurrentAct(input: RecalculateCurrentActInput): void {
    const { modified, latestOther } = input;
    const otherIsNewer =
      latestOther !== null &&
      (latestOther.actDate.getTime() > modified.actDate.getTime() ||
        (latestOther.actDate.getTime() === modified.actDate.getTime() && latestOther.id > modified.id));
    const governing = otherIsNewer ? latestOther : modified;

    this.props.currentStateId = governing.proceduralStateId;
    this.props.currentCustomState = governing.customState;
    this.props.currentProceduralActId = governing.id;
    this.props.currentStateTerminal = otherIsNewer ? input.latestOtherTerminal : input.modifiedTerminal;
    this.props.proceduralActs = [governing];
    this.props.updatedAt = input.now;
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

  /** The record of the baja; `null` while the case is in force. */
  get deactivation(): CaseDeactivation | null {
    return this.props.deactivation ?? null;
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
