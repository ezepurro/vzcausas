import { Logger } from '@nestjs/common';
import { DocumentStorageUnavailableError } from '../../domain/errors/documents.errors';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { aCommand, aSetUpStudio } from '../../test-support/document-fixtures';
import { TrashCaseFolder } from './trash-case-folder.use-case';

/** El estudio con la carpeta de la causa 10 ya creada: Causas/Ríos, Malena/Penal/{carátula}. */
async function aStudioWithCaseFolder() {
  const studio = await aSetUpStudio();
  await studio.assureSpace.execute(aCommand());
  const trash = new TrashCaseFolder(studio.folders, studio.storage);
  const caseFolderId = (await studio.folders.findByKey(FolderKey.forCase(10)))!.cloudFolderId;
  studio.storage.calls.length = 0;
  return { ...studio, trash, caseFolderId };
}

describe('TrashCaseFolder (HU21)', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('manda la carpeta de la causa a la papelera, con lo que tiene adentro, y no toca las del abogado ni el fuero', async () => {
    const { trash, storage, caseFolderId } = await aStudioWithCaseFolder();
    storage.seedFile({ parentId: caseFolderId, name: 'escrito.pdf', mimeType: 'application/pdf', createdAt: new Date() });

    const result = await trash.execute({ caseId: 10 });

    expect(result).toEqual({ outcome: 'TRASHED' });
    expect(storage.trashedFolderIds).toEqual([caseFolderId]);
    expect(storage.folders.filter((f) => f.trashed).map((f) => f.id)).toEqual([caseFolderId]);
    expect(await storage.getFolder(caseFolderId)).toBeNull();
    // No se borra: la carpeta y su contenido siguen en el almacenamiento, en la papelera.
    expect(storage.folders.some((f) => f.id === caseFolderId)).toBe(true);
    expect(storage.files.filter((f) => f.parentId === caseFolderId)).toHaveLength(1);
    expect(storage.deletedFolderIds).toEqual([]);
  });

  it('conserva la fila de la carpeta: sigue siendo la referencia de la causa (RN12)', async () => {
    const { trash, folders, caseFolderId } = await aStudioWithCaseFolder();

    await trash.execute({ caseId: 10 });

    const row = await folders.findByKey(FolderKey.forCase(10));
    expect(row?.cloudFolderId).toBe(caseFolderId);
    expect(folders.relocationCount).toBe(0);
  });

  it('una causa sin carpeta en la nube no tiene nada que mover a la papelera', async () => {
    const { trash, storage } = await aStudioWithCaseFolder();

    const result = await trash.execute({ caseId: 99 });

    expect(result).toEqual({ outcome: 'NO_FOLDER' });
    expect(storage.trashedFolderIds).toEqual([]);
  });

  it('es idempotente: repetirla no falla', async () => {
    const { trash, storage, caseFolderId } = await aStudioWithCaseFolder();
    await trash.execute({ caseId: 10 });

    await expect(trash.execute({ caseId: 10 })).resolves.toEqual({ outcome: 'TRASHED' });

    expect(storage.folders.find((f) => f.id === caseFolderId)?.trashed).toBe(true);
  });

  it('si Drive falla, lo informa y la carpeta queda donde estaba; un reintento la manda a la papelera', async () => {
    const { trash, storage, caseFolderId } = await aStudioWithCaseFolder();
    storage.failNextCallTo('trashFolder', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(trash.execute({ caseId: 10 })).rejects.toBeInstanceOf(DocumentStorageUnavailableError);
    expect(storage.folders.find((f) => f.id === caseFolderId)?.trashed).toBeFalsy();

    await expect(trash.execute({ caseId: 10 })).resolves.toEqual({ outcome: 'TRASHED' });
    expect(storage.folders.find((f) => f.id === caseFolderId)?.trashed).toBe(true);
  });
});
