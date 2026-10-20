import { FactoryProvider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthClientService } from '@shared/infrastructure/google/google-oauth-client.service';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../core/domain/ports/document-storage.port';
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
 *
 * `sharedOAuth` is the app's shared Google client, if some other subsystem
 * registered it (`deadlines` does). It arrives as an optional dependency of the
 * provider, so Nest does not call this until that client is fully built; looking
 * it up by hand (`ModuleRef.get`) could return it half-built. When nobody
 * registered it, one is made here from the same variables.
 */
export async function createDocumentStorage(
  config: ConfigService,
  sharedOAuth: GoogleOAuthClientService | undefined,
): Promise<DocumentStoragePort> {
  const missing = GOOGLE_OAUTH_VARS.filter((name) => isMissing(config.get<string>(name)));

  if (missing.length === 0) {
    const { GoogleDriveDocumentStorage } = await import(
      './google-drive/google-drive-document-storage.adapter'
    );
    logger.log('Using Google Drive as the document storage.');
    return new GoogleDriveDocumentStorage(sharedOAuth ?? new GoogleOAuthClientService(config), config);
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

/** How `DocumentsModule` registers `DOCUMENT_STORAGE`. Exported so a spec can build the very same provider. */
export const DOCUMENT_STORAGE_PROVIDER: FactoryProvider = {
  provide: DOCUMENT_STORAGE,
  useFactory: createDocumentStorage,
  inject: [ConfigService, { token: GoogleOAuthClientService, optional: true }],
};
