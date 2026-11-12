import { CaseDocumentItem } from '../../ports/case/case-documents.port';
import { ActiveCaseFolder } from '../../ports/case/case-folder-state.port';
import { CaseDocumentListing } from './case-document-listing.vo';

/* HU38 · La respuesta de GET /cases/{caseId}/documents (V5 §3.12). */

const CREATED: ActiveCaseFolder = { status: 'CREATED', url: 'https://drive/folder-ref', cloudFolderId: 'folder-ref' };
const READ_AT = new Date('2026-10-06T15:30:00Z');

const doc = (id: string, createdAt: string): CaseDocumentItem => ({
  id,
  name: `${id}.pdf`,
  extension: 'pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1,
  createdAt: new Date(createdAt),
  modifiedAt: new Date(createdAt),
  uploadedBy: null,
  url: `https://drive/${id}`,
  convertibleToPdf: true,
  caseFile: null,
});

describe('CaseDocumentListing', () => {
  it('sin leer: sin documentos y readAt null, con el estado y el enlace de la carpeta (CA-38.5)', () => {
    const pending = CaseDocumentListing.notRead({ status: 'PENDING', url: null, cloudFolderId: null });
    const none = CaseDocumentListing.notRead({ status: null, url: null, cloudFolderId: null });

    expect(pending).toMatchObject({ folderStatus: 'PENDING', folderUrl: null, readAt: null, documents: [] });
    expect(none.folderStatus).toBeNull();
  });

  it('leída: del más reciente al más antiguo por createdAt, con la hora de lectura (CA-38.3)', () => {
    const listing = CaseDocumentListing.read(
      CREATED,
      [doc('b', '2026-09-01T12:00:00Z'), doc('a', '2026-09-09T15:15:00Z'), doc('c', '2026-08-20T12:30:00Z')],
      READ_AT,
    );

    expect(listing.documents.map((d) => d.id)).toEqual(['a', 'b', 'c']);
    expect(listing).toMatchObject({ folderStatus: 'CREATED', folderUrl: 'https://drive/folder-ref', readAt: READ_AT });
  });

  it('dos creados en el mismo instante van por id ascendente (regla propia: el contrato no fija desempate)', () => {
    const at = '2026-09-09T15:15:00Z';

    const listing = CaseDocumentListing.read(CREATED, [doc('z', at), doc('m', at), doc('a', at)], READ_AT);

    expect(listing.documents.map((d) => d.id)).toEqual(['a', 'm', 'z']);
  });

  it('no reordena la lista que recibe', () => {
    const received = [doc('viejo', '2026-01-01T00:00:00Z'), doc('nuevo', '2026-09-01T00:00:00Z')];

    CaseDocumentListing.read(CREATED, received, READ_AT);

    expect(received.map((d) => d.id)).toEqual(['viejo', 'nuevo']);
  });
});
