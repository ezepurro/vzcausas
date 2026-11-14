import { ConflictError, NotFoundError, ValidationError } from '@shared/domain/domain-error';

/**
 * Emitted by `RegisterLegalQualification` (HU-48) when a **current**
 * qualification already carries that denomination, ignoring case
 * (CA-48.4).
 *
 * Scoped to current qualifications on purpose: the database's unique
 * index is partial (`legal_qualifications_name_active_key` over
 * `lower(name)` `WHERE active`), so one that was logically deleted
 * frees its denomination. A plain unique index would make it
 * impossible to register the same offence again after a mistaken
 * deletion.
 *
 * Without `details`: the contract (§3.5) shows `null` for this error.
 */
export class LegalQualificationAlreadyExistsError extends ConflictError {
  constructor() {
    super(
      'LEGAL_QUALIFICATION_ALREADY_EXISTS',
      'Ya existe una calificación legal con esa denominación.',
    );
  }
}

/**
 * Emitted by `GET /legal-qualifications/{qualificationId}` when no
 * current qualification matches.
 *
 * A logically deleted one gets this too, not a payload with
 * `active: false`: CA-47.9 says a qualification given up neither
 * appears in the listing nor can be consulted, so through this
 * endpoint it must be indistinguishable from one that never existed.
 * The cases that already registered it keep showing it in their own
 * detail, which is read from the case, not from here.
 */
export class LegalQualificationNotFoundError extends NotFoundError {
  constructor() {
    // Sin `details`: el contrato (§3.5) muestra `null`.
    super(
      'LEGAL_QUALIFICATION_NOT_FOUND',
      'No se encontró la calificación legal solicitada.',
    );
  }
}

/**
 * Emitted by `UpdateLegalQualification` (HU49) when the `PATCH` carries no
 * field: the contract asks for at least one (§3.5, CA-49.1). The text is
 * ours — the contract gives none — and is the same one `procedural-states`
 * and `clients` use for the same situation.
 */
export class LegalQualificationEmptyPatchError extends ValidationError {
  constructor() {
    super('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
      body: 'Debe enviarse al menos un campo para modificar.',
    });
  }
}

/**
 * Emitted when the `qualificationId` path parameter is not a positive
 * integer. Mirrors `people`'s `InvalidClientIdError` so every resource
 * rejects a malformed id with the contract's `INVALID_PATH_PARAMETER`
 * rather than a generic 400.
 */
export class InvalidLegalQualificationIdError extends ValidationError {
  constructor() {
    super(
      'INVALID_PATH_PARAMETER',
      'El identificador de la calificación legal no es válido.',
      { qualificationId: 'Debe ser un número entero válido.' },
    );
  }
}
