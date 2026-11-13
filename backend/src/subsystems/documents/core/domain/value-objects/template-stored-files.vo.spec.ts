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

  it('no se altera si se cambia el arreglo con el que se armó', () => {
    const ids = ['a'];
    const files = TemplateStoredFiles.hydrate({ mainFileId: 'a', jurisdictionFileIds: ids });

    ids.push('intruso');

    expect(files.fileIds).toEqual(['a']);
  });
});
