import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { GoogleOAuthClientService } from '@shared/infrastructure/google/google-oauth-client.service';
import { DocumentStoragePort } from '../../core/domain/ports/document-storage.port';
import { InMemoryDocumentStorage } from './in-memory/in-memory-document-storage';

/** The three variables the shared Google client needs (`GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN`). */
export const GOOGLE_OAUTH_VARS = [
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_OAUTH_REFRESH_TOKEN',
] as const;

const logger = new Logger('DocumentStorage');

/**
 * Chooses the storage behind `DOCUMENT_STORAGE` when the app starts:
 *
 * - **Google configured** (the three `GOOGLE_OAUTH_*` variables): Google Drive.
 * - **Not configured, `NODE_ENV=production`**: the app does not start. A storage
 *   that forgets everything must never run in production.
 * - **Not configured, anywhere else**: the in-memory storage, with a warning, so
 *   anyone without Google credentials can still run the app and its tests.
 *
 * The choice is made here, when the container is built, and not when the module
 * file is loaded: by then `ConfigModule` has already read the `.env` file.
 * `googleapis` is large, so the Drive adapter is only loaded if it is used.
 */
export async function createDocumentStorage(
  config: ConfigService,
  moduleRef: ModuleRef,
): Promise<DocumentStoragePort> {
  const missing = GOOGLE_OAUTH_VARS.filter((name) => isMissing(config.get<string>(name)));

  if (missing.length === 0) {
    const { GoogleDriveDocumentStorage } = await import(
      './google-drive/google-drive-document-storage.adapter'
    );
    logger.log('Using Google Drive as the document storage.');
    return new GoogleDriveDocumentStorage(sharedOAuthClient(config, moduleRef), config);
  }

  if (config.get<string>('NODE_ENV') === 'production') {
    throw new Error(
      `Falta configurar Google Drive (${missing.join(', ')}): en producción no se usa el almacenamiento en memoria.`,
    );
  }

  logger.warn(
    `Faltan ${missing.join(', ')}: se usa un almacenamiento EN MEMORIA, sin Google Drive. ` +
      'Las carpetas y los modelos se pierden al reiniciar. Ver ADR-003.',
  );
  return new InMemoryDocumentStorage();
}

/** Empty, blank or the `change-me` placeholder that `.env.example` ships with. */
function isMissing(value: string | undefined): boolean {
  const trimmed = (value ?? '').trim();
  return trimmed === '' || trimmed.includes('change-me');
}

/**
 * The app has one shared Google client. If another subsystem already registered
 * it, use that one; otherwise build the same class from the same variables.
 */
function sharedOAuthClient(config: ConfigService, moduleRef: ModuleRef): GoogleOAuthClientService {
  try {
    return moduleRef.get(GoogleOAuthClientService, { strict: false });
  } catch {
    return new GoogleOAuthClientService(config);
  }
}
