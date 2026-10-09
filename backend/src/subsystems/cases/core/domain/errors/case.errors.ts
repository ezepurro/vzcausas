import { ConflictError, ValidationError } from '@shared/domain/domain-error';

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
