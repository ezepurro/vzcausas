import { InvalidCloudFolderError } from '../errors/documents.errors';
import { CaseFolder } from './case-folder.entity';

function aCaseFolder(): CaseFolder {
  return new CaseFolder({
    cloudFolderId: 'f-1',
    name: 'Carátula vieja',
    url: 'https://drive/f-1',
    parentCloudFolderId: 'jurisdiction-3',
    createdAt: new Date('2026-10-17T12:00:00.000Z'),
    caseId: 10,
    lawyerId: 3,
    jurisdictionId: 1,
  });
}

describe('CaseFolder (HU19)', () => {
  it('rename cambia solo el nombre', () => {
    const folder = aCaseFolder();

    folder.rename('Carátula nueva');

    expect(folder).toMatchObject({ name: 'Carátula nueva', cloudFolderId: 'f-1', parentCloudFolderId: 'jurisdiction-3' });
    expect(folder.lawyerId).toBe(3);
  });

  it('moveUnder cambia el padre y el abogado juntos, y deja el fuero y la clave', () => {
    const folder = aCaseFolder();

    folder.moveUnder('jurisdiction-5', 5);

    expect(folder.parentCloudFolderId).toBe('jurisdiction-5');
    expect(folder.lawyerId).toBe(5);
    expect(folder.jurisdictionId).toBe(1);
    expect(folder.key).toEqual({ kind: 'CASE', caseId: 10 });
  });

  it('no acepta un nombre vacío, un padre vacío ni un abogado inválido, y no cambia nada', () => {
    const folder = aCaseFolder();

    expect(() => folder.rename('  ')).toThrow(InvalidCloudFolderError);
    expect(() => folder.moveUnder('', 5)).toThrow(InvalidCloudFolderError);
    expect(() => folder.moveUnder('jurisdiction-5', 0)).toThrow(InvalidCloudFolderError);

    expect(folder).toMatchObject({ name: 'Carátula vieja', parentCloudFolderId: 'jurisdiction-3' });
    expect(folder.lawyerId).toBe(3);
  });
});
