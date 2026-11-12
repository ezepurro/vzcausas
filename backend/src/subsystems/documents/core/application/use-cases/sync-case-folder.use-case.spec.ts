import { Logger } from '@nestjs/common';
import { CaseFolder } from '../../domain/entities/case-folder.entity';
import { DocumentStorageUnavailableError, InvalidCloudFolderError } from '../../domain/errors/documents.errors';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { FakeClock, aCommand, aSetUpStudio } from '../../test-support/document-fixtures';
import { FolderChain } from '../common/folder-chain';
import { SyncCaseFolderCommand } from '../common/sync-case-folder.interfaces';
import { SyncCaseFolder } from './sync-case-folder.use-case';

const CAPTION = 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado';

/** El estudio con la carpeta de la causa 10 ya creada: Causas/Ríos, Malena/Penal/{carátula}. */
async function aStudioWithCaseFolder() {
  const studio = await aSetUpStudio();
  await studio.assureSpace.execute(aCommand());
  const sync = new SyncCaseFolder(
    studio.folders,
    studio.storage,
    new FolderChain(studio.folders, studio.storage, new FakeClock()),
  );
  const caseFolder = async () => (await studio.folders.findByKey(FolderKey.forCase(10))) as CaseFolder;
  const before = await caseFolder();
  studio.storage.calls.length = 0;
  studio.folders.saveCount = 0;
  return { ...studio, sync, caseFolder, originalId: before.cloudFolderId, originalParent: before.parentCloudFolderId };
}

function aSync(overrides: Partial<SyncCaseFolderCommand> = {}): SyncCaseFolderCommand {
  return {
    caseId: 10,
    caseCaption: CAPTION,
    lawyer: { id: 3, folderLabel: 'Ríos, Malena' },
    jurisdiction: { id: 1, folderLabel: 'Penal' },
    ...overrides,
  };
}

