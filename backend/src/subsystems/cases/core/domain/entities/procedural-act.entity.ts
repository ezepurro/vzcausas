import { ValidationError } from '@shared/domain/domain-error';
import { Deadline } from '../value-objects/deadline/deadline.vo';

export interface ProceduralActProps {
  id: number;
  caseId: number;
  // Exactly one of the two is set: a table state or a hand-written one.
  proceduralStateId: number | null;
  customState: string | null;
  actDate: Date;
  // Only ADMINISTRATIVE cases (RN6).
  notificationDate: Date | null;
  notes: string | null;
  deadline: Deadline;
  registeredByUserId: number;
  // The responsible lawyer of the case at registration time.
  registeredByLawyerId: number;
  registeredAt: Date;
  // Last modification (HU28, D-98). Absent or `null` while the act was never modified.
  lastModifiedByUserId?: number | null;
  lastModifiedAt?: Date | null;
}

/**
 * What a `PATCH` of an act brings (HU28). A field left `undefined` was not sent
 * and does not change; `null` empties it where the contract allows it.
 */
export interface ProceduralActChanges {
  proceduralStateId?: number | null;
  customState?: string | null;
  actDate?: Date | null;
  notificationDate?: Date | null;
  manualDueDate?: Date | null;
  notes?: string | null;
}

export type ProceduralActField = keyof ProceduralActChanges;

/** The fields a `PATCH` of an act may bring, in the order they are reported as changed. */
export const PROCEDURAL_ACT_FIELDS: readonly ProceduralActField[] = [
  'proceduralStateId',
  'customState',
  'actDate',
  'notificationDate',
  'manualDueDate',
  'notes',
];

/** The data of an act as it would end up after a change, before its deadline is computed. */
export interface ProceduralActData {
  proceduralStateId: number | null;
  customState: string | null;
  actDate: Date;
  notificationDate: Date | null;
  manualDueDate: Date | null;
  notes: string | null;
}

/**
 * {@link ProceduralAct.resolveChanges}: the act as it would end up, what really
 * changed, and every problem of the act itself, keyed by field.
 */
export interface ResolvedActChanges extends ProceduralActData {
  // Whether the resulting state differs from the current one: it decides which term applies (D-98).
  stateChanged: boolean;
  changedFields: ProceduralActField[];
  errors: Record<string, string>;
}

/** What {@link ProceduralAct.modify} needs: the validated data, its new deadline and who modifies. */
export interface ProceduralActModification extends Omit<ProceduralActData, 'manualDueDate'> {
  deadline: Deadline;
  modifiedByUserId: number;
  now: Date;
}

export interface NewProceduralActInput {
  id: number;
  caseId: number;
  proceduralStateId?: number | null;
  customState?: string | null;
  actDate: Date;
  notificationDate?: Date | null;
  notes?: string | null;
  deadline: Deadline;
  registeredByUserId: number;
  registeredByLawyerId: number;
  // Civil date of the study today, and the instant of registration.
  today: Date;
  now: Date;
}

const CUSTOM_STATE_MAX = 255;
const NOTES_MAX = 2000;
// HU28: the wording of V5 `:6087`, and of HU19 for a field that cannot be emptied.
const BOTH_STATES = 'Elegí un estado de la tabla o escribí uno, no las dos cosas.';
const CANNOT_BE_EMPTIED = 'No puede quedar vacío.';

/** Same instant, or both absent. */
function sameDate(a: Date | null, b: Date | null): boolean {
  return a === null || b === null ? a === b : a.getTime() === b.getTime();
}

/** Text trimmed, with blank treated as absent. */
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Procedural act: one entry in the timeline of a case. Lives inside the Case aggregate. */
export class ProceduralAct {
  private constructor(private readonly props: ProceduralActProps) {}

  /**
   * Builds a new act. It checks the rules of the act itself and reports all
   * the problems together, keyed by field. Whether the user may register it,
   * and whether it becomes the current act of the case, is up to the Case.
   */
  static create(input: NewProceduralActInput): ProceduralAct {
    const errors: Record<string, string> = {};
    const customState = clean(input.customState);
    const proceduralStateId = input.proceduralStateId ?? null;
    const notificationDate = input.notificationDate ?? null;
    const notes = clean(input.notes);

    if ((proceduralStateId === null) === (customState === null)) {
      errors.proceduralStateId = 'Indicá un estado procesal de la tabla o un estado escrito a mano, no ambos.';
    }
    if (customState !== null && customState.length > CUSTOM_STATE_MAX) {
      errors.customState = `Debe tener hasta ${CUSTOM_STATE_MAX} caracteres.`;
    }
    Object.assign(errors, ProceduralAct.validateDates({ ...input, notificationDate }));
    if (notes !== null && notes.length > NOTES_MAX) {
      errors.notes = `Debe tener hasta ${NOTES_MAX} caracteres.`;
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('VALIDATION_ERROR', 'Los datos enviados no son válidos.', errors);
    }

    return new ProceduralAct({
      id: input.id,
      caseId: input.caseId,
      proceduralStateId,
      customState,
      actDate: input.actDate,
      notificationDate,
      notes,
      deadline: input.deadline,
      registeredByUserId: input.registeredByUserId,
      registeredByLawyerId: input.registeredByLawyerId,
      registeredAt: input.now,
    });
  }

