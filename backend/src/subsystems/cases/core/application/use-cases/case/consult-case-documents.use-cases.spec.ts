import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CaseDocumentNotFoundError, CaseNotFoundError } from '../../../domain/errors/case.errors';
import { CaseDocumentFile, CaseDocumentItem, CaseDocumentsPort } from '../../../domain/ports/case/case-documents.port';
import { FakeClock } from '../../../test-support/case-fakes';
import { FakeCaseFolderState } from '../../../test-support/case-folder-fakes';
import { DownloadCaseDocument } from './download-case-document.use-case';
import { ListCaseDocuments } from './list-case-documents.use-case';

/* HU38 · Documentos de la causa: lo que decide `cases` antes de pedirle algo a `documents`. */

const CASE_ID = 7;
const NOW = new Date('2026-10-06T15:30:00Z');
const ACTOR: AuthenticatedUser = { userId: 1, roleNames: ['LAWYER'], lawyerId: 3, permissions: [] };

const ITEM: CaseDocumentItem = {
  id: 'doc-1',
  name: 'Cédula.pdf',
  extension: 'pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1,
  createdAt: new Date('2026-09-09T15:15:00Z'),
  modifiedAt: new Date('2026-09-09T15:15:00Z'),
  uploadedBy: null,
  url: 'https://drive/doc-1',
  convertibleToPdf: true,
  caseFile: null,
};
const FILE: CaseDocumentFile = { fileName: 'Cédula.pdf', mimeType: 'application/pdf', content: Buffer.from('pdf') };

/** Records what `cases` asks `documents`, and answers with fixed data. */
class RecordingCaseDocuments implements CaseDocumentsPort {
  listed: string[] = [];
  downloaded: Array<{ cloudFolderId: string; documentId: string; actor: AuthenticatedUser }> = [];

  async list(cloudFolderId: string): Promise<CaseDocumentItem[]> {
    this.listed.push(cloudFolderId);
    return [ITEM];
  }

  async download(cloudFolderId: string, documentId: string, actor: AuthenticatedUser): Promise<CaseDocumentFile> {
    this.downloaded.push({ cloudFolderId, documentId, actor });
    return FILE;
  }

  async generateCaseFile(): Promise<never> {
    throw new Error('No se usa en este spec.');
  }
}

let folders: FakeCaseFolderState;
let documents: RecordingCaseDocuments;

beforeEach(() => {
  folders = new FakeCaseFolderState();
  documents = new RecordingCaseDocuments();
});

describe('ListCaseDocuments', () => {
  const list = () => new ListCaseDocuments(folders, documents, new FakeClock(NOW, NOW)).execute({ caseId: CASE_ID });

  it('una causa inexistente o dada de baja es 404, sin pedirle nada a documents (CA-38.9)', async () => {
    folders.remove(CASE_ID);

    await expect(list()).rejects.toBeInstanceOf(CaseNotFoundError);
    expect(documents.listed).toEqual([]);
  });

  it.each([['PENDING'], ['CREATING'], ['ERROR'], [null]] as const)(
    'con la carpeta en %s no se lee nada (CA-38.5)',
    async (status) => {
      folders.set(CASE_ID, status);

      const listing = await list();

      expect(listing).toMatchObject({ folderStatus: status, folderUrl: null, readAt: null, documents: [] });
      expect(documents.listed).toEqual([]);
    },
  );

  it('con la carpeta creada lee sus documentos y fija la hora de lectura (CA-38.2)', async () => {
    await folders.markCreated(CASE_ID, 'folder-ref');

    const listing = await list();

    expect(documents.listed).toEqual(['folder-ref']);
    expect(listing).toMatchObject({ folderStatus: 'CREATED', readAt: NOW, documents: [ITEM] });
  });
});

describe('DownloadCaseDocument', () => {
  const download = () =>
    new DownloadCaseDocument(folders, documents).execute({ caseId: CASE_ID, documentId: 'doc-1', actor: ACTOR });

  it('una causa inexistente o dada de baja es 404 de la causa, sin pedirle nada a documents (CA-38.9)', async () => {
    folders.remove(CASE_ID);

    await expect(download()).rejects.toBeInstanceOf(CaseNotFoundError);
    expect(documents.downloaded).toEqual([]);
  });

  it('con la carpeta sin crear el documento no existe (CA-38.5, CA-38.8)', async () => {
    folders.set(CASE_ID, 'PENDING');

    const attempt = download();

    await expect(attempt).rejects.toBeInstanceOf(CaseDocumentNotFoundError);
    await expect(attempt).rejects.toMatchObject({ code: 'DOCUMENT_NOT_FOUND' });
    expect(documents.downloaded).toEqual([]);
  });

  it('con la carpeta creada le pasa a documents la carpeta, el documento y el actor, y devuelve su archivo', async () => {
    await folders.markCreated(CASE_ID, 'folder-ref');

    const file = await download();

    expect(documents.downloaded).toEqual([{ cloudFolderId: 'folder-ref', documentId: 'doc-1', actor: ACTOR }]);
    expect(file).toBe(FILE);
  });
});
