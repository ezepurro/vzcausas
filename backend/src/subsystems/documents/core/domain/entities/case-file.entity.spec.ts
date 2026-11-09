import { CaseFile } from './case-file.entity';

/* HU25 · El expediente generado, como lo guarda case_files. */

const props = {
  caseId: 7,
  version: 1,
  cloudFileId: 'file-1',
  fileName: 'Expediente_13284571_v1.pdf',
  pageCount: 6,
  generatedByUserId: 3,
  generatedAt: new Date('2026-10-06T15:30:00Z'),
};

describe('CaseFile', () => {
  it('se llama con el SAC, o con el id de la causa si no tiene (CA-25.6)', () => {
    expect(CaseFile.fileNameFor('13284571', 7, 2)).toBe('Expediente_13284571_v2.pdf');
    expect(CaseFile.fileNameFor(null, 7, 1)).toBe('Expediente_causa-7_v1.pdf');
    expect(CaseFile.fileNameFor('', 7, 1)).toBe('Expediente_causa-7_v1.pdf');
  });

  it('nace sin id y con lo que se le dio', () => {
    const caseFile = CaseFile.create(props);

    expect(caseFile.id).toBeNull();
    expect(caseFile).toMatchObject(props);
  });

  it.each([
    ['una versión menor que 1', { version: 0 }],
    ['una versión no entera', { version: 1.5 }],
    ['ninguna hoja', { pageCount: 0 }],
  ])('rechaza %s: es un error de programación, no de la API', (_label, override) => {
    expect(() => CaseFile.create({ ...props, ...override })).toThrow(Error);
  });
});
