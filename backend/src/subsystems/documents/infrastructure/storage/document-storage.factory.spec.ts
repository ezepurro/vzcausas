import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { GoogleOAuthClientService } from '@shared/infrastructure/google/google-oauth-client.service';
import { createDocumentStorage } from './document-storage.factory';
import { GoogleDriveDocumentStorage } from './google-drive/google-drive-document-storage.adapter';
import { InMemoryDocumentStorage } from './in-memory/in-memory-document-storage';

const GOOGLE = {
  GOOGLE_OAUTH_CLIENT_ID: 'id.apps.googleusercontent.com',
  GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
  GOOGLE_OAUTH_REFRESH_TOKEN: 'refresh',
};

function configOf(values: Record<string, string>): ConfigService {
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      if (!values[key]) throw new Error(`missing ${key}`);
      return values[key];
    },
  } as unknown as ConfigService;
}

function moduleRefWith(oauth?: GoogleOAuthClientService): ModuleRef {
  return {
    get: () => {
      if (!oauth) throw new Error('not found');
      return oauth;
    },
  } as unknown as ModuleRef;
}

describe('createDocumentStorage', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('con las tres variables de Google usa Google Drive', async () => {
    const storage = await createDocumentStorage(
      configOf({ ...GOOGLE, NODE_ENV: 'development' }),
      moduleRefWith(),
    );

    expect(storage).toBeInstanceOf(GoogleDriveDocumentStorage);
  });

  it('reutiliza el cliente de Google compartido si otro subsistema ya lo registró', async () => {
    const shared = { getClient: jest.fn().mockReturnValue({}) } as unknown as GoogleOAuthClientService;

    const storage = await createDocumentStorage(configOf(GOOGLE), moduleRefWith(shared));

    expect(storage).toBeInstanceOf(GoogleDriveDocumentStorage);
    expect(shared.getClient).toHaveBeenCalled();
  });

  it('sin Google y fuera de producción usa el almacenamiento en memoria y avisa', async () => {
    const storage = await createDocumentStorage(configOf({ NODE_ENV: 'development' }), moduleRefWith());

    expect(storage).toBeInstanceOf(InMemoryDocumentStorage);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('EN MEMORIA'));
  });

  it('con alguna variable de Google vacía también usa memoria y nombra la que falta', async () => {
    const storage = await createDocumentStorage(
      configOf({ ...GOOGLE, GOOGLE_OAUTH_REFRESH_TOKEN: '  ', NODE_ENV: 'test' }),
      moduleRefWith(),
    );

    expect(storage).toBeInstanceOf(InMemoryDocumentStorage);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining('GOOGLE_OAUTH_REFRESH_TOKEN'),
    );
  });

  it('sin Google en producción no arranca', async () => {
    await expect(
      createDocumentStorage(configOf({ NODE_ENV: 'production' }), moduleRefWith()),
    ).rejects.toThrow(/producción/);
  });

  it('con Google configurado en producción usa Drive', async () => {
    const storage = await createDocumentStorage(
      configOf({ ...GOOGLE, NODE_ENV: 'production' }),
      moduleRefWith(),
    );

    expect(storage).toBeInstanceOf(GoogleDriveDocumentStorage);
  });

  it('los valores de ejemplo de .env.example (change-me) cuentan como no configurados', async () => {
    const storage = await createDocumentStorage(
      configOf({
        GOOGLE_OAUTH_CLIENT_ID: 'change-me.apps.googleusercontent.com',
        GOOGLE_OAUTH_CLIENT_SECRET: 'change-me',
        GOOGLE_OAUTH_REFRESH_TOKEN: 'change-me',
        NODE_ENV: 'development',
      }),
      moduleRefWith(),
    );

    expect(storage).toBeInstanceOf(InMemoryDocumentStorage);
  });
});
