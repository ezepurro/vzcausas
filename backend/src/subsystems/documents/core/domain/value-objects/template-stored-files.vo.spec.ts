import { TemplateStoredFiles } from './template-stored-files.vo';

/* HU37 · CA-37.4: qué archivos de un modelo van a la Papelera. */

describe('TemplateStoredFiles', () => {
  it('un modelo con un archivo por fuero: esos archivos, el principal una sola vez', () => {
    const files = TemplateStoredFiles.hydrate({ mainFileId: 'f-crim', jurisdictionFileIds: ['f-crim', 'f-amp'] });

    expect(files.fileIds).toEqual(['f-crim', 'f-amp']);
  });

  it('un modelo anterior a las subcarpetas, sin filas por fuero: solo el principal', () => {
    const files = TemplateStoredFiles.hydrate({ mainFileId: 'f-viejo', jurisdictionFileIds: [] });

    expect(files.fileIds).toEqual(['f-viejo']);
  });

  it('no repite un id aunque se repita en las filas', () => {
    const files = TemplateStoredFiles.hydrate({ mainFileId: 'a', jurisdictionFileIds: ['a', 'b', 'b'] });

    expect(files.fileIds).toEqual(['a', 'b']);
  });

  // HU36, CA-36.4, CA-36.6
  it('lo que una modificación deja sin referencia: todo lo que tiene y no se conserva', () => {
    const files = TemplateStoredFiles.hydrate({ mainFileId: 'f-crim', jurisdictionFileIds: ['f-crim', 'f-amp'] });

    expect(files.unreferencedBy(['f-nuevo-crim', 'f-nuevo-amp'])).toEqual(['f-crim', 'f-amp']);
    expect(files.unreferencedBy(['f-crim'])).toEqual(['f-amp']);
    expect(files.unreferencedBy(['f-crim', 'f-amp'])).toEqual([]);
  });

  it('el archivo suelto de un modelo anterior a las subcarpetas queda sin referencia cuando recibe copias por fuero', () => {
    const files = TemplateStoredFiles.hydrate({ mainFileId: 'f-viejo', jurisdictionFileIds: [] });

    expect(files.unreferencedBy(['c-crim', 'c-amp'])).toEqual(['f-viejo']);
  });

  it('no se altera si se cambia el arreglo con el que se armó', () => {
    const ids = ['a'];
    const files = TemplateStoredFiles.hydrate({ mainFileId: 'a', jurisdictionFileIds: ids });

    ids.push('intruso');

    expect(files.fileIds).toEqual(['a']);
  });
});
