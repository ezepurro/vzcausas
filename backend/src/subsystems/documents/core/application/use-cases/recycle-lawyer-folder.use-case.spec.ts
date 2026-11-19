import { Logger } from '@nestjs/common';
import { DocumentStorageUnavailableError } from '../../domain/errors/documents.errors';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { aCommand, aSetUpStudio } from '../../test-support/document-fixtures';
import { RecycleBin } from '../common/recycle-bin';
import { RecycleLawyerFolder } from './recycle-lawyer-folder.use-case';

/** El estudio con la carpeta de la causa 10 creada: Causas/Ríos, Malena/Penal/{carátula}. */
async function aStudioWithLawyerFolder() {
  const studio = await aSetUpStudio();
  await studio.assureSpace.execute(aCommand());
  const recycle = new RecycleLawyerFolder(studio.folders, studio.storage, new RecycleBin(studio.folders, studio.storage));
  const lawyerFolder = (await studio.folders.findByKey(FolderKey.lawyer(3)))!;
  const mainId = (await studio.folders.findByKey(FolderKey.main()))!.cloudFolderId;
  studio.storage.calls.length = 0;
  return { ...studio, recycle, lawyerFolder, mainId };
}

describe('RecycleLawyerFolder (HU15, D-132)', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('sin historia, mueve la carpeta del abogado a la Papelera con lo que tenga adentro, sin borrar nada', async () => {
    const { recycle, storage, mainId, lawyerFolder } = await aStudioWithLawyerFolder();
    storage.seedFile({ parentId: lawyerFolder.cloudFolderId, name: 'suelto.pdf', mimeType: 'application/pdf', createdAt: new Date() });

    const result = await recycle.execute({ lawyerId: 3, keepsHistory: false });

    expect(result).toEqual({ outcome: 'MOVED' });
    const bin = storage.folders.find((f) => f.name === 'Papelera' && f.parentId === mainId)!;
    expect(storage.relocations).toEqual([{ folderId: lawyerFolder.cloudFolderId, newParentId: bin.id }]);
    expect(storage.folders.find((f) => f.id === lawyerFolder.cloudFolderId)).toMatchObject({ parentId: bin.id, name: lawyerFolder.name });
    expect(storage.files.filter((f) => f.parentId === lawyerFolder.cloudFolderId)).toHaveLength(1);
    expect(storage.deletedFolderIds).toEqual([]);
  });

  it('con historia (causas terminales) no toca nada: la carpeta queda con ellas adentro, como historial', async () => {
    const { recycle, storage } = await aStudioWithLawyerFolder();

    const result = await recycle.execute({ lawyerId: 3, keepsHistory: true });

    expect(result).toEqual({ outcome: 'KEPT_AS_HISTORY' });
    expect(storage.calls).toEqual([]);
    expect(storage.relocations).toEqual([]);
  });

  it('un abogado sin carpeta no tiene nada que mover', async () => {
    const { recycle, storage } = await aStudioWithLawyerFolder();

    const result = await recycle.execute({ lawyerId: 99, keepsHistory: false });

    expect(result).toEqual({ outcome: 'NO_FOLDER' });
    expect(storage.relocations).toEqual([]);
  });

  it('no toca la fila de la carpeta del abogado ni las de sus fueros: Papelera no tiene fila y quedan como registro', async () => {
    const { recycle, folders, lawyerFolder } = await aStudioWithLawyerFolder();
    const before = { name: lawyerFolder.name, parent: lawyerFolder.parentCloudFolderId };

    await recycle.execute({ lawyerId: 3, keepsHistory: false });

    expect(folders.relocationCount).toBe(0);
    const row = (await folders.findByKey(FolderKey.lawyer(3)))!;
    expect({ name: row.name, parent: row.parentCloudFolderId }).toEqual(before);
    expect(await folders.findByKey(FolderKey.jurisdiction(3, 1))).not.toBeNull();
  });

  it('es idempotente: repetirlo deja la carpeta en la Papelera y no crea otra', async () => {
    const { recycle, storage, mainId } = await aStudioWithLawyerFolder();
    await recycle.execute({ lawyerId: 3, keepsHistory: false });

    await recycle.execute({ lawyerId: 3, keepsHistory: false });

    expect(storage.folders.filter((f) => f.name === 'Papelera' && f.parentId === mainId)).toHaveLength(1);
  });

  it('si Drive falla, lo informa y la carpeta queda donde estaba', async () => {
    const { recycle, storage, lawyerFolder } = await aStudioWithLawyerFolder();
    storage.failNextCallTo('relocateFolder', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(recycle.execute({ lawyerId: 3, keepsHistory: false })).rejects.toBeInstanceOf(DocumentStorageUnavailableError);

    expect(storage.folders.find((f) => f.id === lawyerFolder.cloudFolderId)?.parentId).toBe(lawyerFolder.parentCloudFolderId);
  });
});
