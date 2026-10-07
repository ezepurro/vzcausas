import {
  BusinessRuleError,
  ConflictError,
  ForbiddenActionError,
  NotFoundError,
  ValidationError,
} from '@shared/domain/domain-error';

/** Emitted when the SAC number is already used by another case (RN2, 409). */
export class CaseSacAlreadyExistsError extends ConflictError {
  constructor() {
    super('CASE_SAC_ALREADY_EXISTS', 'Ya existe una causa registrada con ese número de SAC.');
  }
}

/** Emitted when the case does not exist (404). */
export class CaseNotFoundError extends NotFoundError {
  constructor() {
    super('CASE_NOT_FOUND', 'No se encontró la causa solicitada.');
  }
}

/** Emitted when the user is not the lawyer in charge of the case (D-30, 403). */
export class NotResponsibleLawyerError extends ForbiddenActionError {
  constructor() {
    super('FORBIDDEN', 'Solo el abogado responsable de la causa puede registrar actos procesales.');
  }
}

/** Emitted when a procedural act is registered on a case in a terminal state (422). */
export class CaseInTerminalStateError extends BusinessRuleError {
  constructor() {
    super('CASE_IN_TERMINAL_STATE', 'La causa se encuentra en un estado terminal y no admite actos procesales.');
  }
}

/** Emitted when the `caseId` path parameter is not a positive integer (400). */
export class InvalidCaseIdError extends ValidationError {
  constructor() {
    super('INVALID_PATH_PARAMETER', 'El identificador de la causa no es válido.', {
      caseId: 'Debe ser un número entero válido.',
    });
  }
}
