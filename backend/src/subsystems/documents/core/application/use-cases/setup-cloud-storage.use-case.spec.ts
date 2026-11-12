import { Logger } from '@nestjs/common';
import {
  DocumentStorageUnavailableError,
  StorageStructureBrokenError,
} from '../../domain/errors/documents.errors';
import { CloudFolderFactory } from '../../domain/factories/cloud-folder.factory';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { InMemoryCloudFolderRepository } from '../../../infrastructure/persistence/in-memory/in-memory-cloud-folder.repository';
import { InMemoryDocumentStorage } from '../../../infrastructure/storage/in-memory/in-memory-document-storage';
import { FakeClock, NOW } from '../../test-support/document-fixtures';
import { FakeDocumentTemplateRepository } from '../../test-support/fake-document-template.repository';
import { SetupCloudStorage } from './setup-cloud-storage.use-case';

/** The fake gives each jurisdiction the position of the contract's enum as id: CRIMINAL 1, ADMINISTRATIVE 2, AMPARO 3. */
const JURISDICTIONS = [
  { id: 1, name: 'Penal' },
  { id: 2, name: 'Administrativo' },
  { id: 3, name: 'Amparo' },
];

function build() {
  const folders = new InMemoryCloudFolderRepository();
  const storage = new InMemoryDocumentStorage();
  const templates = new FakeDocumentTemplateRepository();
  return { folders, storage, templates, setup: new SetupCloudStorage(folders, storage, new FakeClock(), templates) };
}

