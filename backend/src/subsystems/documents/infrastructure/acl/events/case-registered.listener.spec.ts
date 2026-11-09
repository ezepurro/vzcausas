import { Logger } from '@nestjs/common';
import { DocumentStorageUnavailableError } from '../../../core/domain/errors/documents.errors';
import { DOCUMENT_SPACE_ASSIGNED } from '../../../core/domain/ports/events/document-space-assigned.event';
import { DOCUMENT_SPACE_CREATION_FAILED } from '../../../core/domain/ports/events/document-space-creation-failed.event';
import { CASE_TEMPLATES_COPIED } from '../../../core/domain/ports/events/case-templates-copied.event';
import { CopyTemplatesToCaseFolder } from '../../../core/application/use-cases/copy-templates-to-case-folder.use-case';
import { aCaseRegisteredEvent, aSetUpStudio, FakeClock } from '../../../core/test-support/document-fixtures';
import { FakeTemplateCopyRepository } from '../../../core/test-support/fake-template-copy.repository';
import { CaseRegisteredListener } from './case-registered.listener';

const noCopy = { execute: jest.fn() } as unknown as CopyTemplatesToCaseFolder;

describe('CaseRegisteredListener', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  /** El listener con el caso de uso de copia real sobre un repositorio de copias falso. */
  async function aListenerWithTemplates(templates: number) {
    const studio = await aSetUpStudio();
    const copies = new FakeTemplateCopyRepository();
    for (let id = 1; id <= templates; id += 1) {
      const file = await studio.storage.uploadFile({
        parentId: 'modelos',
        name: `modelo-${id}.docx`,
        mimeType: 'application/x',
        content: Buffer.from('x'),
      });
      copies.addTemplate({ id, cloudFileId: file.id });
    }
    const copyTemplates = new CopyTemplatesToCaseFolder(studio.folders, copies, studio.storage, new FakeClock(), studio.events);
    return { ...studio, copies, listener: new CaseRegisteredListener(studio.assureSpace, copyTemplates) };
  }

  it('con copyTemplates, crea la carpeta y copia los modelos del fuero dentro de ella (CA-40.1)', async () => {
    const { listener, storage, events, copies } = await aListenerWithTemplates(2);

    await listener.handle(aCaseRegisteredEvent({ eventId: 'evt-1', copyTemplates: true }));

    const caseFolder = storage.folders.find((f) => f.name.startsWith('GÓMEZ'))!;
    expect(storage.files.filter((f) => f.parentId === caseFolder.id)).toHaveLength(2);
    expect(copies.rowsOf(10).every((c) => c.status === 'COPIED')).toBe(true);
    expect(events.published.map((e) => e.type)).toContain(CASE_TEMPLATES_COPIED);
  });

  it('sin copyTemplates, la carpeta queda vacía y no se piden modelos (CA-40.4)', async () => {
    const { listener, storage, copies } = await aListenerWithTemplates(2);

    await listener.handle(aCaseRegisteredEvent({ copyTemplates: false }));

    expect(storage.files.filter((f) => f.name.startsWith('modelo'))).toHaveLength(2); // solo los originales
    expect(copies.rowsOf(10)).toEqual([]);
  });

  it('si la carpeta falla, igual registra los modelos pendientes y no los copia', async () => {
    const { listener, storage, events, copies } = await aListenerWithTemplates(2);
    storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT'));

    await listener.handle(aCaseRegisteredEvent({ copyTemplates: true }));

    expect(copies.rowsOf(10).map((c) => c.status)).toEqual(['PENDING', 'PENDING']);
    expect(events.published.map((e) => e.type)).toEqual([DOCUMENT_SPACE_CREATION_FAILED]);
  });

  it('no deja escapar un error del caso de uso de copia', async () => {
    const { assureSpace } = await aSetUpStudio();
    const listener = new CaseRegisteredListener(assureSpace, {
      request: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn().mockRejectedValue(new Error('boom')),
    } as never);

    await expect(listener.handle(aCaseRegisteredEvent({ copyTemplates: true }))).resolves.toBeUndefined();
  });

  // CA-39.5: con la carpeta caída, `cases` responde ERROR enseguida y ya tiene que ver los pendientes.
  it('registra los modelos pendientes ANTES de pedir la carpeta', async () => {
    const order: string[] = [];
    const assureSpace = {
      execute: jest.fn().mockImplementation(async () => {
        order.push('assure');
        return { cloudFolderId: 'f', url: 'u', path: 'p' };
      }),
    };
    const copyTemplates = {
      request: jest.fn().mockImplementation(async () => void order.push('request')),
      execute: jest.fn().mockImplementation(async () => void order.push('copy')),
    };
    const listener = new CaseRegisteredListener(assureSpace as never, copyTemplates as never);

    await listener.handle(aCaseRegisteredEvent({ caseId: 10, copyTemplates: true }));

    expect(order).toEqual(['request', 'assure', 'copy']);
    expect(copyTemplates.request).toHaveBeenCalledWith({ caseId: 10, jurisdictionId: expect.any(Number) });
  });

  it('si no se pudieron registrar los pendientes, igual crea la carpeta y copia', async () => {
    const assureSpace = { execute: jest.fn().mockResolvedValue({ cloudFolderId: 'f', url: 'u', path: 'p' }) };
    const copyTemplates = {
      request: jest.fn().mockRejectedValue(new Error('boom')),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const listener = new CaseRegisteredListener(assureSpace as never, copyTemplates as never);

    await expect(listener.handle(aCaseRegisteredEvent({ copyTemplates: true }))).resolves.toBeUndefined();

    expect(assureSpace.execute).toHaveBeenCalledTimes(1);
    expect(copyTemplates.execute).toHaveBeenCalledTimes(1);
  });

  it('sin copyTemplates no registra pendientes (CA-40.4)', async () => {
    const assureSpace = { execute: jest.fn().mockResolvedValue({ cloudFolderId: 'f', url: 'u', path: 'p' }) };
    const copyTemplates = { request: jest.fn(), execute: jest.fn() };
    const listener = new CaseRegisteredListener(assureSpace as never, copyTemplates as never);

    await listener.handle(aCaseRegisteredEvent({ copyTemplates: false }));

    expect(copyTemplates.request).not.toHaveBeenCalled();
  });

  it('traduce CaseRegistered al comando y crea la carpeta de la causa', async () => {
    const { assureSpace, storage, events } = await aSetUpStudio();
    const listener = new CaseRegisteredListener(assureSpace, noCopy);

    await listener.handle(aCaseRegisteredEvent({ eventId: 'evt-9' }));

    expect(storage.folders.map((f) => f.name)).toEqual(
      expect.arrayContaining([
        'Ríos, Malena',
        'Penal',
        'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
      ]),
    );
    expect(events.published).toHaveLength(1);
    expect(events.published[0]).toMatchObject({
      type: DOCUMENT_SPACE_ASSIGNED,
      caseId: 10,
      causedByEventId: 'evt-9',
    });
  });

  it('no deja escapar el error y la falla queda anunciada por el caso de uso', async () => {
    const { assureSpace, storage, events } = await aSetUpStudio();
    storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT'));
    const listener = new CaseRegisteredListener(assureSpace, noCopy);

    await expect(listener.handle(aCaseRegisteredEvent())).resolves.toBeUndefined();

    expect(events.published.map((e) => e.type)).toEqual([DOCUMENT_SPACE_CREATION_FAILED]);
  });

  it('no deja escapar errores inesperados del caso de uso', async () => {
    const listener = new CaseRegisteredListener({
      execute: jest.fn().mockRejectedValue(new Error('boom')),
    } as never, noCopy);

    await expect(listener.handle(aCaseRegisteredEvent())).resolves.toBeUndefined();
  });

  it('loguea la recepción y la falla con el id del evento y de la causa', async () => {
    const listener = new CaseRegisteredListener({
      execute: jest.fn().mockRejectedValue(new Error('boom')),
    } as never, noCopy);

    await listener.handle(aCaseRegisteredEvent({ eventId: 'evt-7', caseId: 42 }));

    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('eventId=evt-7, caseId=42'),
    );
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('eventId=evt-7, caseId=42'),
    );
  });
});
