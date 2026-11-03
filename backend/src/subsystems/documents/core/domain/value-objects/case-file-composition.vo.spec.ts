import { CaseDocument } from '../entities/case-document.entity';
import { CaseFileDocumentsInvalidError, DocumentNotConvertibleError } from '../errors/documents.errors';
import { StoredDocument } from '../ports/document-storage.port';
import { CaseFileComposition } from './case-file-composition.vo';

/* HU25 · Qué lleva el expediente: la carátula y los documentos elegidos, en orden. */

const FOLDER = 'folder-ref';

const doc = (id: string, overrides: Partial<StoredDocument> = {}, caseFile: { id: number; version: number } | null = null) =>
  CaseDocument.fromStorage(
    {
      id,
      name: `${id}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 1,
      createdAt: new Date('2026-09-01T12:00:00Z'),
      modifiedAt: new Date('2026-09-01T12:00:00Z'),
      uploadedBy: null,
      url: `https://drive/${id}`,
      parentIds: [FOLDER],
      ...overrides,
    },
    caseFile,
  );

const found = (...documents: CaseDocument[]) => new Map(documents.map((document) => [document.id, document]));

describe('CaseFileComposition', () => {
  it('lleva los documentos en el orden pedido y la carátula primero en las partes (CA-25.1, CA-25.9)', () => {
    const composition = CaseFileComposition.create({
      folderId: FOLDER,
      documentIds: ['b', 'a'],
      found: found(doc('a'), doc('b', { name: 'Escrito', mimeType: 'application/vnd.google-apps.document' })),
    });

    expect(composition.documents.map((d) => d.id)).toEqual(['b', 'a']);
    expect(composition.parts()).toEqual([
      { position: 1, kind: 'COVER', documentId: null, name: 'Carátula' },
      { position: 2, kind: 'DOCUMENT', documentId: 'b', name: 'Escrito' },
      { position: 3, kind: 'DOCUMENT', documentId: 'a', name: 'a.pdf' },
    ]);
  });

  it.each([
    ['inexistente', found(doc('a'))],
    ['de otra carpeta', found(doc('a'), doc('x', { parentIds: ['folder-otra'] }))],
    ['un expediente anterior', found(doc('a'), doc('x', {}, { id: 4, version: 1 }))],
  ])('un documento %s responde 400 documentIds (CA-25.3)', (_label, documents) => {
    const attempt = () => CaseFileComposition.create({ folderId: FOLDER, documentIds: ['a', 'x'], found: documents });

    expect(attempt).toThrow(CaseFileDocumentsInvalidError);
    expect(attempt).toThrow(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        details: { documentIds: 'Un documento no está en la carpeta de la causa o es un expediente anterior.' },
      }),
    );
  });

  it('un documento que no se puede convertir responde 422 (CA-25.4)', () => {
    const attempt = () =>
      CaseFileComposition.create({
        folderId: FOLDER,
        documentIds: ['a', 'hoja'],
        found: found(doc('a'), doc('hoja', { mimeType: 'application/vnd.google-apps.spreadsheet' })),
      });

    expect(attempt).toThrow(DocumentNotConvertibleError);
  });

  it('con uno fuera de la carpeta y otro no convertible gana el 400 (orden acordado)', () => {
    const attempt = () =>
      CaseFileComposition.create({
        folderId: FOLDER,
        documentIds: ['hoja', 'ajeno'],
        found: found(
          doc('hoja', { mimeType: 'application/vnd.google-apps.spreadsheet' }),
          doc('ajeno', { parentIds: ['folder-otra'] }),
        ),
      });

    expect(attempt).toThrow(CaseFileDocumentsInvalidError);
  });
});
