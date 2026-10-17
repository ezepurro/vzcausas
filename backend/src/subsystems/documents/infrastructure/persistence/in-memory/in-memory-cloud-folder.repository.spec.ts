import { CloudFolderAlreadyExistsError } from '../../../core/domain/errors/documents.errors';
import { CloudFolderFactory } from '../../../core/domain/factories/cloud-folder.factory';
import { FolderKey } from '../../../core/domain/value-objects/folder-key.vo';
import { InMemoryCloudFolderRepository } from './in-memory-cloud-folder.repository';

const base = {
  url: 'https://storage.invalid/x',
  parentCloudFolderId: 'root',
  createdAt: new Date('2026-10-17T12:00:00Z'),
};

describe('InMemoryCloudFolderRepository', () => {
  let repo: InMemoryCloudFolderRepository;

  beforeEach(() => {
    repo = new InMemoryCloudFolderRepository();
  });

  it('encuentra cada carpeta por su clave natural y por su id', async () => {
    const lawyer = CloudFolderFactory.create({ ...base, kind: 'LAWYER', cloudFolderId: 'l-3', name: 'Ríos', lawyerId: 3 });
    const jurisdiction = CloudFolderFactory.create({ ...base, kind: 'JURISDICTION', cloudFolderId: 'j-3-1', name: 'Penal', lawyerId: 3, jurisdictionId: 1 });
    const templates = CloudFolderFactory.create({ ...base, kind: 'JURISDICTION', cloudFolderId: 'j-t-1', name: 'Penal', jurisdictionId: 1 });
    const caseFolder = CloudFolderFactory.create({ ...base, kind: 'CASE', cloudFolderId: 'c-10', name: 'GARCÍA', caseId: 10 });
    const rootCases = CloudFolderFactory.create({ ...base, kind: 'ROOT_CASES', cloudFolderId: 'rc', name: 'Causas' });
    for (const folder of [lawyer, jurisdiction, templates, caseFolder, rootCases]) {
      await repo.save(folder);
    }

    expect(await repo.findByKey(FolderKey.lawyer(3))).toBe(lawyer);
    expect(await repo.findByKey(FolderKey.jurisdiction(3, 1))).toBe(jurisdiction);
    expect(await repo.findByKey(FolderKey.jurisdiction(null, 1))).toBe(templates);
    expect(await repo.findByKey(FolderKey.forCase(10))).toBe(caseFolder);
    expect(await repo.findByKey(FolderKey.rootCases())).toBe(rootCases);
    expect(await repo.findById('c-10')).toBe(caseFolder);
  });

  it('devuelve null si no existe', async () => {
    expect(await repo.findByKey(FolderKey.forCase(99))).toBeNull();
    expect(await repo.findByKey(FolderKey.main())).toBeNull();
    expect(await repo.findById('nope')).toBeNull();
  });

  it('rechaza dos carpetas con la misma clave natural', async () => {
    await repo.save(CloudFolderFactory.create({ ...base, kind: 'LAWYER', cloudFolderId: 'a', name: 'Ríos', lawyerId: 3 }));

    await expect(
      repo.save(CloudFolderFactory.create({ ...base, kind: 'LAWYER', cloudFolderId: 'b', name: 'Ríos', lawyerId: 3 })),
    ).rejects.toBeInstanceOf(CloudFolderAlreadyExistsError);
    expect(repo.all()).toHaveLength(1);
  });

  it('rechaza dos carpetas con el mismo id de proveedor', async () => {
    await repo.save(CloudFolderFactory.create({ ...base, kind: 'LAWYER', cloudFolderId: 'a', name: 'Ríos', lawyerId: 3 }));

    await expect(
      repo.save(CloudFolderFactory.create({ ...base, kind: 'LAWYER', cloudFolderId: 'a', name: 'Pérez', lawyerId: 4 })),
    ).rejects.toBeInstanceOf(CloudFolderAlreadyExistsError);
  });

  it('permite al mismo abogado el mismo fuero solo una vez, y otro fuero aparte', async () => {
    await repo.save(CloudFolderFactory.create({ ...base, kind: 'JURISDICTION', cloudFolderId: 'a', name: 'Penal', lawyerId: 3, jurisdictionId: 1 }));
    await repo.save(CloudFolderFactory.create({ ...base, kind: 'JURISDICTION', cloudFolderId: 'b', name: 'Civil', lawyerId: 3, jurisdictionId: 2 }));

    await expect(
      repo.save(CloudFolderFactory.create({ ...base, kind: 'JURISDICTION', cloudFolderId: 'c', name: 'Penal', lawyerId: 3, jurisdictionId: 1 })),
    ).rejects.toBeInstanceOf(CloudFolderAlreadyExistsError);
  });
});
