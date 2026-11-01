import { ContentDisposition } from './content-disposition';

/** RFC 6266, used by `GET /document-templates/{templateId}/file` (CA-23.1). */
describe('ContentDisposition', () => {
  it('un nombre ASCII va igual en los dos parámetros', () => {
    expect(ContentDisposition.attachment('oposicion-elevacion.docx').toString()).toBe(
      `attachment; filename="oposicion-elevacion.docx"; filename*=UTF-8''oposicion-elevacion.docx`,
    );
  });

  it('un nombre con acentos lleva un respaldo sin acentos y el nombre real en UTF-8', () => {
    expect(ContentDisposition.attachment('designación.docx').toString()).toBe(
      `attachment; filename="designacion.docx"; filename*=UTF-8''designaci%C3%B3n.docx`,
    );
  });

  it('el respaldo no lleva comillas ni barras invertidas, que cortarían el texto entre comillas', () => {
    expect(ContentDisposition.attachment('mi "modelo"\\final.docx').toString()).toBe(
      `attachment; filename="mi modelofinal.docx"; filename*=UTF-8''${encodeURIComponent('mi "modelo"\\final.docx')}`,
    );
  });
});
