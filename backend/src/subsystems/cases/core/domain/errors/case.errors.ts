import { ConflictError } from '@shared/domain/domain-error';

/** Emitted when the SAC number is already used by another case (RN2, 409). */
export class CaseSacAlreadyExistsError extends ConflictError {
  constructor() {
    super('CASE_SAC_ALREADY_EXISTS', 'Ya existe una causa registrada con ese número de SAC.');
  }
}
