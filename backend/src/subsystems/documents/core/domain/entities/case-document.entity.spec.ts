import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ForbiddenActionError } from '@shared/domain/domain-error';
import { StoredDocument } from '../ports/document-storage.port';
import { CaseDocument } from './case-document.entity';

/* HU38 · Un archivo de la carpeta de la causa (V5 §3.12, D-102, D-103). */

const stored = (overrides: Partial<StoredDocument> = {}): StoredDocument => ({
  id: 'doc-1',
  name: 'Cédula de notificación.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 90112,
  createdAt: new Date('2026-09-09T15:15:00Z'),
  modifiedAt: new Date('2026-09-10T18:00:00Z'),
  uploadedBy: 'Gestión Estudio',
  url: 'https://drive/doc-1',
  parentIds: ['folder-ref'],
  ...overrides,
});

const actor = (roleNames: string[]): AuthenticatedUser => ({ userId: 1, roleNames, lawyerId: null, permissions: [] });

const docOf = (overrides: Partial<StoredDocument> = {}) => CaseDocument.fromStorage(stored(overrides), null);

describe('CaseDocument', () => {
  describe('extension (CA-38.4)', () => {
    it.each([
      ['Cédula.PDF', 'application/pdf', 'pdf'],
      ['foto.jpeg', 'image/jpeg', 'jpeg'],
      ['Notas', 'text/plain', null],
      ['archivo.', 'text/plain', null],
      ['.oculto', 'text/plain', null],
      ['Informe v2.1', 'application/vnd.google-apps.document', null],
    ])('%s (%s) → %s', (name, mimeType, expected) => {
      expect(docOf({ name, mimeType }).extension).toBe(expected);
    });
  });

  it('un nativo de Google no tiene tamaño; un archivo común conserva el de Drive (CA-38.4)', () => {
    expect(docOf().snapshot().sizeBytes).toBe(90112);
    expect(docOf({ mimeType: 'application/vnd.google-apps.document', sizeBytes: 1024 }).snapshot().sizeBytes).toBeNull();
  });

  it.each([
    ['application/pdf', true],
    ['application/msword', true],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', true],
    ['application/vnd.google-apps.document', true],
    ['image/jpeg', true],
    ['image/png', true],
    ['application/vnd.google-apps.spreadsheet', false],
    ['text/plain', false],
    ['application/zip', false],
  ])('convertibleToPdf de %s es %s (D-102)', (mimeType, expected) => {
    expect(docOf({ mimeType }).convertibleToPdf).toBe(expected);
  });

  it.each([
    ['application/pdf', 'AS_IS'],
    ['application/vnd.google-apps.document', 'EXPORT'],
    ['application/msword', 'CONVERT'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'CONVERT'],
    ['image/jpeg', 'IMAGE'],
    ['image/png', 'IMAGE'],
    ['application/vnd.google-apps.spreadsheet', null],
    ['text/plain', null],
  ])('pdfConversion de %s es %s (HU25, CA-25.4)', (mimeType, expected) => {
    expect(docOf({ mimeType }).pdfConversion).toBe(expected);
  });

  it('es un expediente sólo si tiene su fila en case_files (CA-25.3)', () => {
    expect(CaseDocument.fromStorage(stored(), { id: 4, version: 1 }).isCaseFile).toBe(true);
    expect(docOf().isCaseFile).toBe(false);
  });

  it('reconoce los nativos de Google por su tipo', () => {
    expect(docOf({ mimeType: 'application/vnd.google-apps.spreadsheet' }).isGoogleNative).toBe(true);
    expect(docOf().isGoogleNative).toBe(false);
  });

  it('está en la carpeta sólo si es uno de sus padres (CA-38.8)', () => {
    expect(docOf().isIn('folder-ref')).toBe(true);
    expect(docOf().isIn('folder-otra')).toBe(false);
  });

  it('un común se descarga con su nombre y tipo; un nativo, como PDF con ".pdf" (CA-38.7)', () => {
    expect(docOf()).toMatchObject({ downloadName: 'Cédula de notificación.pdf', downloadMimeType: 'application/pdf' });
    const native = docOf({ name: 'Escrito de defensa', mimeType: 'application/vnd.google-apps.document' });
    expect(native).toMatchObject({ downloadName: 'Escrito de defensa.pdf', downloadMimeType: 'application/pdf' });
  });

  it('lleva su expediente si se construyó con la fila de case_files (CA-38.4)', () => {
    expect(CaseDocument.fromStorage(stored(), { id: 4, version: 1 }).snapshot().caseFile).toEqual({ id: 4, version: 1 });
    expect(docOf().snapshot().caseFile).toBeNull();
  });

  describe('assertCanBeDownloadedBy (D-103, CA-38.7)', () => {
    it.each([['ADMINISTRATOR'], ['LAWYER'], ['SECRETARY']])('un expediente lo descarga %s', (role) => {
      expect(() => CaseDocument.assertCanBeDownloadedBy(actor([role]), true)).not.toThrow();
    });

    it.each([[['LAWYER']], [['SECRETARY']], [['ADMINISTRATOR', 'LAWYER']]])('un documento común lo descarga %j', (roles) => {
      expect(() => CaseDocument.assertCanBeDownloadedBy(actor(roles), false)).not.toThrow();
    });

    it('un documento común no lo descarga quien sólo es administrador', () => {
      const attempt = () => CaseDocument.assertCanBeDownloadedBy(actor(['ADMINISTRATOR']), false);
      expect(attempt).toThrow(ForbiddenActionError);
      expect(attempt).toThrow('Se requiere el rol LAWYER o SECRETARY para realizar esta operación.');
    });
  });
});
