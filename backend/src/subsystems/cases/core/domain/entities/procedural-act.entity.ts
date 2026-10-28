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
}
