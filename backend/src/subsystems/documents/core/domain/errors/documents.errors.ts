import {
  ConflictError,
  DomainError,
  ValidationError,
} from '@shared/domain/domain-error';

/**
 * The cloud storage could not be reached, rejected our credentials or
 * timed out (CA-39.5). It is a *complementary* failure (R-03): the caller
 * keeps working and leaves the case folder `PENDING`.
 *
 * Extends {@link DomainError} directly because no existing subtype fits;
 * the HTTP mapping (502) belongs to the controller step.
 */
export class DocumentStorageUnavailableError extends DomainError {
  constructor(reason?: string) {
    super(
      'DOCUMENT_STORAGE_UNAVAILABLE',
      'El almacenamiento documental no está disponible.',
      reason ? { reason } : null,
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
