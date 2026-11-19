import { Logger } from '@nestjs/common';
import {
  LAWYER_DEACTIVATED,
  LawyerDeactivatedEvent,
} from '@subsystems/people/core/domain/ports/events/lawyer-deactivated.event';
import { RecycleBin } from '../../../core/application/common/recycle-bin';
import { RecycleLawyerFolder } from '../../../core/application/use-cases/recycle-lawyer-folder.use-case';
import { DocumentStorageUnavailableError } from '../../../core/domain/errors/documents.errors';
import { aCommand, aSetUpStudio } from '../../../core/test-support/document-fixtures';
import { LawyerDeactivatedListener } from './lawyer-deactivated.listener';

const anEvent = (overrides: Partial<LawyerDeactivatedEvent> = {}): LawyerDeactivatedEvent => ({
  type: LAWYER_DEACTIVATED,
  eventId: 'evt-lawyer-deactivated-1',
  occurredAt: '2026-11-17T15:30:00.000Z',
  lawyerId: 3,
  keepsHistory: false,
  ...overrides,
});

describe('LawyerDeactivatedListener', () => {
  let error: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  async function aListener() {
    const studio = await aSetUpStudio();
    await studio.assureSpace.execute(aCommand());
    const bin = new RecycleBin(studio.folders, studio.storage);
    return { ...studio, listener: new LawyerDeactivatedListener(new RecycleLawyerFolder(studio.folders, studio.storage, bin)) };
  }

  it('traduce el evento: mueve la carpeta del abogado a la Papelera (HU15, D-132)', async () => {
    const { listener, storage } = await aListener();

    await listener.handle(anEvent());

    const bin = storage.folders.find((f) => f.name === 'Papelera')!;
    expect(storage.relocations).toHaveLength(1);
    expect(storage.relocations[0].newParentId).toBe(bin.id);
  });

  it('si el abogado conserva historia, no mueve nada', async () => {
    const { listener, storage } = await aListener();

    await listener.handle(anEvent({ keepsHistory: true }));

    expect(storage.relocations).toEqual([]);
  });

  it('si Drive falla, no propaga el error: lo registra y la carpeta queda como estaba', async () => {
    const { listener, storage } = await aListener();
    storage.failNextCallTo('relocateFolder', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(listener.handle(anEvent())).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(expect.stringContaining('lawyerId=3'));
  });

  it('un evento de un abogado sin carpeta no hace nada ni falla', async () => {
    const { listener, storage } = await aListener();

    await expect(listener.handle(anEvent({ lawyerId: 99 }))).resolves.toBeUndefined();

    expect(storage.relocations).toEqual([]);
    expect(error).not.toHaveBeenCalled();
  });
});
