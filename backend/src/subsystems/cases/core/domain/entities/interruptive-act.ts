import { ValidationError } from '@shared/domain/domain-error';

export interface InterruptiveActProps {
  id: number;
  caseId: number;
  // Free text: there is no catalogue of interruptive acts (V4, D-49).
  name: string;
  actDate: Date;
  notes: string | null;
  registeredByUserId: number;
  // The responsible lawyer of the case at registration time.
  registeredByLawyerId: number;
  registeredAt: Date;
}

export interface NewInterruptiveActInput {
  id: number;
  caseId: number;
  name: string;
  actDate: Date;
  notes?: string | null;
  registeredByUserId: number;
  registeredByLawyerId: number;
  // Civil date of the study today, and the instant of registration.
  today: Date;
  now: Date;
}

const NAME_MAX = 255;
const NOTES_MAX = 2000;
const INVALID_DATA_MESSAGE = 'Los datos enviados no son válidos.';

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Interruptive act (HU31, RN8): it restarts the prescription of a criminal case
 * from its date. It is **not** a procedural act: it neither moves the state of
 * the case nor opens a term (V4 §3.9, D-48), which is why it is its own entity
 * and not a procedural act with a flag.
 *
 * It holds no prescription itself. The effect is computed on every read of the
 * case from the most recent act (see `prescription.ts`), so registering an act
 * with an older date than another leaves it on record without changing the
 * computation (CA-31.4).
 */
export class InterruptiveAct {
  private constructor(private readonly props: InterruptiveActProps) {}

  /**
   * Builds a new act, validating what CA-31.8 demands: a name of up to 255
   * characters, a real date that is not after today, and notes of up to 2000.
   * Every invalid field is reported at once, keyed by its name.
   * @throws ValidationError
   */
  static create(input: NewInterruptiveActInput): InterruptiveAct {
    const errors: Record<string, string> = {};
    const name = clean(input.name);
    const notes = clean(input.notes);

    if (name === null) {
      errors.name = 'El acto interruptivo es obligatorio.';
    } else if (name.length > NAME_MAX) {
      errors.name = `Debe tener como máximo ${NAME_MAX} caracteres.`;
    }

    if (Number.isNaN(input.actDate.getTime())) {
      errors.actDate = 'Debe ser una fecha válida (AAAA-MM-DD).';
    } else if (input.actDate > input.today) {
      errors.actDate = 'No puede ser posterior a hoy.';
    }

    if (notes !== null && notes.length > NOTES_MAX) {
      errors.notes = `Debe tener como máximo ${NOTES_MAX} caracteres.`;
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, errors);
    }

    return new InterruptiveAct({
      id: input.id,
      caseId: input.caseId,
      name: name!,
      actDate: input.actDate,
      notes,
      registeredByUserId: input.registeredByUserId,
      registeredByLawyerId: input.registeredByLawyerId,
      registeredAt: input.now,
    });
  }

  /** Rebuilds an {@link InterruptiveAct} from persisted data, without validation. */
  static hydrate(props: InterruptiveActProps): InterruptiveAct {
    return new InterruptiveAct(props);
  }

  get id(): number {
    return this.props.id;
  }

  get caseId(): number {
    return this.props.caseId;
  }

  get name(): string {
    return this.props.name;
  }

  get actDate(): Date {
    return this.props.actDate;
  }

  get notes(): string | null {
    return this.props.notes;
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
