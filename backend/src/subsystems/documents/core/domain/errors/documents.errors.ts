import {
  BadGatewayError,
  BusinessRuleError,
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from '@shared/domain/domain-error';

/**
 * Why the storage could not be used: a passing problem (`TRANSIENT`), credentials
 * the provider refuses (`AUTHORIZATION`), or something we configured that is no
 * longer there, such as a folder deleted by hand (`CONFIGURATION`).
 */
export type StorageFailureReason = 'TRANSIENT' | 'AUTHORIZATION' | 'CONFIGURATION';

/**
 * The cloud storage could not be reached, rejected our credentials or
 * timed out (CA-39.5). It is a *complementary* failure (R-03): the caller
 * keeps working and leaves the case folder `PENDING`.
 *
 * Over HTTP it is a 502 with the contract's text (HU34, CA-34.7). `reason`
 * and `detail` are for the log and for `DocumentSpaceCreationFailed`; they
 * are not sent to the client, so `details` stays `null`.
 */
export class DocumentStorageUnavailableError extends BadGatewayError {
  constructor(
    public readonly reason: StorageFailureReason = 'TRANSIENT',
    public readonly detail?: string,
  ) {
    super(
      'DOCUMENT_STORAGE_UNAVAILABLE',
      'No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.',
    );
  }
}

/**
 * The storage did not answer while reading the folder of a case (HU38,
 * CA-38.6). Same `code` as {@link DocumentStorageUnavailableError}, with the
 * contract's text for this operation (V5 `:7570`).
 */
export class CaseFolderReadUnavailableError extends BadGatewayError {
  constructor() {
    super(
      'DOCUMENT_STORAGE_UNAVAILABLE',
      'No se pudo leer la carpeta de la causa en Drive. Intentá de nuevo en unos minutos.',
    );
  }
}

/**
 * The storage did not answer while downloading a document of a case (HU38,
 * CA-38.6). The contract words it apart from the read (V5 `:7649`).
 */
export class CaseDocumentDownloadUnavailableError extends BadGatewayError {
  constructor() {
    super(
      'DOCUMENT_STORAGE_UNAVAILABLE',
      'No se pudo descargar el documento de Drive. Intentá de nuevo en unos minutos.',
    );
  }
}

/**
 * The document does not exist, is in the trash or is not in the folder asked
 * for (HU38, CA-38.8): the API never hands out a file of another folder, even
 * if its id is known (V5 `:7629-7631`).
 */
export class DocumentNotFoundError extends NotFoundError {
  constructor() {
    super('DOCUMENT_NOT_FOUND', 'No se encontró el documento en la carpeta de la causa.');
  }
}

/**
 * A document asked for the case file is not in the folder of the case, does
 * not exist, or is a case file generated before (HU25, CA-25.3): a case file
 * never goes into another one (V5 `:7732`).
 */
export class CaseFileDocumentsInvalidError extends ValidationError {
  constructor() {
    super('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
      documentIds: 'Un documento no está en la carpeta de la causa o es un expediente anterior.',
    });
  }
}

/**
 * A document asked for the case file cannot become PDF (HU25, CA-25.4, D-102):
 * only PDF, Word, Google documents and JPG or PNG images can. Also a PDF the
 * storage hands over that cannot be opened.
 */
export class DocumentNotConvertibleError extends BusinessRuleError {
  constructor() {
    super('DOCUMENT_NOT_CONVERTIBLE', 'Uno de los documentos no se puede convertir a PDF.');
  }
}

/**
 * The storage failed while reading a document or saving the case file (HU25,
 * CA-25.8). Nothing is left half done: no file stays in the folder and the
 * version number is not used up. The contract words it apart (V5 `:7898`).
 */
export class CaseFileStorageUnavailableError extends BadGatewayError {
  constructor() {
    super(
      'DOCUMENT_STORAGE_UNAVAILABLE',
      'No se pudo generar el expediente porque Drive no respondió. Intentá de nuevo en unos minutos.',
    );
  }
}

/**
 * Another case file of the same case took that version first (`case_files`
 * is unique by case and version). Internal: the use case retries with the
 * next number, so it is never meant to reach the client.
 */
export class CaseFileVersionTakenError extends DomainError {
  constructor(public readonly version: number) {
    super('CASE_FILE_VERSION_TAKEN', `La versión ${version} del expediente ya fue usada.`);
  }
}

/**
 * The study's folder structure is saved in the database but the folder is no
 * longer in the cloud storage (deleted or trashed by hand). The saved id is
 * useless now, so someone has to decide what to do instead of recreating it
 * silently.
 */
export class StorageStructureBrokenError extends DomainError {
  constructor(public readonly folderName: string) {
    super(
      'STORAGE_STRUCTURE_BROKEN',
      `La carpeta "${folderName}" está registrada pero ya no existe en el almacenamiento en la nube.`,
    );
  }
}

/** The study's root folder for cases (`ROOT_CASES`) has not been configured (CA-39.3). */
export class StudioRootNotConfiguredError extends DomainError {
  constructor() {
    super(
      'STUDIO_ROOT_NOT_CONFIGURED',
      'No está configurada la carpeta raíz de causas del estudio.',
    );
  }
}

/** A folder with the same unique key was already saved (e.g. a concurrent request won). */
export class CloudFolderAlreadyExistsError extends ConflictError {
  constructor() {
    super('CLOUD_FOLDER_ALREADY_EXISTS', 'Ya existe una carpeta con la misma clave.');
  }
}

/** A cloud folder would break the schema's shape invariants, or its name is unusable. */
export class InvalidCloudFolderError extends ValidationError {
  constructor(message: string, details: Record<string, unknown> | null = null) {
    super('INVALID_CLOUD_FOLDER', message, details);
  }
}

/** A template was already copied into the case's folder (CA-40.7): it is never copied twice. */
export class TemplateCopyAlreadyDoneError extends ConflictError {
  constructor() {
    super('TEMPLATE_COPY_ALREADY_DONE', 'El modelo ya fue copiado a la carpeta de la causa.');
  }
}

/** An active formal template already has that name, ignoring case (CA-34.9, D-71). */
export class DocumentTemplateAlreadyExistsError extends ConflictError {
  constructor() {
    super('DOCUMENT_TEMPLATE_ALREADY_EXISTS', 'Ya existe un modelo formal con ese nombre.');
  }
}

/** No active formal template has that id (V4 §3.10). A template given de baja does not exist for the client. */
export class DocumentTemplateNotFoundError extends NotFoundError {
  constructor() {
    super('DOCUMENT_TEMPLATE_NOT_FOUND', 'No se encontró el modelo formal solicitado.');
  }
}

/** `templateId` in the path is not a positive integer. */
export class InvalidTemplateIdError extends ValidationError {
  constructor() {
    super('INVALID_PATH_PARAMETER', 'El identificador del modelo formal no es válido.', {
      templateId: 'Debe ser un número entero válido.',
    });
  }
}

/**
 * The `jurisdiction` filter of `GET /document-templates` names no jurisdiction.
 * The contract answers it with `INVALID_REQUEST`, not with an empty list: an
 * empty list would read as "no templates in that jurisdiction" (CA-35.5).
 */
export class InvalidTemplateJurisdictionFilterError extends ValidationError {
  constructor() {
    super('INVALID_REQUEST', 'Parámetros de query inválidos.', {
      jurisdiction: 'No existe un fuero procesal con ese nombre.',
    });
  }
}
