import { ValidationError } from '@shared/domain/domain-error';

const COVER_TEXT_MAX = 500;
const INVALID_DATA_MESSAGE = 'Los datos enviados no son válidos.';

/** What "Generar expediente" sends (contract V5 §3.12, `POST /cases/{caseId}/case-files`). */
export interface CaseFileRequestInput {
  documentIds?: readonly string[] | null;
  cover?: { notes?: string | null; opposingParty?: string | null } | null;
}

/** What the cover sheet of the case file needs and the case does not have (D-92). */
export interface CaseFileCoverInput {
  /** The "Observaciones" box. `null` leaves it empty. */
  notes: string | null;
  /** The party the criminal case does not register. `null` leaves its box empty. */
  opposingParty: string | null;
}

interface CaseFileRequestProps {
  documentIds: readonly string[];
  cover: CaseFileCoverInput;
}

/**
 * A request to generate the case file of a case (HU25), with its shape already
 * checked: at least one document, none repeated (CA-25.2), and the texts of the
 * cover sheet within 500 characters (CA-25.5).
 *
 * **A value object, so the shape is checked once and with the contract's texts.**
 * The DTO only checks types; this reports every wrong field at once, as the
 * contract's examples do. What depends on the case — the folder, the
 * jurisdiction of `opposingParty`, which documents are in the folder — is checked
 * later, by `CoverSheet` and by `documents`.
 *
 * `cover` is never stored (D-92): it only travels to the cover sheet.
 */
export class CaseFileRequest {
  private constructor(private readonly props: CaseFileRequestProps) {}

  /**
   * A missing list counts as an empty one. The texts are trimmed; a blank one
   * counts as absent. Line breaks inside `opposingParty` are kept.
   * @throws ValidationError `VALIDATION_ERROR`, with every wrong field.
   */
  static create(input: CaseFileRequestInput): CaseFileRequest {
    const errors: Record<string, string> = {};

    const documentIds = input.documentIds ?? [];
    if (documentIds.length === 0) {
      errors.documentIds = 'Elegí al menos un documento.';
    } else if (new Set(documentIds).size !== documentIds.length) {
      // The contract forbids repeats but gives no text: our own (pending in DECISIONES.md).
      errors.documentIds = 'No puede haber documentos repetidos.';
    }

    const notes = input.cover?.notes?.trim() || null;
    const opposingParty = input.cover?.opposingParty?.trim() || null;
    if (notes !== null && notes.length > COVER_TEXT_MAX) {
      errors['cover.notes'] = `Debe tener como máximo ${COVER_TEXT_MAX} caracteres.`;
    }
    if (opposingParty !== null && opposingParty.length > COVER_TEXT_MAX) {
      errors['cover.opposingParty'] = `Debe tener como máximo ${COVER_TEXT_MAX} caracteres.`;
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError('VALIDATION_ERROR', INVALID_DATA_MESSAGE, errors);
    }
    return new CaseFileRequest({ documentIds: [...documentIds], cover: { notes, opposingParty } });
  }

  /** In the order of the case file (CA-25.1). */
  get documentIds(): readonly string[] {
    return this.props.documentIds;
  }

  get cover(): CaseFileCoverInput {
    return this.props.cover;
  }
}
