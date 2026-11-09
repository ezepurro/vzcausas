import { Logger } from '@nestjs/common';
import { RenameLawyerFolder } from '../../../core/application/use-cases/rename-lawyer-folder.use-case';
import { DocumentStorageUnavailableError } from '../../../core/domain/errors/documents.errors';
import { FolderKey } from '../../../core/domain/value-objects/folder-key.vo';
import { aCommand, aLawyerRenamedEvent, aSetUpStudio } from '../../../core/test-support/document-fixtures';
import { LawyerRenamedListener } from './lawyer-renamed.listener';

describe('LawyerRenamedListener', () => {
  let error: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  async function aListener() {
    const studio = await aSetUpStudio();
    await studio.assureSpace.execute(aCommand());
    return { ...studio, listener: new LawyerRenamedListener(new RenameLawyerFolder(studio.folders, studio.storage)) };
  }

  it('arma "Apellido, Nombres" con el evento y renombra la carpeta del abogado (CA-14.12)', async () => {
    const { listener, folders } = await aListener();

    await listener.handle(aLawyerRenamedEvent({ lastName: 'Ríos Castro', firstName: 'Malena Inés' }));

    expect((await folders.findByKey(FolderKey.lawyer(3)))?.name).toBe('Ríos Castro, Malena Inés');
  });

  it('si Drive falla, no propaga el error: lo registra y la carpeta conserva su nombre (CA-14.13)', async () => {
    const { listener, storage, folders } = await aListener();
    storage.failNextCallTo('relocateFolder', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(listener.handle(aLawyerRenamedEvent({ lastName: 'Ríos Castro' }))).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(expect.stringContaining('lawyerId=3'));
    expect((await folders.findByKey(FolderKey.lawyer(3)))?.name).toBe('Ríos, Malena');
  });

  it('un abogado sin carpeta no hace nada ni falla', async () => {
    const { listener, storage } = await aListener();

    await expect(listener.handle(aLawyerRenamedEvent({ lawyerId: 99 }))).resolves.toBeUndefined();

    expect(storage.relocations).toEqual([]);
    expect(error).not.toHaveBeenCalled();
  });
});
