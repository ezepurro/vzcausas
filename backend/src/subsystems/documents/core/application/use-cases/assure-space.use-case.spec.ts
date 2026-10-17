import { CloudFolder } from '../../domain/entities/cloud-folder.entity';
import {
  CloudFolderAlreadyExistsError,
  DocumentStorageUnavailableError,
  InvalidCloudFolderError,
  StudioRootNotConfiguredError,
} from '../../domain/errors/documents.errors';
import { CloudFolderFactory } from '../../domain/factories/cloud-folder.factory';
import { AssureSpace } from './assure-space.use-case';
import { InMemoryCloudFolderRepository } from '../../../infrastructure/persistence/in-memory/in-memory-cloud-folder.repository';
import { InMemoryDocumentStorage } from '../../../infrastructure/storage/in-memory/in-memory-document-storage';
import { FakeClock, aCommand, aSetUpStudio } from '../../test-support/document-fixtures';

describe('AssureSpace', () => {
  it('crea la cadena abogado > fuero > causa bajo la carpeta raíz de causas (CA-39.1, CA-39.3)', async () => {
    const { assureSpace, storage, folders, rootCasesId } = await aSetUpStudio();

    const result = await assureSpace.execute(aCommand());

    const created = storage.calls.filter((c) => c.method === 'create').map((c) => c.reference.name);
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

    expect(storage.calls.filter((c) => c.method === 'create')).toHaveLength(1);
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

  it('falla si la carpeta raíz de causas no está configurada (CA-39.3)', async () => {
    const folders = new InMemoryCloudFolderRepository();
    const storage = new InMemoryDocumentStorage();
    const assureSpace = new AssureSpace(folders, storage, new FakeClock());

    await expect(assureSpace.execute(aCommand())).rejects.toBeInstanceOf(
      StudioRootNotConfiguredError,
    );
    expect(storage.calls).toHaveLength(0);
  });

  it('propaga la falla del storage sin guardar carpetas de más y permite reintentar (CA-39.5)', async () => {
    const { assureSpace, storage, folders } = await aSetUpStudio();
    storage.failNextWith(new DocumentStorageUnavailableError('timeout'));

    await expect(assureSpace.execute(aCommand())).rejects.toBeInstanceOf(
      DocumentStorageUnavailableError,
    );
    expect(folders.all().map((f) => f.key.kind)).toEqual(['MAIN', 'ROOT_CASES']);

    const result = await assureSpace.execute(aCommand());
    expect(result.path).toContain('GÓMEZ');
  });

  it('si falla a mitad de la cadena, el reintento conserva lo ya creado', async () => {
    const { assureSpace, storage } = await aSetUpStudio();
    // First level: findByReference ok + create ok; fail on the jurisdiction lookup.
    let calls = 0;
    const original = storage.findByReference.bind(storage);
    storage.findByReference = async (reference) => {
      calls += 1;
      if (calls === 2) {
        throw new DocumentStorageUnavailableError('503');
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
});