describe('SetupCloudStorage', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  // S1
  it('crea MAIN, TEMPLATES y ROOT_CASES y una subcarpeta por fuero debajo de TEMPLATES, y guarda todas las filas', async () => {
    const { setup, storage, folders } = build();

    const report = await setup.execute();

    expect(report.map((item) => [item.kind, item.name, item.outcome])).toEqual([
      ['MAIN', 'VZ Causas', 'CREATED'],
      ['TEMPLATES', 'Modelos formales', 'CREATED'],
      ['ROOT_CASES', 'Causas', 'CREATED'],
      ['JURISDICTION', 'Penal', 'CREATED'],
      ['JURISDICTION', 'Administrativo', 'CREATED'],
      ['JURISDICTION', 'Amparo', 'CREATED'],
    ]);
    const main = storage.folders.find((f) => f.name === 'VZ Causas')!;
    expect(main.parentId).toBeNull();
    expect(storage.folders.filter((f) => f.parentId === main.id).map((f) => f.name)).toEqual([
      'Modelos formales',
      'Causas',
    ]);
    expect(await folders.findByKey(FolderKey.main())).not.toBeNull();
    const templatesRow = (await folders.findByKey(FolderKey.templates()))!;
    expect(templatesRow.parentCloudFolderId).toBe(main.id);
    expect((await folders.findByKey(FolderKey.rootCases()))!.parentCloudFolderId).toBe(main.id);

    expect(storage.folders.filter((f) => f.parentId === templatesRow.cloudFolderId).map((f) => f.name)).toEqual(
      JURISDICTIONS.map((j) => j.name),
    );
    for (const { id, name } of JURISDICTIONS) {
      const row = (await folders.findByKey(FolderKey.jurisdiction(null, id)))!;
      expect(row).toMatchObject({ name, parentCloudFolderId: templatesRow.cloudFolderId, lawyerId: null, jurisdictionId: id });
    }
  });

  // S2
  it('es idempotente: la segunda ejecución no crea nada y devuelve las mismas carpetas', async () => {
    const { setup, storage } = build();
    const first = await setup.execute();
    const inStorage = storage.folders.length;
    storage.calls.length = 0;

    const second = await setup.execute();

    expect(second.map((item) => item.outcome)).toEqual(Array(6).fill('EXISTING'));
    expect(second.map((item) => item.cloudFolderId)).toEqual(first.map((item) => item.cloudFolderId));
    expect(storage.folders).toHaveLength(inStorage);
    expect(storage.calls.filter((c) => c.method === 'createFolder')).toHaveLength(0);
  });

  // S3: un estudio que ya tenía las tres carpetas base obtiene solo las subcarpetas.
  it('si ya estaban las tres carpetas base, crea solo las subcarpetas de los fueros', async () => {
    const { setup, storage, folders } = build();
    const main = storage.seed(null, 'VZ Causas');
    const templates = storage.seed(main.id, 'Modelos formales');
    const rootCases = storage.seed(main.id, 'Causas');
    const base = { createdAt: NOW };
    await folders.save(CloudFolderFactory.create({ ...base, kind: 'MAIN', cloudFolderId: main.id, name: 'VZ Causas', url: main.url, parentCloudFolderId: null }));
    await folders.save(CloudFolderFactory.create({ ...base, kind: 'TEMPLATES', cloudFolderId: templates.id, name: 'Modelos formales', url: templates.url, parentCloudFolderId: main.id }));
    await folders.save(CloudFolderFactory.create({ ...base, kind: 'ROOT_CASES', cloudFolderId: rootCases.id, name: 'Causas', url: rootCases.url, parentCloudFolderId: main.id }));
    storage.calls.length = 0;

    const report = await setup.execute();

    expect(report.map((item) => item.outcome)).toEqual([
      'EXISTING',
      'EXISTING',
      'EXISTING',
      'CREATED',
      'CREATED',
      'CREATED',
    ]);
    expect(storage.calls.filter((c) => c.method === 'createFolder').map((c) => c.reference.name)).toEqual([
      'Penal',
      'Administrativo',
      'Amparo',
    ]);
  });

  it('adopta una carpeta que ya está en la nube pero no tiene fila, sin duplicarla', async () => {
    const { setup, storage, folders } = build();
    const main = storage.seed(null, 'VZ Causas');

    const report = await setup.execute();

    expect(report[0]).toMatchObject({ kind: 'MAIN', outcome: 'ADOPTED', cloudFolderId: main.id });
    expect(storage.folders.filter((f) => f.name === 'VZ Causas')).toHaveLength(1);
    expect((await folders.findByKey(FolderKey.main()))!.cloudFolderId).toBe(main.id);
  });

  // S5
  it('adopta una subcarpeta de fuero que ya está en la nube sin fila, sin crear otra', async () => {
    const { setup, storage, folders } = build();
    const main = storage.seed(null, 'VZ Causas');
    const templates = storage.seed(main.id, 'Modelos formales');
    const penal = storage.seed(templates.id, 'Penal');

    const report = await setup.execute();

    expect(report.filter((item) => item.kind === 'JURISDICTION').map((item) => [item.name, item.outcome])).toEqual([
      ['Penal', 'ADOPTED'],
      ['Administrativo', 'CREATED'],
      ['Amparo', 'CREATED'],
    ]);
    expect(storage.folders.filter((f) => f.name === 'Penal')).toHaveLength(1);
    expect((await folders.findByKey(FolderKey.jurisdiction(null, 1)))!.cloudFolderId).toBe(penal.id);
  });

  it('si una ejecución anterior se cortó después de MAIN, crea solo lo que falta', async () => {
    const { setup, storage } = build();
    await storage.createFolder({ parentId: null, name: 'VZ Causas' });

    const report = await setup.execute();

    expect(report.map((item) => item.outcome)).toEqual(['ADOPTED', 'CREATED', 'CREATED', 'CREATED', 'CREATED', 'CREATED']);
    expect(storage.folders).toHaveLength(6);
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

  // S4
  it('falla con el nombre de la subcarpeta si una guardada ya no existe en la nube, sin recrearla', async () => {
    const { setup, storage } = build();
    await setup.execute();
    const amparo = storage.folders.find((f) => f.name === 'Amparo')!;
    await storage.deleteFolder(amparo.id);
    const before = storage.folders.length;

    await expect(setup.execute()).rejects.toMatchObject({
      constructor: StorageStructureBrokenError,
      message: expect.stringContaining('Amparo'),
    });

    expect(storage.folders).toHaveLength(before);
  });

  // S6
  it('si no se puede guardar la fila de una subcarpeta, borra esa carpeta recién creada y relanza el error', async () => {
    const { setup, storage, folders } = build();
    const save = folders.save.bind(folders);
    folders.save = async (folder) => {
      if (folder.key.kind === 'JURISDICTION') {
        throw new Error('db down');
      }
      return save(folder);
    };

    await expect(setup.execute()).rejects.toThrow('db down');

    expect(storage.deletedFolderIds).toHaveLength(1);
    expect(storage.folders.map((f) => f.name)).toEqual(['VZ Causas', 'Modelos formales', 'Causas']);
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

  it('si un fuero no está en la base, falla con un error de configuración y no crea las subcarpetas', async () => {
    const { setup, storage, templates } = build();
    templates.findJurisdictionIds = async () => new Map();

    const error = await setup.execute().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(DocumentStorageUnavailableError);
    expect(error).toMatchObject({ reason: 'CONFIGURATION', detail: expect.stringContaining('CRIMINAL') });
    expect(storage.folders.map((f) => f.name)).toEqual(['VZ Causas', 'Modelos formales', 'Causas']);
  });

  it('dos ejecuciones simultáneas crean cada carpeta una sola vez', async () => {
    const { setup, storage } = build();

    const [first, second] = await Promise.all([setup.execute(), setup.execute()]);

    expect(storage.folders).toHaveLength(6);
    expect(storage.deletedFolderIds).toHaveLength(0);
    expect(first.map((item) => item.outcome)).toEqual(Array(6).fill('CREATED'));
    expect(second.map((item) => item.outcome)).toEqual(Array(6).fill('EXISTING'));
  });

  it('avisa con un WARN cuando crea la raíz, porque una carpeta manual no es visible con drive.file', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const { setup } = build();

    await setup.execute();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('drive.file');
  });

  it('no avisa cuando adopta la raíz ni cuando ya estaba guardada', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const { setup, storage } = build();
    storage.seed(null, 'VZ Causas');

    await setup.execute();
    await setup.execute();

    expect(warn).not.toHaveBeenCalled();
  });

  it('propaga la falla del almacenamiento', async () => {
    const { setup, storage } = build();
    storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(setup.execute()).rejects.toBeInstanceOf(DocumentStorageUnavailableError);
  });
});
