import { Logger } from '@nestjs/common';
import {
  DocumentStorageUnavailableError,
  StorageStructureBrokenError,
} from '../../domain/errors/documents.errors';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { InMemoryCloudFolderRepository } from '../../../infrastructure/persistence/in-memory/in-memory-cloud-folder.repository';
import { InMemoryDocumentStorage } from '../../../infrastructure/storage/in-memory/in-memory-document-storage';
import { FakeClock } from '../../test-support/document-fixtures';
import { SetupCloudStorage } from './setup-cloud-storage.use-case';

function build() {
  const folders = new InMemoryCloudFolderRepository();
  const storage = new InMemoryDocumentStorage();
  return { folders, storage, setup: new SetupCloudStorage(folders, storage, new FakeClock()) };
}

describe('SetupCloudStorage', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('crea MAIN en la raíz de la cuenta y TEMPLATES y ROOT_CASES debajo, y guarda las tres filas', async () => {
    const { setup, storage, folders } = build();

    const report = await setup.execute();

    expect(report.map((item) => [item.kind, item.name, item.outcome])).toEqual([
      ['MAIN', 'VZ Causas', 'CREATED'],
      ['TEMPLATES', 'Modelos formales', 'CREATED'],
      ['ROOT_CASES', 'Causas', 'CREATED'],
    ]);
    const main = storage.folders.find((f) => f.name === 'VZ Causas')!;
    expect(main.parentId).toBeNull();
    expect(storage.folders.filter((f) => f.parentId === main.id).map((f) => f.name)).toEqual([
      'Modelos formales',
      'Causas',
    ]);
    expect(await folders.findByKey(FolderKey.main())).not.toBeNull();
    expect((await folders.findByKey(FolderKey.templates()))!.parentCloudFolderId).toBe(main.id);
    expect((await folders.findByKey(FolderKey.rootCases()))!.parentCloudFolderId).toBe(main.id);
  });

  it('es idempotente: la segunda ejecución no crea nada y devuelve las mismas carpetas', async () => {
    const { setup, storage } = build();
    const first = await setup.execute();
    const inStorage = storage.folders.length;
    storage.calls.length = 0;

    const second = await setup.execute();

    expect(second.map((item) => item.outcome)).toEqual(['EXISTING', 'EXISTING', 'EXISTING']);
    expect(second.map((item) => item.cloudFolderId)).toEqual(first.map((item) => item.cloudFolderId));
    expect(storage.folders).toHaveLength(inStorage);
    expect(storage.calls.filter((c) => c.method === 'createFolder')).toHaveLength(0);
  });

  it('adopta una carpeta que ya está en la nube pero no tiene fila, sin duplicarla', async () => {
    const { setup, storage, folders } = build();
    const main = storage.seed(null, 'VZ Causas');

    const report = await setup.execute();

    expect(report[0]).toMatchObject({ kind: 'MAIN', outcome: 'ADOPTED', cloudFolderId: main.id });
    expect(storage.folders.filter((f) => f.name === 'VZ Causas')).toHaveLength(1);
    expect((await folders.findByKey(FolderKey.main()))!.cloudFolderId).toBe(main.id);
  });

  it('si una ejecución anterior se cortó después de MAIN, crea solo lo que falta', async () => {
    const { setup, storage } = build();
    await storage.createFolder({ parentId: null, name: 'VZ Causas' });

    const report = await setup.execute();

    expect(report.map((item) => item.outcome)).toEqual(['ADOPTED', 'CREATED', 'CREATED']);
    expect(storage.folders).toHaveLength(3);
  });

  it('falla si una carpeta guardada ya no existe en la nube, sin recrearla en silencio', async () => {
    const { setup, storage } = build();
    await setup.execute();
    const templates = storage.folders.find((f) => f.name === 'Modelos formales')!;
    await storage.deleteFolder(templates.id);
    const before = storage.folders.length;

    await expect(setup.execute()).rejects.toBeInstanceOf(StorageStructureBrokenError);

    expect(storage.folders).toHaveLength(before);
  });

  it('si no se puede guardar una fila, borra la carpeta recién creada y relanza el error', async () => {
    const { setup, storage, folders } = build();
    folders.save = async () => {
      throw new Error('db down');
    };

    await expect(setup.execute()).rejects.toThrow('db down');

    expect(storage.deletedFolderIds).toHaveLength(1);
    expect(storage.folders).toHaveLength(0);
  });

  it('propaga la falla del almacenamiento', async () => {
    const { setup, storage } = build();
    storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(setup.execute()).rejects.toBeInstanceOf(DocumentStorageUnavailableError);
  });
});
