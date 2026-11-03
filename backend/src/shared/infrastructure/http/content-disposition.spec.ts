import { contentDisposition } from './content-disposition';

describe('contentDisposition', () => {
  it('lleva la disposición pedida y el nombre', () => {
    expect(contentDisposition('inline', 'Expediente_13284571_v1.pdf')).toBe(
      `inline; filename="Expediente_13284571_v1.pdf"; filename*=UTF-8''Expediente_13284571_v1.pdf`,
    );
    expect(contentDisposition('attachment', 'a.pdf')).toMatch(/^attachment; filename="a.pdf"/);
  });

  it('con tildes: filename en ASCII y filename* con el nombre real en UTF-8', () => {
    expect(contentDisposition('attachment', 'Cédula de notificación.pdf')).toBe(
      `attachment; filename="Cedula de notificacion.pdf"; filename*=UTF-8''C%C3%A9dula%20de%20notificaci%C3%B3n.pdf`,
    );
  });

  it('saca comillas y barras del filename, que cortarían la cabecera', () => {
    expect(contentDisposition('attachment', 'a"b\\c.pdf')).toMatch(/^attachment; filename="abc.pdf"; /);
  });
});
