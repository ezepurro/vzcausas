import { DocumentStorageUnavailableError } from '../../domain/errors/documents.errors';
import {
  CASE_TEMPLATES_COPIED,
  CaseTemplatesCopiedEvent,
} from '../../domain/ports/events/case-templates-copied.event';
import { FakeClock, NOW, aSetUpStudio } from '../../test-support/document-fixtures';
import { FakeEventPublisher } from '../../test-support/fake-event-publisher';
import { FakeTemplateCopyRepository } from '../../test-support/fake-template-copy.repository';
import { CopyTemplatesToCaseFolder } from './copy-templates-to-case-folder.use-case';

const CASE_ID = 10;
const CRIMINAL = 1;
const AMPARO = 3;

/** El estudio armado, la carpeta de la causa creada y `count` modelos penales con su archivo en el storage. */
async function aStudioWithTemplates(count: number) {
  const studio = await aSetUpStudio();
  const copies = new FakeTemplateCopyRepository();
  const caseFolder = await studio.assureSpace.execute({
    caseId: CASE_ID,
    caseCaption: 'GÓMEZ, Ariel',
    lawyer: { id: 3, folderLabel: 'Ríos, Malena' },
    jurisdiction: { id: CRIMINAL, folderLabel: 'Penal' },
  });
  studio.events.published.length = 0;

  for (let id = 1; id <= count; id += 1) {
    const file = await studio.storage.uploadFile({
      parentId: 'modelos',
      name: `modelo-${id}.docx`,
      mimeType: 'application/x',
      content: Buffer.from(`contenido ${id}`),
    });
    copies.addTemplate({ id, fileName: `modelo-${id}.docx`, cloudFileId: file.id });
  }
  studio.storage.fileCalls.length = 0;

  const copyTemplates = new CopyTemplatesToCaseFolder(studio.folders, copies, studio.storage, new FakeClock(), studio.events);
  return { ...studio, copies, caseFolder, copyTemplates };
}

const copiedEvents = (events: FakeEventPublisher) => events.ofType<CaseTemplatesCopiedEvent>(CASE_TEMPLATES_COPIED);