  /**
   * The rules of the dates of an act (CA-26.11, RN6), keyed by field; empty if
   * they hold. Pure, so the deadline preview applies the very same rules
   * without building an act.
   */
  static validateDates(input: { actDate: Date; notificationDate?: Date | null; today: Date }): Record<string, string> {
    const errors: Record<string, string> = {};
    const notificationDate = input.notificationDate ?? null;

    if (Number.isNaN(input.actDate.getTime())) {
      errors.actDate = 'Debe ser una fecha válida (AAAA-MM-DD).';
    } else if (input.actDate > input.today) {
      errors.actDate = 'No puede ser posterior a la fecha de hoy.';
    } else if (
      notificationDate !== null &&
      (Number.isNaN(notificationDate.getTime()) || notificationDate < input.actDate || notificationDate > input.today)
    ) {
      errors.notificationDate = 'Debe estar entre la fecha del acto y hoy.';
    }
    return errors;
  }

  /** Rebuilds a {@link ProceduralAct} from persisted data, without validation. */
  static hydrate(props: ProceduralActProps): ProceduralAct {
    return new ProceduralAct(props);
  }

  /**
   * HU28. Applies the sent changes over the act, without changing it, and checks
   * the rules of the act itself on the result (CA-28.3). A value equal to the
   * current one is not a change.
   */
  resolveChanges(changes: ProceduralActChanges, today: Date): ResolvedActChanges {
    const errors: Record<string, string> = {};
    const sent = (field: ProceduralActField) => changes[field] !== undefined;

    // The state: one of the two, never both (V5 §3.8). Sending one replaces the other.
    const stateIdSent = typeof changes.proceduralStateId === 'number';
    const customSent = typeof changes.customState === 'string';
    const customState = customSent ? clean(changes.customState) : null;
    if (changes.proceduralStateId === null) {
      errors.proceduralStateId = CANNOT_BE_EMPTIED;
    }
    if (changes.customState === null || (customSent && customState === null)) {
      errors.customState = CANNOT_BE_EMPTIED;
    }
    let result = { proceduralStateId: this.props.proceduralStateId, customState: this.props.customState };
    if (stateIdSent && customSent) {
      errors.proceduralStateId = BOTH_STATES;
    } else if (stateIdSent) {
      result = { proceduralStateId: changes.proceduralStateId!, customState: null };
    } else if (customState !== null) {
      result = { proceduralStateId: null, customState };
      if (customState.length > CUSTOM_STATE_MAX) {
        errors.customState = `Debe tener hasta ${CUSTOM_STATE_MAX} caracteres.`;
      }
    }

    if (changes.actDate === null) {
      errors.actDate = CANNOT_BE_EMPTIED;
    }
    const actDate = changes.actDate ?? this.props.actDate;
    const notificationDate = sent('notificationDate') ? (changes.notificationDate ?? null) : this.props.notificationDate;
    const manualDueDate = sent('manualDueDate') ? (changes.manualDueDate ?? null) : this.props.deadline.manualDueDate;
    const notes = sent('notes') ? clean(changes.notes) : this.props.notes;
    if (notes !== null && notes.length > NOTES_MAX) {
      errors.notes = `Debe tener hasta ${NOTES_MAX} caracteres.`;
    }
    // The dates are checked as the act would end up: a notification already on record against a new act date.
    if (!errors.actDate) {
      Object.assign(errors, ProceduralAct.validateDates({ actDate, notificationDate, today }));
    }

    const data: ProceduralActData = { ...result, actDate, notificationDate, manualDueDate, notes };
    const current: ProceduralActData = {
      proceduralStateId: this.props.proceduralStateId,
      customState: this.props.customState,
      actDate: this.props.actDate,
      notificationDate: this.props.notificationDate,
      manualDueDate: this.props.deadline.manualDueDate,
      notes: this.props.notes,
    };
    const changedFields = PROCEDURAL_ACT_FIELDS.filter((field) => {
      const before = current[field];
      const after = data[field];
      return before instanceof Date || after instanceof Date
        ? !sameDate(before as Date | null, after as Date | null)
        : before !== after;
    });
    const stateChanged = changedFields.includes('proceduralStateId') || changedFields.includes('customState');

    return { ...data, stateChanged, changedFields, errors };
  }

  /**
   * HU28. The act with the data already validated and its new deadline. Keeps
   * who registered it and when; records who modified it and when (CA-28.10).
   */
  modify(modification: ProceduralActModification): ProceduralAct {
    return new ProceduralAct({
      ...this.props,
      proceduralStateId: modification.proceduralStateId,
      customState: modification.customState,
      actDate: modification.actDate,
      notificationDate: modification.notificationDate,
      notes: modification.notes,
      deadline: modification.deadline,
      lastModifiedByUserId: modification.modifiedByUserId,
      lastModifiedAt: modification.now,
    });
  }

  get id(): number {
    return this.props.id;
  }

  get caseId(): number {
    return this.props.caseId;
  }

  get proceduralStateId(): number | null {
    return this.props.proceduralStateId;
  }

  get customState(): string | null {
    return this.props.customState;
  }

  /** `true` if the resulting state is hand-written and kept only in this case (CA-26.7). */
  get isCustom(): boolean {
    return this.props.customState !== null;
  }

  get actDate(): Date {
    return this.props.actDate;
  }

  get notificationDate(): Date | null {
    return this.props.notificationDate;
  }

  get notes(): string | null {
    return this.props.notes;
  }

  get deadline(): Deadline {
    return this.props.deadline;
  }

  get registeredByUserId(): number {
    return this.props.registeredByUserId;
  }

  get registeredByLawyerId(): number {
    return this.props.registeredByLawyerId;
  }

  get registeredAt(): Date {
    return this.props.registeredAt;
  }

  /** `null` while the act was never modified (CA-28.10). */
  get lastModifiedByUserId(): number | null {
    return this.props.lastModifiedByUserId ?? null;
  }

  get lastModifiedAt(): Date | null {
    return this.props.lastModifiedAt ?? null;
  }
}
