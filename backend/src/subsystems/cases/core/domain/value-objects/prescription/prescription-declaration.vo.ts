import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ValidationError } from '@shared/domain/domain-error';
import { CannotDeclarePrescriptionError } from '../../errors/case.errors';

const RESOLUTION_MAX = 255;
const GROUNDS_MAX = 2000;
const INVALID_DATA_MESSAGE = 'Los datos enviados no son válidos.';

/** The profiles that may mark a case as prescribed (HU33, CA-33.1, CA-33.2). */
const DECLARING_ROLES: readonly string[] = ['ADMINISTRATOR', 'LAWYER'];

/** What the form of "Marcar prescripta" sends (contract V4 §3.7, `POST /cases/{caseId}/prescription`). */
export interface PrescriptionDeclarationInput {
  prescriptionDate?: Date | null;
  resolution?: string | null;
  grounds?: string | null;
}

/** Who records the declaration and when, plus the civil date of today. */
export interface PrescriptionDeclarationContext {
  registeredByUserId: number;
  registeredAt: Date;
  today: Date;
}

export interface PrescriptionDeclarationProps {
  prescriptionDate: Date;
  resolution: string;
  grounds: string | null;
  registeredByUserId: number;
  registeredAt: Date;
}

/**
 * The record that a criminal case prescribed (HU33): the date, the resolution
 * that declares it, the optional grounds, and who recorded it and when
 * (`prescriptionDeclaration` of contract V4 §3.7).
 *
 * **A value object, not an entity.** It has no identity of its own — it is one
 * to one with its case and lives in its columns — and no life cycle: it is
 * recorded once and never changed or undone (D-54, CA-33.12). What makes it
 * valid is decided when it is built, so every instance in memory is a valid
 * declaration.
 *
 * Not to be confused with `Prescription` (`prescription.ts`): that is the term
 * the backend *computes* on every read; this is what the *court* declared.
 */
export class PrescriptionDeclaration {
  private constructor(private readonly props: PrescriptionDeclarationProps) {}

  /**
   * Only an administrator or a lawyer may declare a prescription, any lawyer and
   * not only the responsible one (CA-33.1); the secretariat may not (CA-33.2).
   * It does not depend on the case, so the refusal comes before the case is read.
   * @throws CannotDeclarePrescriptionError
   */
  static assertCanBeDeclaredBy(actor: AuthenticatedUser): void {
    if (!actor.roleNames.some((role) => DECLARING_ROLES.includes(role))) {
      throw new CannotDeclarePrescriptionError();
    }
  }

  /**
   * Validates the data of the form and reports **every** wrong field at once,
   * as the contract's example does. The date may be today but not later
   * (CA-33.3); the resolution is required; the grounds are optional and a blank
   * one is stored as `null`.
   * @throws ValidationError
   */
  static create(input: PrescriptionDeclarationInput, context: PrescriptionDeclarationContext): PrescriptionDeclaration {
    const errors: Record<string, string> = {};

    const date = input.prescriptionDate;
    const hasDate = date instanceof Date && !Number.isNaN(date.getTime());
    if (!hasDate) {
      errors.prescriptionDate = 'La fecha de la prescripción es obligatoria.';
    } else if (date > context.today) {
      errors.prescriptionDate = 'No puede ser posterior a hoy.';
    }

    const resolution = input.resolution?.trim() ?? '';
    if (resolution === '') {
      errors.resolution = 'La resolución que declara la prescripción es obligatoria.';
    } else if (resolution.length > RESOLUTION_MAX) {
      errors.resolution = `Debe tener como máximo ${RESOLUTION_MAX} caracteres.`;
    }

    const grounds = input.grounds?.trim() || null;
    if (grounds !== null && grounds.length > GROUNDS_MAX) {
      errors.grounds = `Debe tener como máximo ${GROUNDS_MAX} caracteres.`;
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, errors);
    }

    return new PrescriptionDeclaration({
      prescriptionDate: date as Date,
      resolution,
      grounds,
      registeredByUserId: context.registeredByUserId,
      registeredAt: context.registeredAt,
    });
  }

  /** Rebuilds a declaration from persisted data, without validation. */
  static hydrate(props: PrescriptionDeclarationProps): PrescriptionDeclaration {
    return new PrescriptionDeclaration({ ...props });
  }

  get prescriptionDate(): Date {
    return this.props.prescriptionDate;
  }

  get resolution(): string {
    return this.props.resolution;
  }

  get grounds(): string | null {
    return this.props.grounds;
  }

  get registeredByUserId(): number {
    return this.props.registeredByUserId;
  }

  get registeredAt(): Date {
    return this.props.registeredAt;
  }

  equals(other: PrescriptionDeclaration): boolean {
    return (
      this.props.prescriptionDate.getTime() === other.props.prescriptionDate.getTime() &&
      this.props.resolution === other.props.resolution &&
      this.props.grounds === other.props.grounds &&
      this.props.registeredByUserId === other.props.registeredByUserId &&
      this.props.registeredAt.getTime() === other.props.registeredAt.getTime()
    );
  }
}
