import { DocumentStorageUnavailableError } from '../../core/domain/errors/documents.errors';
import { aSetUpStudio } from '../../core/test-support/document-fixtures';
import { CasesCaseFolderAdapter } from './cases-case-folder.adapter';

const request = {
  caseId: 10,
  caption: 'GÓMEZ, Ariel p.s.a. Robo',
  lawyer: { id: 3, lastName: 'Ríos', firstName: 'Malena' },
  jurisdiction: { id: 1, label: 'Penal' },
};

describe('CasesCaseFolderAdapter', () => {
  it('traduce el pedido de cases y devuelve solo id y enlace de la carpeta', async () => {
    const { assureSpace, storage } = await aSetUpStudio();
    const adapter = new CasesCaseFolderAdapter(assureSpace);

    const ref = await adapter.ensureCaseFolder(request);

    expect(Object.keys(ref).sort()).toEqual(['cloudFolderId', 'url']);
    expect(storage.folders.map((f) => f.name)).toContain('Ríos, Malena');
    expect(storage.folders.at(-1)!.name).toBe('GÓMEZ, Ariel p.s.a. Robo');
  });

  it('pedirla dos veces devuelve la misma carpeta', async () => {
    const { assureSpace } = await aSetUpStudio();
    const adapter = new CasesCaseFolderAdapter(assureSpace);

    expect(await adapter.ensureCaseFolder(request)).toEqual(await adapter.ensureCaseFolder(request));
  });

  it('deja pasar el error de storage para que cases deje la carpeta pendiente', async () => {
    const { assureSpace, storage } = await aSetUpStudio();
    storage.failNextWith(new DocumentStorageUnavailableError());
    const adapter = new CasesCaseFolderAdapter(assureSpace);

    await expect(adapter.ensureCaseFolder(request)).rejects.toBeInstanceOf(
      DocumentStorageUnavailableError,
    );
  });
});