describe('CopyTemplatesToCaseFolder', () => {
  it('copia a la carpeta de la causa los modelos del fuero y anuncia cuántos (CA-40.1, CA-40.2)', async () => {
    const { copyTemplates, copies, storage, caseFolder, events } = await aStudioWithTemplates(3);

    const result = await copyTemplates.execute({ caseId: CASE_ID, jurisdictionId: CRIMINAL, causedByEventId: 'evt-1' });

    expect(result).toEqual({ copied: 3, pending: 0 });
    const inFolder = storage.files.filter((f) => f.parentId === caseFolder.cloudFolderId);
    expect(inFolder.map((f) => f.name)).toEqual(['modelo-1.docx', 'modelo-2.docx', 'modelo-3.docx']);
    expect(copies.rowsOf(CASE_ID).every((c) => c.status === 'COPIED' && c.copiedAt?.getTime() === NOW.getTime())).toBe(true);
    expect(copiedEvents(events)).toEqual([
      expect.objectContaining({
        caseId: CASE_ID,
        cloudFolderId: caseFolder.cloudFolderId,
        copied: 3,
        pending: 0,
        causedByEventId: 'evt-1',
      }),
    ]);
  });

  it('con un fuero sin modelos no copia nada y lo anuncia con 0 (CA-40.9)', async () => {
    const { copyTemplates, storage, caseFolder, events } = await aStudioWithTemplates(0);

    const result = await copyTemplates.execute({ caseId: CASE_ID, jurisdictionId: CRIMINAL });

    expect(result).toEqual({ copied: 0, pending: 0 });
    expect(storage.files.filter((f) => f.parentId === caseFolder.cloudFolderId)).toEqual([]);
    expect(copiedEvents(events)).toEqual([expect.objectContaining({ copied: 0, pending: 0 })]);
  });

  it('no copia modelos de otro fuero, sin marcar o dados de baja (CA-40.5)', async () => {
    const { copyTemplates, copies, storage, caseFolder } = await aStudioWithTemplates(1);
    copies.addTemplate({ id: 11, jurisdictionIds: [AMPARO] });
    copies.addTemplate({ id: 12, copyToNewCases: false });
    copies.addTemplate({ id: 13, active: false });

    const result = await copyTemplates.execute({ caseId: CASE_ID, jurisdictionId: CRIMINAL });

    expect(result).toEqual({ copied: 1, pending: 0 });
    expect(storage.files.filter((f) => f.parentId === caseFolder.cloudFolderId)).toHaveLength(1);
    expect(copies.rowsOf(CASE_ID).map((c) => c.templateId)).toEqual([1]);
  });

  it('si falla la copia de un modelo, copia los demás y deja ese pendiente (CA-40.7)', async () => {
    const { copyTemplates, storage, events } = await aStudioWithTemplates(3);
    const realCopy = storage.copyFile.bind(storage);
    let calls = 0;
    storage.copyFile = async (copy) => {
      calls += 1;
      if (calls === 2) {
        throw new DocumentStorageUnavailableError('TRANSIENT', 'timeout');
      }
      return realCopy(copy);
    };

    const result = await copyTemplates.execute({ caseId: CASE_ID, jurisdictionId: CRIMINAL });

    expect(result).toEqual({ copied: 2, pending: 1 });
    expect(copiedEvents(events)).toEqual([expect.objectContaining({ copied: 2, pending: 1 })]);
  });

  it('al reintentar copia solo los que faltan, sin repetir los ya copiados (CA-40.7)', async () => {
    const { copyTemplates, storage, caseFolder } = await aStudioWithTemplates(3);
    const realCopy = storage.copyFile.bind(storage);
    let fail = true;
    storage.copyFile = async (copy) => {
      if (fail && copy.name === 'modelo-2.docx') {
        throw new DocumentStorageUnavailableError('TRANSIENT', 'timeout');
      }
      return realCopy(copy);
    };
    await copyTemplates.execute({ caseId: CASE_ID, jurisdictionId: CRIMINAL });
    fail = false;
    storage.fileCalls.length = 0;

    const retried = await copyTemplates.execute({ caseId: CASE_ID });

    expect(retried).toEqual({ copied: 3, pending: 0 });
    expect(storage.fileCalls.filter((c) => c.method === 'copyFile')).toHaveLength(1);
    expect(storage.files.filter((f) => f.parentId === caseFolder.cloudFolderId)).toHaveLength(3);
  });

  it('pedir de nuevo los modelos del fuero no repite una copia ya hecha (CA-40.7)', async () => {
    const { copyTemplates, storage } = await aStudioWithTemplates(2);
    await copyTemplates.execute({ caseId: CASE_ID, jurisdictionId: CRIMINAL });
    storage.fileCalls.length = 0;

    const again = await copyTemplates.execute({ caseId: CASE_ID, jurisdictionId: CRIMINAL });

    expect(again).toEqual({ copied: 2, pending: 0 });
    expect(storage.fileCalls).toEqual([]);
  });

  it('dos pedidos a la vez copian cada modelo una sola vez (CA-40.7)', async () => {
    const { copyTemplates, storage, caseFolder } = await aStudioWithTemplates(3);

    await Promise.all([
      copyTemplates.execute({ caseId: CASE_ID, jurisdictionId: CRIMINAL }),
      copyTemplates.execute({ caseId: CASE_ID, jurisdictionId: CRIMINAL }),
    ]);

    expect(storage.files.filter((f) => f.parentId === caseFolder.cloudFolderId)).toHaveLength(3);
  });

  it('si otra instancia ganó la copia, borra la copia sobrante', async () => {
    const { copyTemplates, copies, storage, caseFolder } = await aStudioWithTemplates(1);
    copies.loseNextRace = true;

    await copyTemplates.execute({ caseId: CASE_ID, jurisdictionId: CRIMINAL });

    expect(storage.files.filter((f) => f.parentId === caseFolder.cloudFolderId)).toEqual([]);
  });

  it('si la carpeta de la causa no existe, registra los pendientes y no copia ni anuncia nada', async () => {
    const { copyTemplates, copies, storage, events } = await aStudioWithTemplates(2);

    const result = await copyTemplates.execute({ caseId: 99, jurisdictionId: CRIMINAL });

    expect(result).toEqual({ copied: 0, pending: 2 });
    expect(copies.rowsOf(99).map((c) => c.status)).toEqual(['PENDING', 'PENDING']);
    expect(storage.fileCalls).toEqual([]);
    expect(copiedEvents(events)).toEqual([]);
  });

  it('usa la carpeta que le pasan sin buscarla (todavía puede no estar vinculada a la causa)', async () => {
    const studio = await aStudioWithTemplates(1);
    const loose = await studio.storage.createFolder({ parentId: studio.rootCasesId, name: 'Suelta' });

    await studio.copyTemplates.execute({ caseId: 77, jurisdictionId: CRIMINAL, cloudFolderId: loose.id });

    expect(studio.storage.files.filter((f) => f.parentId === loose.id)).toHaveLength(1);
  });

  // C1
  it('copia el archivo del modelo en la subcarpeta del fuero de la causa, no el principal', async () => {
    const { copyTemplates, copies, storage, caseFolder } = await aStudioWithTemplates(0);
    const penal = await storage.uploadFile({ parentId: 'penal', name: 'm.docx', mimeType: 'application/x', content: Buffer.from('penal') });
    const amparo = await storage.uploadFile({ parentId: 'amparo', name: 'm.docx', mimeType: 'application/x', content: Buffer.from('amparo') });
    copies.addTemplate({
      id: 1,
      fileName: 'm.docx',
      cloudFileId: amparo.id,
      jurisdictionIds: [CRIMINAL, AMPARO],
      filesByJurisdiction: { [CRIMINAL]: penal.id, [AMPARO]: amparo.id },
    });
    storage.fileCalls.length = 0;

    await copyTemplates.execute({ caseId: CASE_ID, jurisdictionId: CRIMINAL });

    expect(storage.fileCalls).toEqual([{ method: 'copyFile', fileId: penal.id }]);
    expect(storage.files.filter((f) => f.parentId === caseFolder.cloudFolderId)).toHaveLength(1);
  });

  // C2
  it('un modelo anterior a las subcarpetas (sin archivo por fuero) se copia desde su archivo principal', async () => {
    const { copyTemplates, storage } = await aStudioWithTemplates(1);
    const main = storage.files[0];
    storage.fileCalls.length = 0;

    await copyTemplates.execute({ caseId: CASE_ID, jurisdictionId: CRIMINAL });

    expect(storage.fileCalls).toEqual([{ method: 'copyFile', fileId: main.id }]);
  });

  // C3
  it('al reintentar sin el fuero en el comando, lo toma de la carpeta de la causa', async () => {
    const { copyTemplates, copies, storage } = await aStudioWithTemplates(0);
    const penal = await storage.uploadFile({ parentId: 'penal', name: 'm.docx', mimeType: 'application/x', content: Buffer.from('penal') });
    const principal = await storage.uploadFile({ parentId: 'otro', name: 'm.docx', mimeType: 'application/x', content: Buffer.from('otro') });
    copies.addTemplate({
      id: 1,
      fileName: 'm.docx',
      cloudFileId: principal.id,
      filesByJurisdiction: { [CRIMINAL]: penal.id },
    });
    await copies.registerPending(CASE_ID, CRIMINAL);
    storage.fileCalls.length = 0;

    await copyTemplates.execute({ caseId: CASE_ID });

    expect(storage.fileCalls).toEqual([{ method: 'copyFile', fileId: penal.id }]);
  });

  it('un modelo dado de baja con la copia pendiente no cuenta como pendiente', async () => {
    const { copyTemplates, copies } = await aStudioWithTemplates(2);
    await copies.registerPending(CASE_ID, CRIMINAL);
    copies.deactivate(2);

    const result = await copyTemplates.execute({ caseId: CASE_ID });

    expect(result).toEqual({ copied: 1, pending: 0 });
  });
});
