import { CaseFolder } from '../entities/case-folder.entity';
import { JurisdictionFolder } from '../entities/jurisdiction-folder.entity';
import { LawyerFolder } from '../entities/lawyer-folder.entity';
import { MainFolder } from '../entities/main-folder.entity';
import { RootCasesFolder } from '../entities/root-cases-folder.entity';
import { TemplatesFolder } from '../entities/templates-folder.entity';
import { UnassignedFolder } from '../entities/unassigned-folder.entity';
import { UnassignedJurisdictionFolder } from '../entities/unassigned-jurisdiction-folder.entity';
import { InvalidCloudFolderError } from '../errors/documents.errors';
import { CLOUD_FOLDER_KINDS } from '../value-objects/cloud-folder-kind';
import { CloudFolderData, CloudFolderFactory } from './cloud-folder.factory';

const base = {
  cloudFolderId: 'f-1',
  name: 'Carpeta',
  url: 'https://storage.invalid/f-1',
  parentCloudFolderId: 'parent',
  createdAt: new Date('2026-10-17T12:00:00Z'),
};

describe('CloudFolderFactory', () => {
  it('construye la subclase que corresponde a cada tipo', () => {
    expect(CloudFolderFactory.create({ ...base, kind: 'MAIN', parentCloudFolderId: null })).toBeInstanceOf(MainFolder);
    expect(CloudFolderFactory.create({ ...base, kind: 'TEMPLATES' })).toBeInstanceOf(TemplatesFolder);
    expect(CloudFolderFactory.create({ ...base, kind: 'ROOT_CASES' })).toBeInstanceOf(RootCasesFolder);
    expect(CloudFolderFactory.create({ ...base, kind: 'LAWYER', lawyerId: 3 })).toBeInstanceOf(LawyerFolder);
    expect(
      CloudFolderFactory.create({ ...base, kind: 'JURISDICTION', lawyerId: 3, jurisdictionId: 1 }),
    ).toBeInstanceOf(JurisdictionFolder);
    expect(
      CloudFolderFactory.create({ ...base, kind: 'CASE', lawyerId: 3, jurisdictionId: 1, caseId: 10 }),
    ).toBeInstanceOf(CaseFolder);
  });

  it('cada tipo informa su kind y los ocho tipos están cubiertos', () => {
    const inputs: CloudFolderData[] = [
      { ...base, kind: 'MAIN', parentCloudFolderId: null },
      { ...base, kind: 'TEMPLATES' },
      { ...base, kind: 'ROOT_CASES' },
      { ...base, kind: 'LAWYER', lawyerId: 3 },
      { ...base, kind: 'JURISDICTION', jurisdictionId: 1 },
      { ...base, kind: 'CASE', lawyerId: 3, jurisdictionId: 1, caseId: 10 },
      { ...base, kind: 'UNASSIGNED' },
      { ...base, kind: 'UNASSIGNED_JURISDICTION', jurisdictionId: 1 },
    ];
    expect(inputs.map((i) => CloudFolderFactory.create(i).key.kind)).toEqual([...CLOUD_FOLDER_KINDS]);
  });

  it('expone la clave natural de cada carpeta', () => {
    const lawyer = CloudFolderFactory.create({ ...base, kind: 'LAWYER', lawyerId: 3 });
    const templatesJurisdiction = CloudFolderFactory.create({ ...base, kind: 'JURISDICTION', jurisdictionId: 1 });
    const caseFolder = CloudFolderFactory.create({ ...base, kind: 'CASE', lawyerId: 3, jurisdictionId: 1, caseId: 10 });

    expect(lawyer.key).toEqual({ kind: 'LAWYER', lawyerId: 3 });
    expect(templatesJurisdiction.key).toEqual({ kind: 'JURISDICTION', lawyerId: null, jurisdictionId: 1 });
    expect(caseFolder.key).toEqual({ kind: 'CASE', caseId: 10 });
  });

  it.each<[string, CloudFolderData]>([
    ['MAIN con padre', { ...base, kind: 'MAIN' }],
    ['TEMPLATES sin padre', { ...base, kind: 'TEMPLATES', parentCloudFolderId: null }],
    ['ROOT_CASES sin padre', { ...base, kind: 'ROOT_CASES', parentCloudFolderId: null }],
    ['LAWYER sin abogado', { ...base, kind: 'LAWYER' }],
    ['JURISDICTION sin fuero', { ...base, kind: 'JURISDICTION', lawyerId: 3 }],
    ['CASE sin causa', { ...base, kind: 'CASE', lawyerId: 3, jurisdictionId: 1 }],
    ['CASE sin fuero', { ...base, kind: 'CASE', lawyerId: 3, caseId: 10 }],
    ['UNASSIGNED sin padre', { ...base, kind: 'UNASSIGNED', parentCloudFolderId: null }],
    ['UNASSIGNED_JURISDICTION sin fuero', { ...base, kind: 'UNASSIGNED_JURISDICTION' }],
    ['sin id de proveedor', { ...base, kind: 'TEMPLATES', cloudFolderId: ' ' }],
    ['sin nombre', { ...base, kind: 'TEMPLATES', name: '' }],
  ])('rechaza %s', (_label, data) => {
    expect(() => CloudFolderFactory.create(data)).toThrow(InvalidCloudFolderError);
  });

  // D-143: Causas/Sin asignar, el fuero debajo de ella y la carpeta de una causa huérfana.
  it('construye las carpetas de Sin asignar y su clave natural; la causa huérfana no tiene abogado', () => {
    const unassigned = CloudFolderFactory.create({ ...base, kind: 'UNASSIGNED' });
    const jurisdiction = CloudFolderFactory.create({ ...base, kind: 'UNASSIGNED_JURISDICTION', jurisdictionId: 1 });
    const orphanCase = CloudFolderFactory.create({ ...base, kind: 'CASE', lawyerId: null, jurisdictionId: 1, caseId: 10 });

    expect(unassigned).toBeInstanceOf(UnassignedFolder);
    expect(unassigned.key).toEqual({ kind: 'UNASSIGNED' });
    expect(jurisdiction).toBeInstanceOf(UnassignedJurisdictionFolder);
    expect(jurisdiction.key).toEqual({ kind: 'UNASSIGNED_JURISDICTION', jurisdictionId: 1 });
    expect(jurisdiction.lawyerId).toBeNull();
    expect(orphanCase).toBeInstanceOf(CaseFolder);
    expect(orphanCase.lawyerId).toBeNull();
  });

  it('rechaza una carpeta de causa sin causa', () => {
    expect(() =>
      CloudFolderFactory.hydrate({ ...base, kind: 'CASE', lawyerId: 3, jurisdictionId: 1, caseId: null }),
    ).toThrow(InvalidCloudFolderError);
  });
});
