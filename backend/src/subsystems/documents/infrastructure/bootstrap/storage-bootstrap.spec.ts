import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SetupCloudStorage } from '../../core/application/use-cases/setup-cloud-storage.use-case';
import { DocumentStoragePort } from '../../core/domain/ports/document-storage.port';
import { InMemoryDocumentStorage } from '../storage/in-memory/in-memory-document-storage';
import { StorageBootstrap } from './storage-bootstrap';

const googleStorage = {} as DocumentStoragePort;

function build(options: { storage?: DocumentStoragePort; autoSetup?: string; execute?: jest.Mock } = {}) {
  const execute = options.execute ?? jest.fn().mockResolvedValue([]);
  const config = { get: (name: string) => (name === 'DOCUMENTS_AUTO_SETUP' ? options.autoSetup : undefined) };
  const bootstrap = new StorageBootstrap(
    { execute } as unknown as SetupCloudStorage,
    options.storage ?? googleStorage,
    config as unknown as ConfigService,
  );
  return { bootstrap, execute };
}

describe('StorageBootstrap', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('arma la estructura base al arrancar con Google Drive', async () => {
    const { bootstrap, execute } = build();

    await bootstrap.onApplicationBootstrap();

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('no hace nada con el almacenamiento en memoria', async () => {
    const { bootstrap, execute } = build({ storage: new InMemoryDocumentStorage() });

    await bootstrap.onApplicationBootstrap();

    expect(execute).not.toHaveBeenCalled();
  });

  it('no hace nada con DOCUMENTS_AUTO_SETUP=false', async () => {
    const { bootstrap, execute } = build({ autoSetup: 'false' });

    await bootstrap.onApplicationBootstrap();

    expect(execute).not.toHaveBeenCalled();
  });

  it('si el setup falla, registra el error y no tira: el servidor arranca igual', async () => {
    const { bootstrap } = build({ execute: jest.fn().mockRejectedValue(new Error('invalid_grant')) });

    await expect(bootstrap.onApplicationBootstrap()).resolves.toBeUndefined();

    expect(Logger.prototype.error).toHaveBeenCalled();
  });
});
