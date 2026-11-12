import {
  CaseFileDocumentsInvalidError,
  CaseFileStorageUnavailableError,
  DocumentNotConvertibleError,
  DocumentStorageUnavailableError,
} from '../../domain/errors/documents.errors';
import { CaseFilePdfComposer, CaseFilePdfPart, ComposedPdf } from '../../domain/ports/case-file-pdf-composer.port';
import { FakeCaseFileRepository } from '../../test-support/fake-case-file.repository';
import { FakeClock, NOW } from '../../test-support/document-fixtures';
import { InMemoryDocumentStorage } from '../../../infrastructure/storage/in-memory/in-memory-document-storage';
import { GenerateCaseFile, GenerateCaseFileCommand } from './generate-case-file.use-case';

/* HU25 · Generar el expediente: lo que hace `documents` con la carátula y los documentos elegidos. */

const FOLDER = 'folder-ref';
const COVER = Buffer.from('carátula');
const STORAGE_MESSAGE = 'No se pudo generar el expediente porque Drive no respondió. Intentá de nuevo en unos minutos.';

/** Records what it was asked to join; each part counts as one page. */
class RecordingComposer implements CaseFilePdfComposer {
  composed: CaseFilePdfPart[][] = [];

  async compose(parts: readonly CaseFilePdfPart[]): Promise<ComposedPdf> {
    this.composed.push([...parts]);
    return { content: Buffer.from('%PDF-expediente'), pageCount: parts.length };
  }
}

let storage: InMemoryDocumentStorage;
let caseFiles: FakeCaseFileRepository;
let composer: RecordingComposer;
let useCase: GenerateCaseFile;

const command = (documentIds: string[]): GenerateCaseFileCommand => ({
  caseId: 7,
  sacNumber: '13284571',
  folderId: FOLDER,
  coverPdf: COVER,
  documentIds,
  generatedByUserId: 3,
});

/** Files written to the folder that are case files, by name. */
const caseFilesInFolder = () =>
  storage.files.filter((file) => file.parentId === FOLDER && file.name.startsWith('Expediente_')).map((f) => f.name);

beforeEach(() => {
  storage = new InMemoryDocumentStorage();
  caseFiles = new FakeCaseFileRepository();
  composer = new RecordingComposer();
  useCase = new GenerateCaseFile(storage, caseFiles, composer, new FakeClock());

  const at = new Date('2026-09-01T12:00:00Z');
  const seed = (id: string, name: string, mimeType: string, parentId = FOLDER) =>
    storage.seedFile({ id, parentId, name, mimeType, content: Buffer.from(`bytes ${id}`), createdAt: at });
  seed('pdf', 'Requerimiento.pdf', 'application/pdf');
  seed('gdoc', 'Escrito', 'application/vnd.google-apps.document');
  seed('word', 'Recurso.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  seed('jpg', 'Constancia.jpg', 'image/jpeg');
  seed('hoja', 'Planilla', 'application/vnd.google-apps.spreadsheet');
  seed('ajeno', 'Ajeno.pdf', 'application/pdf', 'folder-otra');
  storage.fileCalls.length = 0;
});

describe('GenerateCaseFile', () => {
  it('lee cada documento por su vía, une con la carátula primero, sube una vez y guarda una fila (CA-25.1, 25.4, 25.9)', async () => {
    const result = await useCase.execute(command(['pdf', 'gdoc', 'word', 'jpg']));

    expect(storage.fileCalls.filter((call) => call.method !== 'findFile')).toEqual([
      { method: 'downloadFile', fileId: 'pdf' },
      { method: 'exportFile', fileId: 'gdoc' },
      { method: 'convertToPdf', fileId: 'word' },
      { method: 'downloadFile', fileId: 'jpg' },
      { method: 'uploadFile', name: 'Expediente_13284571_v1.pdf' },
    ]);
    const [parts] = composer.composed;
    expect(parts.map((part) => part.kind)).toEqual(['PDF', 'PDF', 'PDF', 'PDF', 'IMAGE']);
    expect(parts[0].content).toBe(COVER);
    expect(parts[4]).toMatchObject({ mimeType: 'image/jpeg', content: Buffer.from('bytes jpg') });

    expect(caseFiles.saved).toHaveLength(1);
    expect(caseFiles.saved[0]).toMatchObject({ caseId: 7, version: 1, pageCount: 5, generatedByUserId: 3, generatedAt: NOW });
    expect(result).toMatchObject({
      version: 1,
      pageCount: 5,
      generatedBy: { id: 3, lastName: 'Ríos', firstName: 'Malena' },
      generatedAt: NOW,
      document: {
        name: 'Expediente_13284571_v1.pdf',
        mimeType: 'application/pdf',
        caseFile: { id: 1, version: 1 },
      },
    });
    expect(result.parts.map((part) => [part.position, part.kind, part.documentId])).toEqual([
      [1, 'COVER', null],
      [2, 'DOCUMENT', 'pdf'],
      [3, 'DOCUMENT', 'gdoc'],
      [4, 'DOCUMENT', 'word'],
      [5, 'DOCUMENT', 'jpg'],
    ]);
  });

  it.each([
    ['de otra carpeta (400)', ['pdf', 'ajeno'], CaseFileDocumentsInvalidError],
    ['no convertible (422)', ['pdf', 'hoja'], DocumentNotConvertibleError],
  ])('un documento %s no baja contenido ni sube nada (CA-25.3, 25.4)', async (_label, ids, error) => {
    await expect(useCase.execute(command(ids))).rejects.toBeInstanceOf(error);

    expect(storage.fileCalls.every((call) => call.method === 'findFile')).toBe(true);
    expect(caseFiles.saved).toEqual([]);
  });

  it('si Drive falla al leer un documento, 502 y no se sube ni se guarda nada (CA-25.8)', async () => {
    storage.failNextCallTo('downloadFile', new DocumentStorageUnavailableError());

    const attempt = useCase.execute(command(['pdf']));

    await expect(attempt).rejects.toBeInstanceOf(CaseFileStorageUnavailableError);
    await expect(attempt).rejects.toThrow(STORAGE_MESSAGE);
    expect(caseFilesInFolder()).toEqual([]);
    expect(caseFiles.saved).toEqual([]);
  });

  it('si otra generación tomó la versión, borra lo subido y guarda con la siguiente (CA-25.6)', async () => {
    caseFiles.loseNextRace();

    const result = await useCase.execute(command(['pdf']));

    expect(result.version).toBe(2);
    expect(caseFilesInFolder()).toEqual(['Expediente_13284571_v2.pdf']);
    expect(storage.fileCalls.filter((call) => call.method === 'deleteFile')).toHaveLength(1);
  });

  it('si falla la lectura de lo subido, lo borra y no guarda la fila (CA-25.8)', async () => {
    const findFile = storage.findFile.bind(storage);
    jest.spyOn(storage, 'findFile').mockImplementation(async (id: string) => {
      if (id.startsWith('mem-file-')) throw new DocumentStorageUnavailableError();
      return findFile(id);
    });

    await expect(useCase.execute(command(['pdf']))).rejects.toBeInstanceOf(CaseFileStorageUnavailableError);

    expect(caseFilesInFolder()).toEqual([]);
    expect(caseFiles.saved).toEqual([]);
  });
});
