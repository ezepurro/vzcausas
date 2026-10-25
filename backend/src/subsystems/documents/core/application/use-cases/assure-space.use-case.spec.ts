import { Logger } from '@nestjs/common';
import { CloudFolder } from '../../domain/entities/cloud-folder.entity';
import {
  CloudFolderAlreadyExistsError,
  DocumentStorageUnavailableError,
  InvalidCloudFolderError,
  StorageStructureBrokenError,
  StudioRootNotConfiguredError,
} from '../../domain/errors/documents.errors';
import { CloudFolderFactory } from '../../domain/factories/cloud-folder.factory';
import { AssureSpace } from './assure-space.use-case';
import { SetupCloudStorage } from './setup-cloud-storage.use-case';
import { InMemoryCloudFolderRepository } from '../../../infrastructure/persistence/in-memory/in-memory-cloud-folder.repository';
import { InMemoryDocumentStorage } from '../../../infrastructure/storage/in-memory/in-memory-document-storage';
import { FakeClock, aCommand, aSetUpStudio } from '../../test-support/document-fixtures';
import { FakeEventPublisher } from '../../test-support/fake-event-publisher';
import {
  DOCUMENT_SPACE_ASSIGNED,
  DocumentSpaceAssignedEvent,
} from '../../domain/ports/events/document-space-assigned.event';
import {
  DOCUMENT_SPACE_CREATION_FAILED,
  DocumentSpaceCreationFailedEvent,
} from '../../domain/ports/events/document-space-creation-failed.event';

