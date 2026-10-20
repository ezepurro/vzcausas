import {
  BadGatewayError,
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
 * Emitted by `GET /cases/custom-states` when the `jurisdiction` filter names
 * no jurisdiction.
 *
 * The contract answers this with `INVALID_REQUEST` and the offending parameter
 * in `details` (§3.7), not with an empty list: a caller that typed "PENAL"
 * instead of "CRIMINAL" deserves to be told, and an empty list would read as
 * "no case in that jurisdiction has a hand-written state".
 *
 * Checked in the application layer rather than with `@IsEnum` on the DTO, for
 * the same reason `ListUsers` checks its `role` filter there: the pipe would
 * raise the generic `VALIDATION_ERROR` and the contract asks for this code.
 */
export class InvalidJurisdictionFilterError extends ValidationError {
  constructor() {
    super('INVALID_REQUEST', 'Parámetros de query inválidos.', {
      jurisdiction: 'No existe un fuero procesal con ese nombre.',
    });
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

/** Emitted when the user is not the lawyer in charge of the case (D-30, 403). */
export class NotResponsibleLawyerError extends ForbiddenActionError {
  /**
   * The message names what was attempted: procedural acts by default (HU26),
   * interruptive acts for HU31, whose contract words it its own way (V4 §3.9).
   */
  constructor(message = 'Solo el abogado responsable de la causa puede registrar actos procesales.') {
    super('FORBIDDEN', message);
  }
}

/** Emitted when a procedural act is registered on a case in a terminal state (422). */
export class CaseInTerminalStateError extends BusinessRuleError {
  /** Same as {@link NotResponsibleLawyerError}: the default is HU26's wording, HU31 passes its own. */
  constructor(message = 'La causa se encuentra en un estado terminal y no admite actos procesales.') {
    super('CASE_IN_TERMINAL_STATE', message);
  }
}

/**
 * Emitted when an interruptive act is registered on a case outside the
 * criminal jurisdiction (HU31, D-50, 422). Only `CRIMINAL` computes
 * prescription, so there is nothing for the act to interrupt.
 */
export class PrescriptionNotApplicableError extends BusinessRuleError {
  constructor() {
    super('PRESCRIPTION_NOT_APPLICABLE', 'La prescripción solo aplica a las causas del fuero penal.');
  }
}

/**
 * Emitted when the `caseId` path parameter is not a positive integer (400).
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

/**
 * Emitted by `GET /cases/{caseId}/procedural-acts/{actId}` (HU27) when the
 * case has no act with that id — **including an act that exists but belongs
 * to another case**. Answering it would let a caller read any act through any
 * case id, and the URL promises an act *of this case*.
 */
export class ProceduralActNotFoundError extends NotFoundError {
  constructor() {
    super('PROCEDURAL_ACT_NOT_FOUND', 'No se encontró el acto procesal solicitado.');
  }
}

/** Emitted when the `actId` path parameter is not a positive integer (400). Same reason as {@link InvalidCaseIdError}. */
export class InvalidProceduralActIdError extends ValidationError {
  constructor() {
    super('INVALID_PATH_PARAMETER', 'El identificador del acto procesal no es válido.', {
      actId: 'Debe ser un número entero válido.',
    });
  }
}

/**
 * `copyTemplates` came as `true` with `createFolder` as `false` (400). The
 * templates are copied into the case folder, so there is nothing to copy them
 * into. Uses the contract's `VALIDATION_ERROR` and message (§3.7).
 */
export class CopyTemplatesWithoutFolderError extends ValidationError {
  constructor() {
    super('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
      copyTemplates: 'Para copiar los modelos primero hay que crear la carpeta de la causa.',
    });
  }
}

/**
 * The cloud folder of a case could not be created (502). It is only raised by
 * `POST /cases/{caseId}/folder`: registering a case never fails because of its
 * folder (CA-39.5). The reason goes to the log, not to the client.
 */
export class CaseFolderUnavailableError extends BadGatewayError {
  constructor() {
    super(
      'DOCUMENT_STORAGE_UNAVAILABLE',
      'No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.',
    );
  }
}

/** The lawyer in charge of the case is no longer active, so its folder cannot be named after them (422). */
export class CaseFolderLawyerUnavailableError extends BusinessRuleError {
  constructor() {
    super(
      'CASE_FOLDER_LAWYER_UNAVAILABLE',
      'No se puede crear la carpeta: el abogado responsable de la causa no está vigente.',
    );
  }
}
