import { Logger } from '@nestjs/common';
import { DocumentStorageUnavailableError, InvalidCloudFolderError } from '../../domain/errors/documents.errors';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { aCommand, aSetUpStudio } from '../../test-support/document-fixtures';
import { RenameLawyerFolder } from './rename-lawyer-folder.use-case';

/** El estudio con la carpeta de la causa 10 creada: Causas/Ríos, Malena/Penal/{carátula}. */
async function aStudioWithLawyerFolder() {
  const studio = await aSetUpStudio();
  await studio.assureSpace.execute(aCommand());
  const rename = new RenameLawyerFolder(studio.folders, studio.storage);
  const lawyer = (await studio.folders.findByKey(FolderKey.lawyer(3)))!;
  const caseFolder = (await studio.folders.findByKey(FolderKey.forCase(10)))!;
  studio.storage.calls.length = 0;
  studio.folders.saveCount = 0;
  return { ...studio, rename, lawyer, caseFolder };
}

describe('RenameLawyerFolder (HU14)', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('renombra la carpeta del abogado, en la nube y en la base, conservando su id y su padre (CA-14.12)', async () => {
    const { rename, storage, folders, lawyer } = await aStudioWithLawyerFolder();

    const result = await rename.execute({ lawyerId: 3, folderLabel: 'Ríos Castro, Malena' });

    expect(result).toEqual({ outcome: 'RENAMED' });
    expect(storage.relocations).toEqual([{ folderId: lawyer.cloudFolderId, name: 'Ríos Castro, Malena' }]);
    const row = await folders.findByKey(FolderKey.lawyer(3));
    expect(row).toMatchObject({
      cloudFolderId: lawyer.cloudFolderId,
      name: 'Ríos Castro, Malena',
      parentCloudFolderId: lawyer.parentCloudFolderId,
    });
    expect(storage.folders.find((f) => f.id === lawyer.cloudFolderId)?.name).toBe('Ríos Castro, Malena');
  });

  it('las carpetas de sus causas quedan adentro, sin moverse ni renombrarse', async () => {
    const { rename, storage, folders, caseFolder } = await aStudioWithLawyerFolder();

    await rename.execute({ lawyerId: 3, folderLabel: 'Ríos Castro, Malena' });

    expect(storage.relocations).toHaveLength(1);
    const row = await folders.findByKey(FolderKey.forCase(10));
    expect(row).toMatchObject({ name: caseFolder.name, parentCloudFolderId: caseFolder.parentCloudFolderId });
    expect(folders.relocationCount).toBe(1);
  });

  it('usa las reglas de nombre de carpeta', async () => {
    const { rename, folders } = await aStudioWithLawyerFolder();

    await rename.execute({ lawyerId: 3, folderLabel: 'O/Brien: Ríos, Ana' });

    expect((await folders.findByKey(FolderKey.lawyer(3)))?.name).toBe('O Brien Ríos, Ana');
  });

  it('es idempotente: con el mismo nombre no toca la nube ni la base', async () => {
    const { rename, storage, folders } = await aStudioWithLawyerFolder();

    const result = await rename.execute({ lawyerId: 3, folderLabel: 'Ríos, Malena' });

    expect(result).toEqual({ outcome: 'UNCHANGED' });
    expect(storage.relocations).toEqual([]);
    expect(folders.relocationCount).toBe(0);
  });

  it('un abogado sin carpeta (ninguna causa suya la tuvo) no tiene nada que renombrar', async () => {
    const { rename, storage } = await aStudioWithLawyerFolder();

    const result = await rename.execute({ lawyerId: 99, folderLabel: 'Peralta, Ignacio' });

    expect(result).toEqual({ outcome: 'NO_FOLDER' });
    expect(storage.relocations).toEqual([]);
  });

  it('si Drive falla, lo informa y la fila queda con el nombre anterior; un reintento lo completa (CA-14.13)', async () => {
    const { rename, storage, folders } = await aStudioWithLawyerFolder();
    storage.failNextCallTo('relocateFolder', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(rename.execute({ lawyerId: 3, folderLabel: 'Ríos Castro, Malena' })).rejects.toBeInstanceOf(
      DocumentStorageUnavailableError,
    );
    expect((await folders.findByKey(FolderKey.lawyer(3)))?.name).toBe('Ríos, Malena');
    expect(folders.relocationCount).toBe(0);

    await expect(rename.execute({ lawyerId: 3, folderLabel: 'Ríos Castro, Malena' })).resolves.toEqual({
      outcome: 'RENAMED',
    });
    expect((await folders.findByKey(FolderKey.lawyer(3)))?.name).toBe('Ríos Castro, Malena');
  });

  it('si la carpeta fue borrada a mano en Drive, falla con error de configuración y no recrea nada', async () => {
    const { rename, storage, lawyer, folders } = await aStudioWithLawyerFolder();
    await storage.deleteFolder(lawyer.cloudFolderId);
    storage.calls.length = 0;

    await expect(rename.execute({ lawyerId: 3, folderLabel: 'Ríos Castro, Malena' })).rejects.toMatchObject({
      reason: 'CONFIGURATION',
    });

    expect(storage.calls.filter((c) => c.method === 'createFolder')).toEqual([]);
    expect((await folders.findByKey(FolderKey.lawyer(3)))?.name).toBe('Ríos, Malena');
  });

  it('un nombre que queda vacío al limpiarlo se rechaza antes de tocar nada', async () => {
    const { rename, storage } = await aStudioWithLawyerFolder();

    await expect(rename.execute({ lawyerId: 3, folderLabel: '///' })).rejects.toBeInstanceOf(InvalidCloudFolderError);

    expect(storage.relocations).toEqual([]);
  });
});
