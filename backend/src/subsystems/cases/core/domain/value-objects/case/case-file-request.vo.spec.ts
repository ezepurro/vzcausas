import { ValidationError } from '@shared/domain/domain-error';
import { CaseFileRequest, CaseFileRequestInput } from './case-file-request.vo';

/* HU25 · La forma del pedido de "Generar expediente" (V5 §3.12). */

const detailsOf = (input: CaseFileRequestInput) => {
  try {
    CaseFileRequest.create(input);
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Los datos enviados no son válidos.' });
    return (error as ValidationError).details;
  }
  throw new Error('Se esperaba un error de validación.');
};

describe('CaseFileRequest', () => {
  it('conserva el orden de los documentos y recorta los textos; uno en blanco queda ausente', () => {
    const request = CaseFileRequest.create({
      documentIds: ['b', 'a'],
      cover: { notes: '  Causa conexa  ', opposingParty: '   ' },
    });

    expect(request.documentIds).toEqual(['b', 'a']);
    expect(request.cover).toEqual({ notes: 'Causa conexa', opposingParty: null });
  });

  it('sin cover, los dos recuadros quedan vacíos (CA-25.5)', () => {
    expect(CaseFileRequest.create({ documentIds: ['a'] }).cover).toEqual({ notes: null, opposingParty: null });
  });

  it('conserva los saltos de línea de la parte (CA-25.5)', () => {
    const request = CaseFileRequest.create({ documentIds: ['a'], cover: { opposingParty: 'QUERELLANTE: X\nAPODERADO: Y' } });

    expect(request.cover.opposingParty).toBe('QUERELLANTE: X\nAPODERADO: Y');
  });

  it.each([
    ['vacía', []],
    ['ausente', undefined],
  ])('una lista %s responde "Elegí al menos un documento." (CA-25.2)', (_label, documentIds) => {
    expect(detailsOf({ documentIds })).toEqual({ documentIds: 'Elegí al menos un documento.' });
  });

  it('documentos repetidos responden 400 sobre documentIds (CA-25.2)', () => {
    expect(detailsOf({ documentIds: ['a', 'b', 'a'] })).toEqual({ documentIds: 'No puede haber documentos repetidos.' });
  });

  it.each(['notes', 'opposingParty'] as const)('cover.%s admite 500 caracteres y no 501 (CA-25.5)', (field) => {
    expect(() => CaseFileRequest.create({ documentIds: ['a'], cover: { [field]: 'x'.repeat(500) } })).not.toThrow();
    expect(detailsOf({ documentIds: ['a'], cover: { [field]: 'x'.repeat(501) } })).toEqual({
      [`cover.${field}`]: 'Debe tener como máximo 500 caracteres.',
    });
  });

  it('informa todos los errores juntos', () => {
    expect(detailsOf({ documentIds: [], cover: { notes: 'x'.repeat(501) } })).toEqual({
      documentIds: 'Elegí al menos un documento.',
      'cover.notes': 'Debe tener como máximo 500 caracteres.',
    });
  });
});
