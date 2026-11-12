import { ContentDisposition } from './content-disposition';

/** RFC 6266: los modelos (CA-23.1), los documentos de la causa (HU38) y el expediente. */
describe('ContentDisposition', () => {
  it('lleva la disposición pedida y el nombre', () => {
    expect(ContentDisposition.of('inline', 'Expediente_13284571_v1.pdf').toString()).toBe(
      `inline; filename="Expediente_13284571_v1.pdf"; filename*=UTF-8''Expediente_13284571_v1.pdf`,
    );
    expect(ContentDisposition.attachment('oposicion-elevacion.docx').toString()).toBe(
      `attachment; filename="oposicion-elevacion.docx"; filename*=UTF-8''oposicion-elevacion.docx`,
    );
  });

  it('con tildes: filename en ASCII y filename* con el nombre real en UTF-8', () => {
    expect(ContentDisposition.attachment('designación.docx').toString()).toBe(
      `attachment; filename="designacion.docx"; filename*=UTF-8''designaci%C3%B3n.docx`,
    );
    expect(ContentDisposition.of('attachment', 'Cédula de notificación.pdf').toString()).toBe(
      `attachment; filename="Cedula de notificacion.pdf"; filename*=UTF-8''C%C3%A9dula%20de%20notificaci%C3%B3n.pdf`,
    );
  });

  it('saca comillas y barras del filename, que cortarían la cabecera', () => {
    expect(ContentDisposition.attachment('mi "modelo"\\final.docx').toString()).toBe(
      `attachment; filename="mi modelofinal.docx"; filename*=UTF-8''${encodeURIComponent('mi "modelo"\\final.docx')}`,
    );
  });
});
