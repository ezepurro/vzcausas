import { DOCX_MIME_TYPE } from '../entities/document-template.entity';
import { TemplateFile } from './template-file.vo';

/** HU23, CA-23.1: the file of a template, as it is downloaded. */
describe('TemplateFile', () => {
  const file = TemplateFile.hydrate({ fileName: 'designación-defensor.docx', cloudFileId: 'drive-123' });

  it('conserva el nombre que subió el usuario y dónde está en la nube', () => {
    expect(file.fileName).toBe('designación-defensor.docx');
    expect(file.cloudFileId).toBe('drive-123');
  });

  it('es siempre un documento de Word (CA-34.3)', () => {
    expect(file.mimeType).toBe(DOCX_MIME_TYPE);
  });

  it('dos archivos con el mismo nombre y ubicación son iguales', () => {
    expect(file.equals(TemplateFile.hydrate({ fileName: 'designación-defensor.docx', cloudFileId: 'drive-123' }))).toBe(true);
    expect(file.equals(TemplateFile.hydrate({ fileName: 'designación-defensor.docx', cloudFileId: 'drive-999' }))).toBe(false);
  });
});
