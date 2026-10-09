import { ConflictError, NotFoundError, ValidationError } from '@shared/domain/domain-error';

/** Emitted when the SAC number is already used by another case (RN2, 409). */
export class CaseSacAlreadyExistsError extends ConflictError {
  constructor() {
    super('CASE_SAC_ALREADY_EXISTS', 'Ya existe una causa registrada con ese número de SAC.');
  }
}

/**
 * Emitted by `GET /cases` when more than one state filter arrives.
 *
 * The prototype's dropdown lets the user pick a single option, so the three
 * parameters that carry it are mutually exclusive (§3.7): `proceduralStateId`
 * for a state of the jurisdiction's table, `customState` for a hand-written
 * one, and `withoutProceduralActs` for "Iniciada". CA-20.4 is the criterion
 * that breaks most often, which is why this is an explicit error instead of
 * silently honouring one and dropping the rest.
 *
 * The code is the contract's `INVALID_REQUEST`, not the pipe's generic
 * `VALIDATION_ERROR` — same reason `InvalidPaginationError` exists.
 */
export class ExclusiveCaseStateFilterError extends ValidationError {
  constructor(details: Record<string, string>) {
    super('INVALID_REQUEST', 'Parámetros de query inválidos.', details);
  }
}

/**
 * Emitted by `GET /cases/{caseId}` (HU22) when no case matches.
 *
 * Also the answer for a case that exists but was given de baja: through this
 * endpoint the two must be indistinguishable (§4, Bajas — *"para el cliente,
 * un registro dado de baja no existe"*).
 */
export class CaseNotFoundError extends NotFoundError {
  constructor() {
    super('CASE_NOT_FOUND', 'No se encontró la causa solicitada.');
  }
}

/**
 * Emitted when the `caseId` path parameter is not a positive integer.
 *
 * Syntactic rather than semantic, but modeled as a domain error so the
 * response carries the contract's `INVALID_PATH_PARAMETER` instead of the
 * pipe's generic `VALIDATION_ERROR` — the same reason `InvalidUserIdError`
 * and `InvalidPaginationError` exist.
 */
export class InvalidCaseIdError extends ValidationError {
  constructor() {
    super('INVALID_PATH_PARAMETER', 'El identificador de la causa no es válido.', {
      caseId: 'Debe ser un número entero válido.',
    });
  }
}
