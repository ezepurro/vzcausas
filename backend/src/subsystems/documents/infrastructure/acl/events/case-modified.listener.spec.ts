import { Logger } from '@nestjs/common';
import { FolderChain } from '../../../core/application/common/folder-chain';
import { SyncCaseFolder } from '../../../core/application/use-cases/sync-case-folder.use-case';
import { DocumentStorageUnavailableError } from '../../../core/domain/errors/documents.errors';
import { FolderKey } from '../../../core/domain/value-objects/folder-key.vo';
import { aCaseModifiedEvent, aCommand, aSetUpStudio, FakeClock } from '../../../core/test-support/document-fixtures';
import { CaseModifiedListener } from './case-modified.listener';

describe('CaseModifiedListener', () => {
  let error: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  async function aListener() {
    const studio = await aSetUpStudio();
    await studio.assureSpace.execute(aCommand());
    const sync = new SyncCaseFolder(
      studio.folders,
      studio.storage,
      new FolderChain(studio.folders, studio.storage, new FakeClock()),
    );
    return { ...studio, listener: new CaseModifiedListener(sync) };
  }

  it('traduce el evento: renombra la carpeta con la carátula nueva (CA-19.9)', async () => {
    const { listener, storage, folders } = await aListener();

    await listener.handle(aCaseModifiedEvent({ caption: 'RUIZ s/ amparo' }));

    expect((await folders.findByKey(FolderKey.forCase(10)))!.name).toBe('RUIZ s amparo');
    expect(storage.relocations).toHaveLength(1);
  });

  it('con otro responsable, arma "Apellido, Nombres" y mueve la carpeta bajo él (CA-19.9)', async () => {
    const { listener, storage, folders } = await aListener();

    await listener.handle(
      aCaseModifiedEvent({
        lawyer: { id: 5, lastName: 'Peralta', firstName: 'Ignacio' },
        changed: ['responsibleLawyer'],
      }),
    );

    expect(storage.folders.some((f) => f.name === 'Peralta, Ignacio')).toBe(true);
    expect((await folders.findByKey(FolderKey.forCase(10)))!.lawyerId).toBe(5);
  });

  it('si Drive falla, no propaga el error: lo registra y la fila no cambia (CA-19.10)', async () => {
    const { listener, storage, folders } = await aListener();
    storage.failNextCallTo('relocateFolder', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(listener.handle(aCaseModifiedEvent({ caption: 'RUIZ s/ amparo' }))).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(expect.stringContaining('caseId=10'));
    expect((await folders.findByKey(FolderKey.forCase(10)))!.name).toBe('GÓMEZ, Ariel Fernando p.s.a. Robo calificado');
  });

  it('un evento de una causa sin carpeta no hace nada ni falla', async () => {
    const { listener, storage } = await aListener();

    await expect(listener.handle(aCaseModifiedEvent({ caseId: 99 }))).resolves.toBeUndefined();

    expect(storage.relocations).toEqual([]);
    expect(error).not.toHaveBeenCalled();
  });
});
