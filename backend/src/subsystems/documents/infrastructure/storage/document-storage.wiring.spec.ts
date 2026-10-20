import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { GoogleOAuthClientService } from '@shared/infrastructure/google/google-oauth-client.service';
import { DOCUMENT_STORAGE } from '../../core/domain/ports/document-storage.port';
import { DOCUMENT_STORAGE_PROVIDER } from './document-storage.factory';
import { GoogleDriveDocumentStorage } from './google-drive/google-drive-document-storage.adapter';

const SLOW_DEPENDENCY = Symbol('SLOW_DEPENDENCY');

const GOOGLE_ENV = {
  GOOGLE_OAUTH_CLIENT_ID: 'id.apps.googleusercontent.com',
  GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
  GOOGLE_OAUTH_REFRESH_TOKEN: 'refresh',
  NODE_ENV: 'test',
};

/**
 * A shared Google client that takes a while to be built (its dependency is
 * asynchronous) and that, like the real one, is useless until its constructor
 * has run: asking it for the client before that throws.
 */
@Injectable()
class SlowGoogleOAuthClient extends GoogleOAuthClientService {
  private readonly built: boolean;

  constructor(config: ConfigService, @Inject(SLOW_DEPENDENCY) _ready: true) {
    super(config);
    this.built = true;
  }

  override getClient() {
    if (!this.built) {
      throw new Error('GoogleOAuthClientService was used before its constructor ran');
    }
    return super.getClient();
  }
}

describe('wiring de DOCUMENT_STORAGE con el cliente OAuth compartido', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  const configModule = () =>
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => GOOGLE_ENV] });

  it('espera a que el cliente compartido esté construido, aunque tarde más que el resto', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [configModule()],
      providers: [
        {
          provide: SLOW_DEPENDENCY,
          useFactory: () => new Promise<true>((resolve) => setTimeout(() => resolve(true), 60)),
        },
        { provide: GoogleOAuthClientService, useClass: SlowGoogleOAuthClient },
        DOCUMENT_STORAGE_PROVIDER,
      ],
    }).compile();

    expect(moduleRef.get(DOCUMENT_STORAGE)).toBeInstanceOf(GoogleDriveDocumentStorage);
  });

  it('si nadie registró el cliente compartido, arma uno propio con las mismas variables', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [configModule()],
      providers: [DOCUMENT_STORAGE_PROVIDER],
    }).compile();

    expect(moduleRef.get(DOCUMENT_STORAGE)).toBeInstanceOf(GoogleDriveDocumentStorage);
  });
});