describe('AssureSpace', () => {
  it('crea la cadena abogado > fuero > causa bajo la carpeta raíz de causas (CA-39.1, CA-39.3)', async () => {
    const { assureSpace, storage, folders, rootCasesId } = await aSetUpStudio();

    const result = await assureSpace.execute(aCommand());

    const created = storage.calls.filter((c) => c.method === 'createFolder').map((c) => c.reference.name);
    expect(created).toEqual([
      'Ríos, Malena',
      'Penal',
      'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    ]);
    expect(storage.calls[0].reference.parentId).toBe(rootCasesId);
    expect(result.path).toBe('Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado');
    expect(result.url).toMatch(/^https:/);
    expect(folders.all().map((f) => f.key.kind)).toEqual([
      'MAIN',
      'ROOT_CASES',
      'LAWYER',
      'JURISDICTION',
      'CASE',
    ]);
  });

  it('nombra la carpeta de la causa solo con la carátula, sin id ni SAC (CA-39.2)', async () => {
    const { assureSpace, folders } = await aSetUpStudio();

    await assureSpace.execute(aCommand({ caseCaption: 'PÉREZ c/ LÓPEZ: daños' }));

    const caseFolder = folders.all().find((f) => f.key.kind === 'CASE') as CloudFolder;
    expect(caseFolder.name).toBe('PÉREZ c LÓPEZ daños');
  });

  it('es idempotente: repetir no crea nada nuevo y devuelve la misma carpeta (CA-39.7)', async () => {
    const { assureSpace, storage, folders } = await aSetUpStudio();
    const first = await assureSpace.execute(aCommand());
    const storageCalls = storage.calls.length;
    const saved = folders.saveCount;

    const second = await assureSpace.execute(aCommand());

    expect(second).toEqual(first);
    expect(storage.calls).toHaveLength(storageCalls);
    expect(folders.saveCount).toBe(saved);
  });

  it('reutiliza las carpetas de abogado y fuero para otra causa', async () => {
    const { assureSpace, storage } = await aSetUpStudio();
    await assureSpace.execute(aCommand());
    storage.calls.length = 0;

    await assureSpace.execute(aCommand({ caseId: 11, caseCaption: 'RUIZ s/ amparo' }));

    expect(storage.calls.filter((c) => c.method === 'createFolder')).toHaveLength(1);
    expect(storage.folders.filter((f) => f.name === 'Penal')).toHaveLength(1);
    expect(storage.folders.filter((f) => f.name === 'Ríos, Malena')).toHaveLength(1);
  });

  it('crea carpetas de fuero distintas para el mismo abogado', async () => {
    const { assureSpace, storage } = await aSetUpStudio();
    await assureSpace.execute(aCommand());

    await assureSpace.execute(
      aCommand({ caseId: 12, jurisdiction: { id: 2, folderLabel: 'Civil' } }),
    );

    expect(storage.folders.filter((f) => f.name === 'Ríos, Malena')).toHaveLength(1);
    expect(storage.folders.map((f) => f.name)).toContain('Civil');
  });

  it('dos causas con la misma carátula obtienen carpetas distintas', async () => {
    const { assureSpace } = await aSetUpStudio();

    const a = await assureSpace.execute(aCommand({ caseId: 10, caseCaption: 'GARCÍA' }));
    const b = await assureSpace.execute(aCommand({ caseId: 11, caseCaption: 'GARCÍA' }));

    expect(a.cloudFolderId).not.toBe(b.cloudFolderId);
  });

  it('adopta la carpeta de abogado que quedó huérfana en el storage, pero nunca la de una causa', async () => {
    const { assureSpace, storage, rootCasesId } = await aSetUpStudio();
    const orphanLawyer = storage.seed(rootCasesId, 'Ríos, Malena');
    const orphanJurisdiction = storage.seed(orphanLawyer.id, 'Penal');
    storage.seed(orphanJurisdiction.id, 'GARCÍA');

    const result = await assureSpace.execute(aCommand({ caseCaption: 'GARCÍA' }));

    expect(storage.folders.filter((f) => f.name === 'Ríos, Malena')).toHaveLength(1);
    expect(storage.folders.filter((f) => f.name === 'Penal')).toHaveLength(1);
    expect(storage.folders.filter((f) => f.name === 'GARCÍA')).toHaveLength(2);
    expect(result.cloudFolderId).not.toBe(
      storage.folders.find((f) => f.name === 'GARCÍA' && f.parentId === orphanJurisdiction.id)!.id,
    );
  });

  describe('sin la estructura base', () => {
    function aBareStudio(setup?: Pick<SetupCloudStorage, 'execute'>) {
      const folders = new InMemoryCloudFolderRepository();
      const storage = new InMemoryDocumentStorage();
      const events = new FakeEventPublisher();
      const assureSpace = new AssureSpace(
        folders,
        storage,
        new FakeClock(),
        events,
        (setup as SetupCloudStorage) ?? new SetupCloudStorage(folders, storage, new FakeClock()),
      );
      return { folders, storage, events, assureSpace };
    }

    beforeEach(() => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      jest.spyOn(Logger.prototype, 'log').mockImplementation();
    });

    afterEach(() => jest.restoreAllMocks());

    it('crea la estructura base y después la carpeta de la causa, en el mismo pedido (CA-39.3)', async () => {
      const { assureSpace, folders, events } = aBareStudio();

      const result = await assureSpace.execute(aCommand());

      expect(folders.all().map((f) => f.key.kind)).toEqual([
        'MAIN',
        'TEMPLATES',
        'ROOT_CASES',
        'LAWYER',
        'JURISDICTION',
        'CASE',
      ]);
      expect(result.path).toBe('Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado');
      expect(events.ofType(DOCUMENT_SPACE_ASSIGNED)).toHaveLength(1);
    });

    it('con la estructura completa no llama al setup', async () => {
      const { assureSpace } = await aSetUpStudio();
      const execute = jest.spyOn(SetupCloudStorage.prototype, 'execute');

      await assureSpace.execute(aCommand());

      expect(execute).not.toHaveBeenCalled();
    });

    it('falla con CONFIGURATION si después del setup la raíz de causas sigue sin estar (CA-39.3)', async () => {
      const { assureSpace, events, storage } = aBareStudio({ execute: async () => [] });

      await expect(assureSpace.execute(aCommand())).rejects.toBeInstanceOf(StudioRootNotConfiguredError);

      expect(storage.calls).toHaveLength(0);
      const [failed] = events.ofType<DocumentSpaceCreationFailedEvent>(DOCUMENT_SPACE_CREATION_FAILED);
      expect(failed.reason).toBe('CONFIGURATION');
    });

    it('si el setup falla por Drive, publica DocumentSpaceCreationFailed con la razón y relanza (CA-39.5)', async () => {
      const { assureSpace, storage, events, folders } = aBareStudio();
      storage.failNextWith(new DocumentStorageUnavailableError('AUTHORIZATION', 'invalid_grant'));

      await expect(assureSpace.execute(aCommand())).rejects.toBeInstanceOf(DocumentStorageUnavailableError);

      expect(folders.all()).toEqual([]);
      const [failed] = events.ofType<DocumentSpaceCreationFailedEvent>(DOCUMENT_SPACE_CREATION_FAILED);
      expect(failed.reason).toBe('AUTHORIZATION');
    });

    it('una carpeta base guardada que ya no está en Drive no se recrea en silencio', async () => {
      const { assureSpace, storage, folders } = aBareStudio();
      const main = storage.seed(null, 'VZ Causas');
      await folders.save(
        CloudFolderFactory.create({
          kind: 'MAIN',
          cloudFolderId: main.id,
          name: 'VZ Causas',
          url: main.url,
          parentCloudFolderId: null,
          createdAt: new FakeClock().now(),
        }),
      );
      await storage.deleteFolder(main.id);
      const before = storage.folders.length;

      await expect(assureSpace.execute(aCommand({ caseId: 11 }))).rejects.toBeInstanceOf(
        StorageStructureBrokenError,
      );

      expect(storage.folders).toHaveLength(before);
    });
  });

  it('propaga la falla del storage sin guardar carpetas de más y permite reintentar (CA-39.5)', async () => {
    const { assureSpace, storage, folders } = await aSetUpStudio();
    storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(assureSpace.execute(aCommand())).rejects.toBeInstanceOf(
      DocumentStorageUnavailableError,
    );
    expect(folders.all().map((f) => f.key.kind)).toEqual(['MAIN', 'ROOT_CASES']);

    const result = await assureSpace.execute(aCommand());
    expect(result.path).toContain('GÓMEZ');
  });

  it('si falla a mitad de la cadena, el reintento conserva lo ya creado', async () => {
    const { assureSpace, storage } = await aSetUpStudio();
    // First level: findFolderByReference ok + createFolder ok; fail on the jurisdiction lookup.
    let calls = 0;
    const original = storage.findFolderByReference.bind(storage);
    storage.findFolderByReference = async (reference) => {
      calls += 1;
      if (calls === 2) {
        throw new DocumentStorageUnavailableError('TRANSIENT', '503');
      }
      return original(reference);
    };

    await expect(assureSpace.execute(aCommand())).rejects.toBeInstanceOf(
      DocumentStorageUnavailableError,
    );
    await assureSpace.execute(aCommand());

    expect(storage.folders.filter((f) => f.name === 'Ríos, Malena')).toHaveLength(1);
    expect(storage.folders.filter((f) => f.name === 'Penal')).toHaveLength(1);
  });

  it('ante una carrera en el guardado usa la carpeta de la solicitud ganadora', async () => {
    const { assureSpace, folders } = await aSetUpStudio();
    const realSave = folders.save.bind(folders);
    let raced = false;
    folders.save = async (folder) => {
      if (folder.key.kind === 'LAWYER' && !raced) {
        raced = true;
        // The "winner" saves its own copy first, then ours collides.
        await realSave(
          CloudFolderFactory.create({
            kind: 'LAWYER',
            cloudFolderId: 'winner',
            name: 'Ríos, Malena',
            url: 'https://storage.invalid/winner',
            parentCloudFolderId: folder.parentCloudFolderId,
            lawyerId: 3,
            createdAt: folder.createdAt,
          }),
        );
        throw new CloudFolderAlreadyExistsError();
      }
      return realSave(folder);
    };

    const result = await assureSpace.execute(aCommand());

    const caseFolder = folders.all().find((f) => f.key.kind === 'CASE')!;
    expect(caseFolder.parentCloudFolderId).not.toBeNull();
    expect(result.path).toContain('Ríos, Malena/Penal');
    expect(folders.all().filter((f) => f.key.kind === 'LAWYER')).toHaveLength(1);
  });

  it('rechaza una carátula que queda vacía tras quitar los caracteres no admitidos', async () => {
    const { assureSpace, storage } = await aSetUpStudio();

    await expect(assureSpace.execute(aCommand({ caseCaption: ' /\\:*? ' }))).rejects.toBeInstanceOf(
      InvalidCloudFolderError,
    );
    expect(storage.calls).toHaveLength(0);
  });

  describe('compensación y concurrencia', () => {
    it('si no se puede guardar la fila de la causa, borra la carpeta recién creada y relanza el error', async () => {
      const { assureSpace, storage, folders } = await aSetUpStudio();
      const realSave = folders.save.bind(folders);
      folders.save = async (folder) => {
        if (folder.key.kind === 'CASE') {
          throw new Error('db down');
        }
        return realSave(folder);
      };

      await expect(assureSpace.execute(aCommand())).rejects.toThrow('db down');

      const caseFolder = storage.calls
        .filter((c) => c.method === 'createFolder')
        .map((c) => c.reference.name)
        .at(-1);
      expect(caseFolder).toBe('GÓMEZ, Ariel Fernando p.s.a. Robo calificado');
      expect(storage.deletedFolderIds).toHaveLength(1);
      expect(storage.folders.map((f) => f.name)).not.toContain(caseFolder);
    });

    it('si borrar la carpeta también falla, relanza el error del guardado y no el del borrado', async () => {
      const { assureSpace, storage, folders } = await aSetUpStudio();
      const realSave = folders.save.bind(folders);
      folders.save = async (folder) => {
        if (folder.key.kind === 'CASE') {
          storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'delete failed'));
          throw new Error('db down');
        }
        return realSave(folder);
      };

      await expect(assureSpace.execute(aCommand())).rejects.toThrow('db down');
    });

    it('no borra una carpeta de abogado que adoptó, porque no la creó este pedido', async () => {
      const { assureSpace, storage, folders, rootCasesId } = await aSetUpStudio();
      const orphan = storage.seed(rootCasesId, 'Ríos, Malena');
      const realSave = folders.save.bind(folders);
      folders.save = async (folder) => {
        if (folder.key.kind === 'JURISDICTION') {
          throw new Error('db down');
        }
        return realSave(folder);
      };

      await expect(assureSpace.execute(aCommand())).rejects.toThrow('db down');

      expect(storage.deletedFolderIds).not.toContain(orphan.id);
      expect(storage.folders.map((f) => f.id)).toContain(orphan.id);
    });

    it('el pedido que pierde la carrera borra su carpeta duplicada y usa la ganadora', async () => {
      const { assureSpace, storage, folders } = await aSetUpStudio();
      const realSave = folders.save.bind(folders);
      let raced = false;
      folders.save = async (folder) => {
        if (folder.key.kind === 'LAWYER' && !raced) {
          raced = true;
          await realSave(
            CloudFolderFactory.create({
              kind: 'LAWYER',
              cloudFolderId: 'winner',
              name: 'Ríos, Malena',
              url: 'https://storage.invalid/winner',
              parentCloudFolderId: folder.parentCloudFolderId,
              lawyerId: 3,
              createdAt: folder.createdAt,
            }),
          );
          throw new CloudFolderAlreadyExistsError();
        }
        return realSave(folder);
      };

      await assureSpace.execute(aCommand());

      expect(storage.deletedFolderIds).toHaveLength(1);
      expect(folders.all().filter((f) => f.key.kind === 'LAWYER')).toHaveLength(1);
    });

    it('dos causas del mismo abogado y fuero pedidas a la vez comparten las carpetas intermedias', async () => {
      const { assureSpace, storage } = await aSetUpStudio();

      await Promise.all([
        assureSpace.execute(aCommand({ caseId: 10, caseCaption: 'UNO' })),
        assureSpace.execute(aCommand({ caseId: 11, caseCaption: 'DOS' })),
      ]);

      expect(storage.folders.filter((f) => f.name === 'Ríos, Malena')).toHaveLength(1);
      expect(storage.folders.filter((f) => f.name === 'Penal')).toHaveLength(1);
      expect(storage.deletedFolderIds).toHaveLength(0);
    });
  });

  describe('eventos', () => {
    it('publica DocumentSpaceAssigned con los datos de la carpeta', async () => {
      const { assureSpace, events } = await aSetUpStudio();

      const result = await assureSpace.execute(aCommand({ causedByEventId: 'evt-1' }));

      const [assigned] = events.ofType<DocumentSpaceAssignedEvent>(DOCUMENT_SPACE_ASSIGNED);
      expect(events.published).toHaveLength(1);
      expect(assigned).toMatchObject({
        type: DOCUMENT_SPACE_ASSIGNED,
        caseId: 10,
        cloudFolderId: result.cloudFolderId,
        url: result.url,
        path: result.path,
        causedByEventId: 'evt-1',
        occurredAt: '2026-10-17T12:00:00.000Z',
      });
      expect(assigned.eventId).toBeTruthy();
    });

    it('también lo publica cuando la carpeta ya existía (repetición idempotente)', async () => {
      const { assureSpace, events } = await aSetUpStudio();
      const first = await assureSpace.execute(aCommand());

      await assureSpace.execute(aCommand());

      const assigned = events.ofType<DocumentSpaceAssignedEvent>(DOCUMENT_SPACE_ASSIGNED);
      expect(assigned).toHaveLength(2);
      expect(assigned[1].cloudFolderId).toBe(first.cloudFolderId);
      expect(assigned[0].eventId).not.toBe(assigned[1].eventId);
    });

    it('publica DocumentSpaceCreationFailed y relanza el error, sin publicar Assigned', async () => {
      const { assureSpace, storage, events } = await aSetUpStudio();
      storage.failNextWith(new DocumentStorageUnavailableError('AUTHORIZATION', 'invalid_grant'));

      await expect(
        assureSpace.execute(aCommand({ causedByEventId: 'evt-2' })),
      ).rejects.toBeInstanceOf(DocumentStorageUnavailableError);

      expect(events.ofType(DOCUMENT_SPACE_ASSIGNED)).toHaveLength(0);
      const [failed] = events.ofType<DocumentSpaceCreationFailedEvent>(
        DOCUMENT_SPACE_CREATION_FAILED,
      );
      expect(failed).toMatchObject({ caseId: 10, reason: 'AUTHORIZATION', causedByEventId: 'evt-2' });
      expect(failed.detail).toBeTruthy();
    });

    it('clasifica una carátula inválida como INVALID_DATA', async () => {
      const { assureSpace, events } = await aSetUpStudio();

      await expect(assureSpace.execute(aCommand({ caseCaption: '///' }))).rejects.toBeInstanceOf(
        InvalidCloudFolderError,
      );

      const [failed] = events.ofType<DocumentSpaceCreationFailedEvent>(
        DOCUMENT_SPACE_CREATION_FAILED,
      );
      expect(failed.reason).toBe('INVALID_DATA');
    });
  });
});
