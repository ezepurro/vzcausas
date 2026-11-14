import { Logger } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ForbiddenActionError } from '@shared/domain/domain-error';
import { DocumentStorageUnavailableError, DocumentTemplateNotFoundError } from '../../domain/errors/documents.errors';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { aSetUpStudio } from '../../test-support/document-fixtures';
import { FakeDocumentTemplateRepository } from '../../test-support/fake-document-template.repository';
import { RecycleBin } from '../common/recycle-bin';
import { DeactivateDocumentTemplate } from './deactivate-document-template.use-case';
import { MoveTemplateFilesToTrash } from './move-template-files-to-trash.use-case';

/* HU37 · Dar de baja un modelo formal. */

const actor = (roleNames: string[] = ['LAWYER']): AuthenticatedUser => ({
  userId: 6,
  roleNames,
  lawyerId: roleNames.includes('LAWYER') ? 3 : null,
  permissions: [],
});

/** Un estudio con un modelo de CRIMINAL y AMPARO: un archivo en cada subcarpeta de `Modelos formales`. */
async function aStudioWithATemplate() {
  const studio = await aSetUpStudio();
  const templates = new FakeDocumentTemplateRepository();
  const mainId = (await studio.folders.findByKey(FolderKey.main()))!.cloudFolderId;
  const modelos = studio.storage.seed(mainId, 'Modelos formales');
  const penal = studio.storage.seed(modelos.id, 'Penal');
  const amparo = studio.storage.seed(modelos.id, 'Amparo');
  const fileOf = (parentId: string, id: string) =>
    studio.storage.seedFile({ id, parentId, name: 'apelacion.docx', mimeType: 'application/x', createdAt: new Date() });
  fileOf(penal.id, 'f-penal');
  fileOf(amparo.id, 'f-amparo');
  const template = templates.add({
    id: 5,
    jurisdictions: ['CRIMINAL', 'AMPARO'],
    cloudFileId: 'f-penal',
    cloudFolderId: penal.id,
    placements: [
      { jurisdiction: 'CRIMINAL', cloudFileId: 'f-penal', cloudFolderId: penal.id },
      { jurisdiction: 'AMPARO', cloudFileId: 'f-amparo', cloudFolderId: amparo.id },
    ],
  });
  const bin = new RecycleBin(studio.folders, studio.storage);
  const move = new MoveTemplateFilesToTrash(templates, bin);
  const useCase = new DeactivateDocumentTemplate(templates, move);
  const parentOf = (fileId: string) => studio.storage.files.find((file) => file.id === fileId)?.parentId;
  const papelera = () => studio.storage.folders.find((folder) => folder.name === 'Papelera');
  return { ...studio, templates, template, useCase, parentOf, papelera, penal, amparo };
}

