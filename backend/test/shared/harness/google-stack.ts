import { ConfigService } from '@nestjs/config';
import { GoogleOAuthClientService } from '../../../src/shared/infrastructure/google/google-oauth-client.service';
import { GoogleDriveDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/google-drive/google-drive-document-storage.adapter';
import { FakeGoogle } from '../fakes/fake-google';

export const FAKE_GOOGLE_CREDENTIALS = {
  clientId: 'fake-client-id.apps.googleusercontent.com',
  clientSecret: 'fake-client-secret-DO-NOT-LOG',
  refreshToken: 'fake-refresh-token-DO-NOT-LOG',
} as const;

export interface GoogleStackOptions {
  /** Vida del access token, en segundos (ver `FakeGoogleOptions`). */
  accessTokenLifetimeSeconds?: number;
  /** `DRIVE_REQUEST_TIMEOUT_MS` del adaptador. */
  driveTimeoutMs?: number;
}

/**
 * Arma la pila REAL de Google contra el Google falso:
 *
 *   GoogleDriveDocumentStorage → @googleapis/drive → OAuth2Client → transporte falso
 *
 * Solo la salida a internet es falsa. El cliente OAuth es el
 * `GoogleOAuthClientService` de verdad (con el refresh token cargado como en
 * producción) y el adaptador es el de producción; lo único que cambia es el
 * `transporter` del cliente y que las esperas de los reintentos (1 s y 2 s) no
 * se esperan de verdad: se anotan en `sleeps`.
 */
export function buildGoogleStack(options: GoogleStackOptions = {}) {
  const fake = new FakeGoogle({ ...FAKE_GOOGLE_CREDENTIALS, accessTokenLifetimeSeconds: options.accessTokenLifetimeSeconds });

  const config = new ConfigService({
    GOOGLE_OAUTH_CLIENT_ID: FAKE_GOOGLE_CREDENTIALS.clientId,
    GOOGLE_OAUTH_CLIENT_SECRET: FAKE_GOOGLE_CREDENTIALS.clientSecret,
    GOOGLE_OAUTH_REFRESH_TOKEN: FAKE_GOOGLE_CREDENTIALS.refreshToken,
    ...(options.driveTimeoutMs ? { DRIVE_REQUEST_TIMEOUT_MS: String(options.driveTimeoutMs) } : {}),
  });

  const oauth = new GoogleOAuthClientService(config);
  oauth.getClient().transporter = fake.transporter;

  const sleeps: number[] = [];
  const storage = new GoogleDriveDocumentStorage(oauth, config, undefined, async (ms) => {
    sleeps.push(ms);
  });

  return { fake, oauth, config, storage, sleeps };
}

export type GoogleStack = ReturnType<typeof buildGoogleStack>;
