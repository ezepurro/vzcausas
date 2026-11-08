import { Logger } from '@nestjs/common';
import { DocumentStorageUnavailableError } from '../../domain/errors/documents.errors';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { aCommand, aSetUpStudio } from '../../test-support/document-fixtures';
import { RecycleCaseFolder } from './recycle-case-folder.use-case';

/** El estudio con las carpetas de las causas 10 y 11 creadas: Causas/Ríos, Malena/Penal/{carátula}. */
async function aStudioWithCaseFolders() {
  const studio = await aSetUpStudio();
  await studio.assureSpace.execute(aCommand());
  await studio.assureSpace.execute(aCommand({ caseId: 11, caseCaption: 'RUIZ s/ amparo' }));
  const recycle = new RecycleCaseFolder(studio.folders, studio.storage);
  const caseFolder = async (caseId: number) => (await studio.folders.findByKey(FolderKey.forCase(caseId)))!;
  const mainId = (await studio.folders.findByKey(FolderKey.main()))!.cloudFolderId;
  const first = await caseFolder(10);
  studio.storage.calls.length = 0;
  return { ...studio, recycle, caseFolder, mainId, first };
}

const papeleras = (storage: { folders: readonly { id: string; name: string; parentId: string | null }[] }, mainId: string) =>
  storage.folders.filter((f) => f.name === 'Papelera' && f.parentId === mainId);

describe('RecycleCaseFolder (HU21)', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('la primera baja crea la carpeta Papelera en la raíz del estudio y mueve ahí la carpeta de la causa, con su contenido', async () => {
    const { recycle, storage, mainId, first } = await aStudioWithCaseFolders();
    storage.seedFile({ parentId: first.cloudFolderId, name: 'escrito.pdf', mimeType: 'application/pdf', createdAt: new Date() });

    const result = await recycle.execute({ caseId: 10 });

    expect(result).toEqual({ outcome: 'MOVED' });
    const [bin] = papeleras(storage, mainId);
    expect(storage.calls.filter((c) => c.method === 'createFolder').map((c) => c.reference)).toEqual([
      { parentId: mainId, name: 'Papelera' },
    ]);
    expect(storage.relocations).toEqual([{ folderId: first.cloudFolderId, newParentId: bin.id }]);
    expect(storage.folders.find((f) => f.id === first.cloudFolderId)).toMatchObject({
      parentId: bin.id,
      name: first.name,
    });
    expect(storage.files.filter((f) => f.parentId === first.cloudFolderId)).toHaveLength(1);
    expect(storage.deletedFolderIds).toEqual([]);
  });

  it('las bajas siguientes reutilizan la Papelera: no crean otra', async () => {
    const { recycle, storage, mainId } = await aStudioWithCaseFolders();
    await recycle.execute({ caseId: 10 });
    storage.calls.length = 0;

    await recycle.execute({ caseId: 11 });

    expect(storage.calls.filter((c) => c.method === 'createFolder')).toEqual([]);
    expect(papeleras(storage, mainId)).toHaveLength(1);
    const [bin] = papeleras(storage, mainId);
    expect(storage.folders.filter((f) => f.parentId === bin.id)).toHaveLength(2);
  });

  it('dos bajas a la vez crean una sola Papelera', async () => {
    const { recycle, storage, mainId } = await aStudioWithCaseFolders();

    await Promise.all([recycle.execute({ caseId: 10 }), recycle.execute({ caseId: 11 })]);

    expect(papeleras(storage, mainId)).toHaveLength(1);
  });

  it('no toca las carpetas del abogado ni del fuero, ni la fila de la carpeta de la causa (RN12)', async () => {
    const { recycle, folders, caseFolder, first } = await aStudioWithCaseFolders();
    const before = { name: first.name, parent: first.parentCloudFolderId };

    await recycle.execute({ caseId: 10 });

    const row = await caseFolder(10);
    expect(row).toMatchObject({ cloudFolderId: first.cloudFolderId, name: before.name, parentCloudFolderId: before.parent });
    expect(folders.relocationCount).toBe(0);
    expect(await folders.findByKey(FolderKey.lawyer(3))).not.toBeNull();
    expect(await folders.findByKey(FolderKey.jurisdiction(3, 1))).not.toBeNull();
  });

  it('una causa sin carpeta en la nube no tiene nada que mover, y no crea la Papelera', async () => {
    const { recycle, storage } = await aStudioWithCaseFolders();

    const result = await recycle.execute({ caseId: 99 });

    expect(result).toEqual({ outcome: 'NO_FOLDER' });
    expect(storage.calls).toEqual([]);
    expect(storage.relocations).toEqual([]);
  });

  it('es idempotente en la nube: repetirla deja la carpeta en la Papelera', async () => {
    const { recycle, storage, mainId, first } = await aStudioWithCaseFolders();
    await recycle.execute({ caseId: 10 });

    await expect(recycle.execute({ caseId: 10 })).resolves.toEqual({ outcome: 'MOVED' });

    const [bin] = papeleras(storage, mainId);
    expect(papeleras(storage, mainId)).toHaveLength(1);
    expect(storage.folders.find((f) => f.id === first.cloudFolderId)?.parentId).toBe(bin.id);
  });

  it('si Drive falla al mover, lo informa y la carpeta queda donde estaba; un reintento la mueve', async () => {
    const { recycle, storage, first } = await aStudioWithCaseFolders();
    storage.failNextCallTo('relocateFolder', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(recycle.execute({ caseId: 10 })).rejects.toBeInstanceOf(DocumentStorageUnavailableError);
    expect(storage.folders.find((f) => f.id === first.cloudFolderId)?.parentId).toBe(first.parentCloudFolderId);

    await expect(recycle.execute({ caseId: 10 })).resolves.toEqual({ outcome: 'MOVED' });
    expect(storage.folders.find((f) => f.id === first.cloudFolderId)?.parentId).not.toBe(first.parentCloudFolderId);
  });

  it('si la carpeta fue borrada a mano en Drive, falla con error de configuración', async () => {
    const { recycle, storage, first } = await aStudioWithCaseFolders();
    await storage.deleteFolder(first.cloudFolderId);

    await expect(recycle.execute({ caseId: 10 })).rejects.toMatchObject({ reason: 'CONFIGURATION' });
  });

  it('sin la carpeta raíz del estudio registrada, falla sin crear nada', async () => {
    const { recycle, storage, folders } = await aStudioWithCaseFolders();
    const bare = new RecycleCaseFolder(
      Object.assign(Object.create(folders), { findByKey: async (key: { kind: string }) => (key.kind === 'MAIN' ? null : folders.findByKey(key as never)) }),
      storage,
    );

    await expect(bare.execute({ caseId: 10 })).rejects.toMatchObject({ code: 'STUDIO_ROOT_NOT_CONFIGURED' });

    expect(storage.calls.filter((c) => c.method === 'createFolder')).toEqual([]);
  });
});
