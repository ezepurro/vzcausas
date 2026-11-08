import { Logger } from '@nestjs/common';
import { TrashCaseFolder } from '../../../core/application/use-cases/trash-case-folder.use-case';
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
    return { ...studio, listener: new CaseDeactivatedListener(new TrashCaseFolder(studio.folders, studio.storage)) };
  }

  it('traduce el evento: manda la carpeta de la causa a la papelera (HU21)', async () => {
    const { listener, storage } = await aListener();

    await listener.handle(aCaseDeactivatedEvent());

    expect(storage.trashedFolderIds).toHaveLength(1);
    expect(storage.folders.filter((f) => f.trashed)).toHaveLength(1);
  });

  it('si Drive falla, no propaga el error: lo registra y la carpeta queda como estaba', async () => {
    const { listener, storage } = await aListener();
    storage.failNextCallTo('trashFolder', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(listener.handle(aCaseDeactivatedEvent())).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(expect.stringContaining('caseId=10'));
    expect(storage.folders.filter((f) => f.trashed)).toEqual([]);
  });

  it('un evento de una causa sin carpeta no hace nada ni falla', async () => {
    const { listener, storage } = await aListener();

    await expect(listener.handle(aCaseDeactivatedEvent({ caseId: 99 }))).resolves.toBeUndefined();

    expect(storage.trashedFolderIds).toEqual([]);
    expect(error).not.toHaveBeenCalled();
  });
});
