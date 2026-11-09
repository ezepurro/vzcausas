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
 * Emitted by `Case.modify` (HU19) when the `PATCH` brings no field to change
 * (CA-19.2). Same `details` as the other `PATCH`es of the contract (HU14,
 * `identity`), so they all answer alike.
 */
export class EmptyCaseUpdateError extends ValidationError {
  constructor() {
    super('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
      body: 'Debe enviarse al menos un campo para modificar.',
    });
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
 * Emitted by `GET /cases/{caseId}/cover` when `disposition` is neither `inline` nor
 * `attachment` (HU24, CA-24.10). The contract answers with `INVALID_REQUEST` and the
 * parameter in `details`, not with the pipe's generic `VALIDATION_ERROR`.
 */
export class InvalidCoverDispositionError extends ValidationError {
  constructor() {
    super('INVALID_REQUEST', 'Parámetros de query inválidos.', {
      disposition: 'Debe ser inline o attachment.',
    });
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

/**
 * Emitted by `GET /cases/{caseId}/documents/{documentId}/file` (HU38) when the
 * folder of the case is not created: no document can be in it (CA-38.5,
 * CA-38.8). `documents` has its own class with the same `code` for a file that
 * is not in a folder that does exist.
 */
export class CaseDocumentNotFoundError extends NotFoundError {
  constructor() {
    super('DOCUMENT_NOT_FOUND', 'No se encontró el documento en la carpeta de la causa.');
  }
}

/**
 * Emitted by `POST /cases/{caseId}/case-files` (HU25, CA-25.7) when the folder of
 * the case is not `CREATED`: the case file is saved in it (D-102). The cover sheet
 * alone does not need it.
 */
export class CaseFolderNotAvailableError extends BusinessRuleError {
  constructor() {
    super(
      'CASE_FOLDER_NOT_AVAILABLE',
      'La causa no tiene su carpeta en Drive creada. Creala antes de generar el expediente.',
    );
  }
}

/** Emitted when the user is not the lawyer in charge of the case (D-30, 403). */
export class NotResponsibleLawyerError extends ForbiddenActionError {
  /** The wording of V5 `:6114` for modifying an act (HU28). */
  static readonly FOR_MODIFYING_ACTS = 'Solo el abogado responsable de la causa puede modificar sus actos procesales.';
  /** The wording of V5 §4 "Operación de la causa" (D-110) for each operation a non-responsible lawyer cannot do. */
  static readonly FOR_MODIFYING_CASE = 'Solo el abogado responsable de la causa puede modificarla.';
  static readonly FOR_DEACTIVATING_CASE = 'Solo el abogado responsable de la causa puede darla de baja.';
  static readonly FOR_OPERATING_FOLDER = 'Solo el abogado responsable de la causa puede operar su carpeta.';
  static readonly FOR_DECLARING_PRESCRIPTION = 'Solo el abogado responsable de la causa puede marcarla como prescripta.';
  /** D-113: declaring the prescription of one legal qualification. */
  static readonly FOR_DECLARING_QUALIFICATION_PRESCRIPTION =
    'Solo el abogado responsable de la causa puede declarar la prescripción de sus calificaciones legales.';

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
  /** The wording of the contract for an operation that is not a procedural act (HU31, HU33). */
  static readonly FOR_THIS_OPERATION = 'La causa se encuentra en un estado terminal y no admite esta operación.';
  /** The wording of V5 `:6141`: the acts of a prescribed case cannot be modified (HU28, D-99). */
  static readonly ACTS_OF_PRESCRIBED_CASE = 'La causa está prescripta: sus actos procesales no se pueden modificar.';

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
  /**
   * The default is the jurisdiction refusal, shared by HU31 and HU33. HU33 passes
   * {@link PrescriptionNotApplicableError.WITHOUT_QUALIFICATIONS} for a criminal
   * case without legal qualifications, which cannot prescribe (D-74).
   */
  static readonly WITHOUT_QUALIFICATIONS = 'La causa no tiene calificaciones legales: no puede prescribir.';

  constructor(message = 'La prescripción solo aplica a las causas del fuero penal.') {
    super('PRESCRIPTION_NOT_APPLICABLE', message);
  }
}

/**
 * D-113 — the case does not register the legal qualification whose prescription
 * is being declared (404). It may exist in `/legal-qualifications`: what matters
 * is that this case has no offense under it. The `code` is the contract's.
 */
export class LegalQualificationNotInCaseError extends NotFoundError {
  constructor() {
    super('LEGAL_QUALIFICATION_NOT_FOUND', 'La causa no registra esa calificación legal.');
  }
}

/**
 * D-113 — a legal qualification of the case was already declared prescribed
 * (422): it cannot be declared again (CA-33.8), and modifying the case cannot
 * remove it or change its offense date (CA-33.18).
 */
export class LegalQualificationAlreadyPrescribedError extends BusinessRuleError {
  static readonly FOR_DECLARING = 'La calificación legal ya fue declarada prescripta.';
  static readonly FOR_MODIFYING = 'No se puede quitar ni modificar una calificación legal declarada prescripta.';

  constructor(message = LegalQualificationAlreadyPrescribedError.FOR_DECLARING) {
    super('LEGAL_QUALIFICATION_ALREADY_PRESCRIBED', message);
  }
}

/**
 * Emitted when someone who is neither an administrator nor a lawyer (the
 * secretariat alone) tries to mark a case as prescribed (HU33, CA-33.2, 403).
 * A lawyer who is not the responsible one gets {@link NotResponsibleLawyerError}
 * instead (D-110).
 */
export class CannotDeclarePrescriptionError extends ForbiddenActionError {
  constructor() {
    super('FORBIDDEN', 'Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.');
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

/** D-113: the `legalQualificationId` of the route is not a positive integer (400). */
export class InvalidLegalQualificationIdError extends ValidationError {
  constructor() {
    super('INVALID_PATH_PARAMETER', 'El identificador de la calificación legal no es válido.', {
      legalQualificationId: 'Debe ser un número entero válido.',
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
