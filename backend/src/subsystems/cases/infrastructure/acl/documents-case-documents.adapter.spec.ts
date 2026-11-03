import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { DownloadFolderDocument } from '@subsystems/documents/core/application/use-cases/download-folder-document.use-case';
import { GenerateCaseFile } from '@subsystems/documents/core/application/use-cases/generate-case-file.use-case';
import {
  FolderDocumentResult,
  ListFolderDocuments,
} from '@subsystems/documents/core/application/use-cases/list-folder-documents.use-case';
import { DocumentsCaseDocumentsAdapter } from './documents-case-documents.adapter';

const RESULT: FolderDocumentResult = {
  id: 'doc-1',
  name: 'Expediente_13284571_v1.pdf',
  extension: 'pdf',
  mimeType: 'application/pdf',
  sizeBytes: 768000,
  createdAt: new Date('2026-08-20T12:30:00Z'),
  modifiedAt: new Date('2026-08-21T12:30:00Z'),
  uploadedBy: 'VZ Causas',
  url: 'https://drive/doc-1',
  convertibleToPdf: true,
  caseFile: { id: 4, version: 1 },
};
const ACTOR: AuthenticatedUser = { userId: 1, roleNames: ['ADMINISTRATOR'], lawyerId: null, permissions: [] };

describe('DocumentsCaseDocumentsAdapter', () => {
  const list = { execute: jest.fn().mockResolvedValue([RESULT]) };
  const download = {
    execute: jest.fn().mockResolvedValue({ fileName: 'a.pdf', mimeType: 'application/pdf', content: Buffer.from('a') }),
  };
  const generatedAt = new Date('2026-10-06T15:30:00Z');
  const generate = {
    execute: jest.fn().mockResolvedValue({
      document: RESULT,
      version: 1,
      pageCount: 6,
      parts: [{ position: 1, kind: 'COVER', documentId: null, name: 'Carátula' }],
      generatedBy: { id: 5, lastName: 'Estudio', firstName: 'Gestión' },
      generatedAt,
    }),
  };
  const adapter = new DocumentsCaseDocumentsAdapter(
    list as unknown as ListFolderDocuments,
    download as unknown as DownloadFolderDocument,
    generate as unknown as GenerateCaseFile,
  );

  it('pide los documentos de la carpeta y los traduce campo por campo', async () => {
    const documents = await adapter.list('folder-ref');

    expect(list.execute).toHaveBeenCalledWith({ folderId: 'folder-ref' });
    expect(documents).toEqual([RESULT]);
  });

  it('pide el archivo con la carpeta, el documento y el actor', async () => {
    const file = await adapter.download('folder-ref', 'doc-1', ACTOR);

    expect(download.execute).toHaveBeenCalledWith({ folderId: 'folder-ref', documentId: 'doc-1', actor: ACTOR });
    expect(file).toEqual({ fileName: 'a.pdf', mimeType: 'application/pdf', content: Buffer.from('a') });
  });

  it('genera el expediente con el id del actor y traduce el resultado campo por campo (HU25)', async () => {
    const cover = Buffer.from('%PDF');

    const result = await adapter.generateCaseFile({
      caseId: 7,
      sacNumber: '13284571',
      cloudFolderId: 'folder-ref',
      coverPdf: cover,
      documentIds: ['doc-1'],
      actor: ACTOR,
    });

    expect(generate.execute).toHaveBeenCalledWith({
      caseId: 7,
      sacNumber: '13284571',
      folderId: 'folder-ref',
      coverPdf: cover,
      documentIds: ['doc-1'],
      generatedByUserId: ACTOR.userId,
    });
    expect(result).toEqual({
      document: RESULT,
      version: 1,
      pageCount: 6,
      parts: [{ position: 1, kind: 'COVER', documentId: null, name: 'Carátula' }],
      generatedBy: { id: 5, lastName: 'Estudio', firstName: 'Gestión' },
      generatedAt,
    });
  });
});
