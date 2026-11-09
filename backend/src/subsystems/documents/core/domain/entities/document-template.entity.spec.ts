import { ValidationError } from '@shared/domain/domain-error';
import { DOCX_MIME_TYPE, DocumentTemplate, NewDocumentTemplateInput } from './document-template.entity';

const NOW = new Date('2026-10-17T12:00:00.000Z');

const input = (overrides: Partial<NewDocumentTemplateInput> = {}): NewDocumentTemplateInput => ({
  name: 'Recurso de casación',
  jurisdictions: ['CRIMINAL'],
  file: { originalName: 'casacion.docx', mimeType: DOCX_MIME_TYPE },
  lastVersionByUserId: 6,
  now: NOW,
  ...overrides,
});

function detailsOf(work: () => unknown): Record<string, unknown> | null {
  try {
    work();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).code).toBe('VALIDATION_ERROR');
    return (error as ValidationError).details;
  }
  throw new Error('Se esperaba un ValidationError.');
}

describe('DocumentTemplate', () => {
  it('crea el modelo con quién lo cargó y cuándo (CA-34.6)', () => {
    const template = DocumentTemplate.create(input({ name: '  Recurso de casación  ' }));

    expect(template.name).toBe('Recurso de casación');
    expect(template.jurisdictions).toEqual(['CRIMINAL']);
    expect(template.fileName).toBe('casacion.docx');
    expect(template.lastVersionByUserId).toBe(6);
    expect(template.lastVersionAt).toBe(NOW);
  });

  it('"Copiar en las causas nuevas" viene marcado por defecto (CA-34.5)', () => {
    expect(DocumentTemplate.create(input()).copyToNewCases).toBe(true);
    expect(DocumentTemplate.create(input({ copyToNewCases: false })).copyToNewCases).toBe(false);
  });

  it('un modelo puede aplicar a todos los fueros (CA-34.2)', () => {
    const template = DocumentTemplate.create(input({ jurisdictions: ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] }));

    expect(template.jurisdictions).toHaveLength(3);
  });

  it('ordena los fueros como el enum del contrato, sin importar cómo llegaron (el primero lleva el archivo principal)', () => {
    const template = DocumentTemplate.create(input({ jurisdictions: ['AMPARO', 'CRIMINAL', 'ADMINISTRATIVE'] }));

    expect(template.jurisdictionsInContractOrder).toEqual(['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO']);
    expect(template.jurisdictions).toEqual(['AMPARO', 'CRIMINAL', 'ADMINISTRATIVE']);
  });

  // CA-34.4
  it('si faltan el nombre, el fuero y el archivo, indica los tres', () => {
    expect(detailsOf(() => DocumentTemplate.create(input({ name: '   ', jurisdictions: [], file: null })))).toEqual({
      name: 'El nombre del modelo es obligatorio.',
      jurisdictions: 'Elegí al menos un fuero.',
      file: 'El archivo del modelo es obligatorio.',
    });
  });

  // CA-34.3
  it.each([
    ['un PDF', 'casacion.pdf', 'application/pdf'],
    ['un PDF renombrado como .docx', 'casacion.docx', 'application/pdf'],
    ['un .doc viejo', 'casacion.doc', 'application/msword'],
  ])('rechaza %s', (_name, originalName, mimeType) => {
    expect(detailsOf(() => DocumentTemplate.create(input({ file: { originalName, mimeType } })))).toEqual({
      file: 'El archivo tiene que ser .docx.',
    });
  });

  it('acepta la extensión en mayúsculas', () => {
    const file = { originalName: 'CASACION.DOCX', mimeType: DOCX_MIME_TYPE };

    expect(DocumentTemplate.create(input({ file })).fileName).toBe('CASACION.DOCX');
  });

  it('el nombre tiene hasta 150 caracteres', () => {
    expect(DocumentTemplate.create(input({ name: 'a'.repeat(150) })).name).toHaveLength(150);
    expect(detailsOf(() => DocumentTemplate.create(input({ name: 'a'.repeat(151) })))).toEqual({
      name: 'Debe tener hasta 150 caracteres.',
    });
  });

  it('rechaza un fuero que no existe o repetido', () => {
    expect(detailsOf(() => DocumentTemplate.create(input({ jurisdictions: ['LABORAL'] })))).toEqual({
      jurisdictions: 'Los fueros válidos son CRIMINAL, ADMINISTRATIVE y AMPARO.',
    });
    expect(detailsOf(() => DocumentTemplate.create(input({ jurisdictions: ['CRIMINAL', 'CRIMINAL'] })))).toEqual({
      jurisdictions: 'Cada fuero se elige una sola vez.',
    });
  });
});