describe('DeactivateDocumentTemplate', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  // CA-37.1, CA-37.4
  it('da de baja el modelo, conserva la fila y manda a la Papelera el archivo de cada fuero', async () => {
    const { useCase, templates, template, parentOf, papelera } = await aStudioWithATemplate();

    await expect(useCase.execute({ actor: actor(), templateId: 5 })).resolves.toBeUndefined();

    expect(templates.rows).toHaveLength(1);
    expect(template).toMatchObject({ active: false, trashPending: false });
    expect(parentOf('f-penal')).toBe(papelera()!.id);
    expect(parentOf('f-amparo')).toBe(papelera()!.id);
  });

  // CA-37.6
  it.each([[['ADMINISTRATOR']], [['LAWYER']], [['SECRETARY', 'LAWYER']]])('un usuario con %j puede', async (roles) => {
    const { useCase } = await aStudioWithATemplate();

    await expect(useCase.execute({ actor: actor(roles), templateId: 5 })).resolves.toBeUndefined();
  });

  // CA-37.6: el 403 va antes que el 404 y no escribe nada
  it('la secretaría recibe 403 aunque el modelo no exista, sin leer ni escribir nada', async () => {
    const { useCase, templates, storage } = await aStudioWithATemplate();
    const deactivate = jest.spyOn(templates, 'deactivate');
    storage.fileCalls.length = 0;

    await expect(useCase.execute({ actor: actor(['SECRETARY']), templateId: 999 })).rejects.toBeInstanceOf(
      ForbiddenActionError,
    );

    expect(deactivate).not.toHaveBeenCalled();
    expect(storage.fileCalls).toEqual([]);
  });

  // CA-37.7
  it('un modelo que no existe da 404 y no toca la nube', async () => {
    const { useCase, storage } = await aStudioWithATemplate();
    storage.fileCalls.length = 0;

    await expect(useCase.execute({ actor: actor(), templateId: 999 })).rejects.toBeInstanceOf(
      DocumentTemplateNotFoundError,
    );

    expect(storage.fileCalls).toEqual([]);
  });

  // CA-37.7
  it('un modelo ya dado de baja da 404: la segunda baja no mueve nada otra vez', async () => {
    const { useCase, storage } = await aStudioWithATemplate();
    await useCase.execute({ actor: actor(), templateId: 5 });
    storage.fileCalls.length = 0;

    await expect(useCase.execute({ actor: actor(), templateId: 5 })).rejects.toBeInstanceOf(
      DocumentTemplateNotFoundError,
    );

    expect(storage.fileCalls).toEqual([]);
  });

  // CA-37.7: dos bajas a la vez
  it('de dos bajas simultáneas gana una sola: la otra da 404', async () => {
    const { useCase } = await aStudioWithATemplate();

    const results = await Promise.allSettled([
      useCase.execute({ actor: actor(), templateId: 5 }),
      useCase.execute({ actor: actor(), templateId: 5 }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: expect.any(DocumentTemplateNotFoundError),
    });
  });

  // CA-37.4: Drive no hace fallar la baja (D-131)
  it('si Drive no responde la baja vale: el modelo queda dado de baja y marcado para el proceso diario', async () => {
    const { useCase, template, storage, parentOf, penal, papelera } = await aStudioWithATemplate();
    storage.failNextCallTo('moveFile', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(useCase.execute({ actor: actor(), templateId: 5 })).resolves.toBeUndefined();

    expect(template).toMatchObject({ active: false, trashPending: true });
    expect(warn).toHaveBeenCalledTimes(1);
    // El primer archivo no se movió; el segundo sí se intentó (se prueban todos).
    expect(parentOf('f-penal')).toBe(penal.id);
    expect(parentOf('f-amparo')).toBe(papelera()!.id);
  });

  it('si no hay carpeta raíz del estudio en la nube, la baja vale igual', async () => {
    const { templates, storage, folders } = await aStudioWithATemplate();
    const withoutRoot = Object.assign(Object.create(folders), { findByKey: async () => null });
    const move = new MoveTemplateFilesToTrash(templates, new RecycleBin(withoutRoot, storage));

    await expect(
      new DeactivateDocumentTemplate(templates, move).execute({ actor: actor(), templateId: 5 }),
    ).resolves.toBeUndefined();

    expect(templates.rows[0]).toMatchObject({ active: false, trashPending: true });
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('MoveTemplateFilesToTrash', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  async function aMover() {
    const scenario = await aStudioWithATemplate();
    const move = new MoveTemplateFilesToTrash(scenario.templates, new RecycleBin(scenario.folders, scenario.storage));
    return { ...scenario, move };
  }

  // CA-37.4
  it('mueve un archivo por fuero, crea la Papelera una sola vez y apaga la marca de pendiente', async () => {
    const { move, templates, storage, template, papelera } = await aMover();
    await templates.deactivate(5);

    await expect(move.execute({ templateId: 5 })).resolves.toEqual({ outcome: 'MOVED' });

    expect(storage.calls.filter((call) => call.method === 'createFolder')).toHaveLength(1);
    expect(storage.fileCalls.filter((call) => call.method === 'moveFile')).toEqual([
      { method: 'moveFile', fileId: 'f-penal' },
      { method: 'moveFile', fileId: 'f-amparo' },
    ]);
    expect(storage.files.every((file) => file.parentId === papelera()!.id)).toBe(true);
    expect(template.trashPending).toBe(false);
  });

  it('un modelo anterior a las subcarpetas, sin archivo por fuero, mueve solo el principal', async () => {
    const { move, templates, storage, papelera } = await aMover();
    templates.add({ id: 6, cloudFileId: 'f-viejo', placements: [] });
    storage.seedFile({ id: 'f-viejo', parentId: 'templates-folder', name: 'v.docx', mimeType: 'x', createdAt: new Date() });
    await templates.deactivate(6);
    storage.fileCalls.length = 0;

    await move.execute({ templateId: 6 });

    expect(storage.fileCalls).toEqual([{ method: 'moveFile', fileId: 'f-viejo' }]);
    expect(storage.files.find((file) => file.id === 'f-viejo')?.parentId).toBe(papelera()!.id);
  });

  it('es idempotente: repetirla deja los archivos en la Papelera', async () => {
    const { move, templates, storage, papelera } = await aMover();
    await templates.deactivate(5);
    await move.execute({ templateId: 5 });

    await expect(move.execute({ templateId: 5 })).resolves.toEqual({ outcome: 'MOVED' });

    expect(storage.folders.filter((folder) => folder.name === 'Papelera')).toHaveLength(1);
    expect(storage.files.every((file) => file.parentId === papelera()!.id)).toBe(true);
  });

  it('si un archivo falla prueba con los demás y avisa; la marca queda, y un reintento termina', async () => {
    const { move, templates, storage, template, parentOf, papelera } = await aMover();
    await templates.deactivate(5);
    storage.failNextCallTo('moveFile', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(move.execute({ templateId: 5 })).rejects.toBeInstanceOf(DocumentStorageUnavailableError);

    expect(parentOf('f-amparo')).toBe(papelera()!.id);
    expect(template.trashPending).toBe(true);

    await expect(move.execute({ templateId: 5 })).resolves.toEqual({ outcome: 'MOVED' });
    expect(template.trashPending).toBe(false);
  });

  it('un modelo que no existe no tiene nada que mover y no crea la Papelera', async () => {
    const { move, storage } = await aMover();
    storage.calls.length = 0;

    await expect(move.execute({ templateId: 404 })).resolves.toEqual({ outcome: 'NO_TEMPLATE' });

    expect(storage.calls).toEqual([]);
  });
});