describe('SyncCaseFolder', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('cambia la carátula: renombra la carpeta con las reglas de nombre y no crea ni mueve nada (CA-19.9)', async () => {
    const { sync, storage, folders, caseFolder, originalId, originalParent } = await aStudioWithCaseFolder();

    const result = await sync.execute(aSync({ caseCaption: 'PÉREZ c/ LÓPEZ: daños' }));

    expect(result).toEqual({ outcome: 'RELOCATED' });
    expect(storage.relocations).toEqual([{ folderId: originalId, name: 'PÉREZ c LÓPEZ daños', newParentId: undefined }]);
    expect(storage.calls.filter((c) => c.method === 'createFolder')).toEqual([]);
    const row = await caseFolder();
    expect(row).toMatchObject({ cloudFolderId: originalId, name: 'PÉREZ c LÓPEZ daños', parentCloudFolderId: originalParent });
    expect(row.lawyerId).toBe(3);
    expect(folders.relocationCount).toBe(1);
  });

  it('cambia el responsable: crea las carpetas del abogado nuevo y mueve la de la causa, con su contenido (CA-19.9)', async () => {
    const { sync, storage, caseFolder, originalId, folders } = await aStudioWithCaseFolder();
    storage.seedFile({ parentId: originalId, name: 'escrito.pdf', mimeType: 'application/pdf', createdAt: new Date() });

    const result = await sync.execute(aSync({ lawyer: { id: 5, folderLabel: 'Peralta, Ignacio' } }));

    expect(result).toEqual({ outcome: 'RELOCATED' });
    expect(storage.calls.filter((c) => c.method === 'createFolder').map((c) => c.reference.name)).toEqual([
      'Peralta, Ignacio',
      'Penal',
    ]);
    const newJurisdiction = (await folders.findByKey(FolderKey.jurisdiction(5, 1)))!;
    const row = await caseFolder();
    expect(row.cloudFolderId).toBe(originalId);
    expect(row.parentCloudFolderId).toBe(newJurisdiction.cloudFolderId);
    expect(row.lawyerId).toBe(5);
    expect(row.name).toBe(CAPTION);
    expect(storage.folders.find((f) => f.id === originalId)!.parentId).toBe(newJurisdiction.cloudFolderId);
    expect(storage.files.filter((f) => f.parentId === originalId)).toHaveLength(1);
    // La carpeta del abogado anterior queda donde estaba.
    expect(await folders.findByKey(FolderKey.lawyer(3))).not.toBeNull();
  });

  it('cambia las dos cosas: una sola llamada a la nube y una sola actualización de la fila', async () => {
    const { sync, storage, folders, caseFolder } = await aStudioWithCaseFolder();

    await sync.execute(aSync({ caseCaption: 'RUIZ s/ amparo', lawyer: { id: 5, folderLabel: 'Peralta, Ignacio' } }));

    expect(storage.relocations).toHaveLength(1);
    expect(storage.relocations[0]).toMatchObject({ name: 'RUIZ s amparo' });
    expect(storage.relocations[0].newParentId).toBeDefined();
    expect(folders.relocationCount).toBe(1);
    expect((await caseFolder()).name).toBe('RUIZ s amparo');
  });

  it('reutiliza las carpetas del abogado nuevo si ya existen, sin duplicarlas', async () => {
    const { sync, storage, assureSpace } = await aStudioWithCaseFolder();
    await assureSpace.execute(
      aCommand({ caseId: 11, caseCaption: 'OTRA', lawyer: { id: 5, folderLabel: 'Peralta, Ignacio' } }),
    );
    storage.calls.length = 0;

    await sync.execute(aSync({ lawyer: { id: 5, folderLabel: 'Peralta, Ignacio' } }));

    expect(storage.calls.filter((c) => c.method === 'createFolder')).toEqual([]);
    expect(storage.folders.filter((f) => f.name === 'Peralta, Ignacio')).toHaveLength(1);
  });

  it('es idempotente: repetir lo ya hecho, o enviar lo que ya tiene, no toca la nube ni la fila', async () => {
    const { sync, storage, folders } = await aStudioWithCaseFolder();
    const desired = aSync({ caseCaption: 'RUIZ s/ amparo', lawyer: { id: 5, folderLabel: 'Peralta, Ignacio' } });
    await sync.execute(desired);
    storage.relocations.length = 0;
    storage.calls.length = 0;
    const updates = folders.relocationCount;

    const again = await sync.execute(desired);

    expect(again).toEqual({ outcome: 'UNCHANGED' });
    expect(storage.relocations).toEqual([]);
    expect(storage.calls).toEqual([]);
    expect(folders.relocationCount).toBe(updates);
  });

  it('una causa sin carpeta en la nube no tiene nada que mover (CA-19.9)', async () => {
    const { sync, storage } = await aStudioWithCaseFolder();

    const result = await sync.execute(aSync({ caseId: 99, caseCaption: 'Otra' }));

    expect(result).toEqual({ outcome: 'NO_FOLDER' });
    expect(storage.relocations).toEqual([]);
    expect(storage.calls).toEqual([]);
  });

  it('si Drive falla, lo informa y la fila queda como estaba: dice dónde está realmente (CA-19.10)', async () => {
    const { sync, storage, caseFolder, originalParent, folders } = await aStudioWithCaseFolder();
    storage.failNextCallTo('relocateFolder', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(
      sync.execute(aSync({ caseCaption: 'RUIZ s/ amparo', lawyer: { id: 5, folderLabel: 'Peralta, Ignacio' } })),
    ).rejects.toBeInstanceOf(DocumentStorageUnavailableError);

    const row = await caseFolder();
    expect(row).toMatchObject({ name: CAPTION, parentCloudFolderId: originalParent });
    expect(row.lawyerId).toBe(3);
    expect(folders.relocationCount).toBe(0);
  });

  it('un reintento después de la falla completa el cambio', async () => {
    const { sync, storage, caseFolder } = await aStudioWithCaseFolder();
    const desired = aSync({ caseCaption: 'RUIZ s/ amparo' });
    storage.failNextCallTo('relocateFolder', new DocumentStorageUnavailableError('TRANSIENT'));
    await expect(sync.execute(desired)).rejects.toThrow();

    await expect(sync.execute(desired)).resolves.toEqual({ outcome: 'RELOCATED' });

    expect((await caseFolder()).name).toBe('RUIZ s amparo');
  });

  it('si la carpeta fue borrada a mano en Drive, falla con error de configuración y no recrea nada (ADR-003 §2.5)', async () => {
    const { sync, storage, originalId, caseFolder } = await aStudioWithCaseFolder();
    await storage.deleteFolder(originalId);
    storage.calls.length = 0;

    await expect(sync.execute(aSync({ caseCaption: 'RUIZ s/ amparo' }))).rejects.toMatchObject({
      reason: 'CONFIGURATION',
    });

    expect(storage.calls.filter((c) => c.method === 'createFolder')).toEqual([]);
    expect((await caseFolder()).name).toBe(CAPTION);
  });

  it('una carátula que queda vacía al limpiarla se rechaza antes de tocar nada', async () => {
    const { sync, storage } = await aStudioWithCaseFolder();

    await expect(sync.execute(aSync({ caseCaption: '///' }))).rejects.toBeInstanceOf(InvalidCloudFolderError);

    expect(storage.relocations).toEqual([]);
  });
});
