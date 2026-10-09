import { ValidationError } from '@shared/domain/domain-error';

/** Maximum length of `name`, fixed by the contract and by `VarChar(255)`. */
export const QUALIFICATION_NAME_MAX_LENGTH = 255;

export interface LegalQualificationProps {
  id: number;
  name: string;
  prescriptionMonths: number;
  isActive: boolean;
  createdAt: Date | null;
}

/**
 * Legal qualification: the legal framing of the imputed act, which
 * **determines the prescription term of the action** (EP-03, contract
 * §3.5).
 *
 * `name` carries the offence **and its article** in a single field
 * (`Hurto simple — art. 162 CP`), as CA-48.2 requires: the listing's
 * search filters "by name or article", and keeping them apart would
 * force the search to span two columns for no gain. Cutting the
 * caption at the em dash is the frontend's job.
 *
 * `prescriptionMonths` is the **total** in months. The prototype asks
 * for whole years plus a 0–11 month selector so that terms like "6
 * years and a half" can be expressed; rendering 78 back as "6 años y
 * 6 meses" is presentation and belongs to the client (CA-48.3,
 * CA-47.2).
 */
export class LegalQualification {
  private constructor(private readonly props: LegalQualificationProps) {}

  /** Rebuilds a {@link LegalQualification} from persisted data, without validation. */
  static hydrate(props: LegalQualificationProps): LegalQualification {
    return new LegalQualification(props);
  }

  /**
   * Builds a new qualification, validating what CA-48.5 and CA-48.6
   * demand. The uniqueness of `name` is **not** checked here: it is a
   * property of the collection, not of the instance, so it lives in
   * the use case and ultimately in the partial unique index.
   */
  static create(props: LegalQualificationProps): LegalQualification {
    if (!Number.isInteger(props.id) || props.id <= 0) {
      throw new ValidationError(
        'INVALID_LEGAL_QUALIFICATION',
        'El identificador de la calificación legal debe ser un entero positivo.',
      );
    }

    const name = props.name?.trim() ?? '';

    if (name.length === 0) {
      throw new ValidationError(
        'INVALID_LEGAL_QUALIFICATION',
        'La calificación legal debe tener una denominación.',
        { name: 'Es un campo obligatorio.' },
      );
    }

    if (name.length > QUALIFICATION_NAME_MAX_LENGTH) {
      throw new ValidationError(
        'INVALID_LEGAL_QUALIFICATION',
        'La denominación de la calificación legal es demasiado extensa.',
        { name: `Debe tener como máximo ${QUALIFICATION_NAME_MAX_LENGTH} caracteres.` },
      );
    }

    // Mirrors the hand-written CHECK
    // `ck_legal_qualifications_prescription_months_positive`: a term
    // of zero months would prescribe the action at the very moment the
    // offence is registered.
    if (!Number.isInteger(props.prescriptionMonths) || props.prescriptionMonths < 1) {
      throw new ValidationError(
        'INVALID_LEGAL_QUALIFICATION',
        'El plazo de prescripción no es válido.',
        { prescriptionMonths: 'Debe ser un número entero mayor o igual a 1.' },
      );
    }

    return new LegalQualification({ ...props, name });
  }

  get id(): number {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get prescriptionMonths(): number {
    return this.props.prescriptionMonths;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date | null {
    return this.props.createdAt;
  }
}
