import {
  BadGatewayError,
  ConflictError,
  DomainError,
  ValidationError,
} from '@shared/domain/domain-error';

/** Why the storage could not be used: a passing problem, or credentials the provider refuses. */
export type StorageFailureReason = 'TRANSIENT' | 'AUTHORIZATION';

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
