import { Logger } from '@nestjs/common';
import { DocumentStorageUnavailableError } from '../../../core/domain/errors/documents.errors';
import { DOCUMENT_SPACE_ASSIGNED } from '../../../core/domain/ports/events/document-space-assigned.event';
import { DOCUMENT_SPACE_CREATION_FAILED } from '../../../core/domain/ports/events/document-space-creation-failed.event';
import { aCaseRegisteredEvent, aSetUpStudio } from '../../../core/test-support/document-fixtures';
import { CaseRegisteredListener } from './case-registered.listener';

describe('CaseRegisteredListener', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('traduce CaseRegistered al comando y crea la carpeta de la causa', async () => {
    const { assureSpace, storage, events } = await aSetUpStudio();
    const listener = new CaseRegisteredListener(assureSpace);

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
    const listener = new CaseRegisteredListener(assureSpace);

    await expect(listener.handle(aCaseRegisteredEvent())).resolves.toBeUndefined();

    expect(events.published.map((e) => e.type)).toEqual([DOCUMENT_SPACE_CREATION_FAILED]);
  });

  it('no deja escapar errores inesperados del caso de uso', async () => {
    const listener = new CaseRegisteredListener({
      execute: jest.fn().mockRejectedValue(new Error('boom')),
    } as never);

    await expect(listener.handle(aCaseRegisteredEvent())).resolves.toBeUndefined();
  });

  it('loguea la recepción y la falla con el id del evento y de la causa', async () => {
    const listener = new CaseRegisteredListener({
      execute: jest.fn().mockRejectedValue(new Error('boom')),
    } as never);

    await listener.handle(aCaseRegisteredEvent({ eventId: 'evt-7', caseId: 42 }));

    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('eventId=evt-7, caseId=42'),
    );
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('eventId=evt-7, caseId=42'),
    );
  });
});
