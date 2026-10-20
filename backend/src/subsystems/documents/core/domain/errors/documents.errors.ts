import {
  BadGatewayError,
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
