import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ForbiddenActionError } from '@shared/domain/domain-error';
import {
  CaseDocumentDownloadUnavailableError,
  CaseFolderReadUnavailableError,
  DocumentNotFoundError,
  DocumentStorageUnavailableError,
} from '../../domain/errors/documents.errors';
import { FakeCaseFileRepository } from '../../test-support/fake-case-file.repository';
import { InMemoryDocumentStorage } from '../../../infrastructure/storage/in-memory/in-memory-document-storage';
import { DownloadFolderDocument } from './download-folder-document.use-case';
import { ListFolderDocuments } from './list-folder-documents.use-case';

/* HU38 · Los documentos de la carpeta de una causa: lista y descarga (lo que `cases` le pide a `documents`). */

const FOLDER = 'folder-ref';
const READ_MESSAGE = 'No se pudo leer la carpeta de la causa en Drive. Intentá de nuevo en unos minutos.';
const DOWNLOAD_MESSAGE = 'No se pudo descargar el documento de Drive. Intentá de nuevo en unos minutos.';

const actor = (roleNames: string[]): AuthenticatedUser => ({ userId: 1, roleNames, lawyerId: null, permissions: [] });
const ADMIN = actor(['ADMINISTRATOR']);
const LAWYER = actor(['LAWYER']);

let storage: InMemoryDocumentStorage;
let caseFiles: FakeCaseFileRepository;

beforeEach(() => {
  storage = new InMemoryDocumentStorage();
  caseFiles = new FakeCaseFileRepository();
  const at = new Date('2026-09-09T15:15:00Z');
  storage.seedFile({ id: 'doc-cedula', parentId: FOLDER, name: 'Cédula.pdf', mimeType: 'application/pdf', createdAt: at });
  storage.seedFile({ id: 'doc-escrito', parentId: FOLDER, name: 'Escrito', mimeType: 'application/vnd.google-apps.document', createdAt: at });
  storage.seedFile({ id: 'doc-expediente', parentId: FOLDER, name: 'Expediente_v1.pdf', mimeType: 'application/pdf', createdAt: at });
  storage.seedFile({ id: 'doc-ajeno', parentId: 'folder-otra', name: 'Ajeno.pdf', mimeType: 'application/pdf', createdAt: at });
  caseFiles.add('doc-expediente', { id: 4, version: 1 });
});

describe('ListFolderDocuments', () => {
  const list = () => new ListFolderDocuments(storage, caseFiles).execute({ folderId: FOLDER });

  it('marca como expediente sólo los archivos con fila en case_files (CA-38.4)', async () => {
    const documents = await list();

    expect(documents.map((d) => [d.id, d.caseFile])).toEqual([
      ['doc-cedula', null],
      ['doc-escrito', null],
      ['doc-expediente', { id: 4, version: 1 }],
    ]);
  });

  it('si Drive no responde, falla con el mensaje de lectura (CA-38.6)', async () => {
    storage.failNextWith(new DocumentStorageUnavailableError());

    const attempt = list();

    await expect(attempt).rejects.toBeInstanceOf(CaseFolderReadUnavailableError);
    await expect(attempt).rejects.toThrow(READ_MESSAGE);
  });
});

describe('DownloadFolderDocument', () => {
  const download = (documentId: string, who: AuthenticatedUser = LAWYER) =>
    new DownloadFolderDocument(storage, caseFiles).execute({ folderId: FOLDER, documentId, actor: who });

  it('el administrador no descarga un documento común, y Drive ni se consulta (D-103)', async () => {
    await expect(download('doc-cedula', ADMIN)).rejects.toBeInstanceOf(ForbiddenActionError);
    expect(storage.fileCalls).toEqual([]);
  });

  it('el administrador sí descarga un expediente (CA-38.7)', async () => {
    const file = await download('doc-expediente', ADMIN);

    expect(file).toEqual({ fileName: 'Expediente_v1.pdf', mimeType: 'application/pdf', content: expect.any(Buffer) });
  });

  it('un documento que no existe es 404 (CA-38.8)', async () => {
    await expect(download('no-existe')).rejects.toBeInstanceOf(DocumentNotFoundError);
  });

  it('un documento de otra carpeta es 404, y no se descarga (CA-38.8)', async () => {
    await expect(download('doc-ajeno')).rejects.toBeInstanceOf(DocumentNotFoundError);
    expect(storage.fileCalls).toEqual([{ method: 'findFile', fileId: 'doc-ajeno' }]);
  });

  it('un común se baja tal cual; un nativo se exporta a PDF y gana ".pdf" (CA-38.7)', async () => {
    const common = await download('doc-cedula');
    const native = await download('doc-escrito');

    expect(common).toEqual({ fileName: 'Cédula.pdf', mimeType: 'application/pdf', content: Buffer.from('contenido de Cédula.pdf') });
    expect(native).toMatchObject({ fileName: 'Escrito.pdf', mimeType: 'application/pdf' });
    expect(storage.fileCalls.filter((call) => call.method !== 'findFile')).toEqual([
      { method: 'downloadFile', fileId: 'doc-cedula' },
      { method: 'exportFile', fileId: 'doc-escrito' },
    ]);
  });

  it('si Drive no responde, falla con el mensaje de descarga (CA-38.6)', async () => {
    storage.failNextWith(new DocumentStorageUnavailableError());

    const attempt = download('doc-cedula');

    await expect(attempt).rejects.toBeInstanceOf(CaseDocumentDownloadUnavailableError);
    await expect(attempt).rejects.toThrow(DOWNLOAD_MESSAGE);
  });
});
