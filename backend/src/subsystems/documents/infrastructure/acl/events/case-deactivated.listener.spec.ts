import { Logger } from '@nestjs/common';
import { RecycleCaseFolder } from '../../../core/application/use-cases/recycle-case-folder.use-case';
import { DocumentStorageUnavailableError } from '../../../core/domain/errors/documents.errors';
import { aCaseDeactivatedEvent, aCommand, aSetUpStudio } from '../../../core/test-support/document-fixtures';
import { CaseDeactivatedListener } from './case-deactivated.listener';

describe('CaseDeactivatedListener', () => {
  let error: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  async function aListener() {
    const studio = await aSetUpStudio();
    await studio.assureSpace.execute(aCommand());
    return { ...studio, listener: new CaseDeactivatedListener(new RecycleCaseFolder(studio.folders, studio.storage)) };
  }

  it('traduce el evento: mueve la carpeta de la causa a la carpeta Papelera (HU21)', async () => {
    const { listener, storage } = await aListener();

    await listener.handle(aCaseDeactivatedEvent());

    const bin = storage.folders.find((f) => f.name === 'Papelera')!;
    expect(storage.relocations).toHaveLength(1);
    expect(storage.relocations[0].newParentId).toBe(bin.id);
  });

  it('si Drive falla al mover, no propaga el error: lo registra y la carpeta queda como estaba', async () => {
    const { listener, storage } = await aListener();
    storage.failNextCallTo('relocateFolder', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(listener.handle(aCaseDeactivatedEvent())).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(expect.stringContaining('caseId=10'));
    expect(storage.folders.find((f) => f.name === 'Papelera')?.id).toBeDefined();
    expect(storage.folders.filter((f) => f.parentId === storage.folders.find((g) => g.name === 'Papelera')?.id)).toEqual([]);
  });

  it('un evento de una causa sin carpeta no hace nada ni falla', async () => {
    const { listener, storage } = await aListener();

    await expect(listener.handle(aCaseDeactivatedEvent({ caseId: 99 }))).resolves.toBeUndefined();

    expect(storage.relocations).toEqual([]);
    expect(error).not.toHaveBeenCalled();
  });
});
