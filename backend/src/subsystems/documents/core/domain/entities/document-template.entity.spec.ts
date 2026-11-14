import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ForbiddenActionError, ValidationError } from '@shared/domain/domain-error';
import {
  DOCX_MIME_TYPE,
  DocumentTemplate,
  DocumentTemplateProps,
  NewDocumentTemplateInput,
  TemplateModificationInput,
} from './document-template.entity';

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

  describe('modificar un modelo (HU36)', () => {
    const LATER = new Date('2026-11-12T13:30:00.000Z');
    const stored = (overrides: Partial<DocumentTemplateProps> = {}) =>
      DocumentTemplate.hydrate({
        name: 'Recurso de casación',
        jurisdictions: ['CRIMINAL', 'AMPARO'],
        fileName: 'casacion.docx',
        copyToNewCases: true,
        lastVersionByUserId: 6,
        lastVersionAt: NOW,
        ...overrides,
      });
    const change = (overrides: Partial<TemplateModificationInput> = {}): TemplateModificationInput => ({
      byUserId: 9,
      now: LATER,
      ...overrides,
    });
    const docx = (originalName = 'nuevo.docx') => ({ originalName, mimeType: DOCX_MIME_TYPE });

    // CA-36.1
    it('cambia solo lo que se envía y deja lo demás como estaba, incluida la última versión', () => {
      const template = stored();

      const modification = template.modify(change({ name: '  Casación 2026  ', copyToNewCases: false }));

      expect(template.name).toBe('Casación 2026');
      expect(template.copyToNewCases).toBe(false);
      expect(template.jurisdictions).toEqual(['CRIMINAL', 'AMPARO']);
      expect(template.fileName).toBe('casacion.docx');
      expect(template.lastVersionByUserId).toBe(6);
      expect(template.lastVersionAt).toBe(NOW);
      expect(modification).toMatchObject({
        fileReplaced: false,
        jurisdictionsAdded: [],
        jurisdictionsRemoved: [],
        touchesStorage: false,
      });
    });

    // CA-36.4
    it('un archivo nuevo cambia el nombre del archivo y la fecha y el usuario de la última versión', () => {
      const template = stored();

      const modification = template.modify(change({ file: docx('casacion-2026.docx') }));

      expect(template.fileName).toBe('casacion-2026.docx');
      expect(template.lastVersionByUserId).toBe(9);
      expect(template.lastVersionAt).toBe(LATER);
      expect(modification).toMatchObject({ fileReplaced: true, touchesStorage: true });
    });

    // CA-36.2, CA-36.6
    it('la lista de fueros reemplaza a la anterior y dice cuáles se suman y cuáles se quitan, en el orden del contrato', () => {
      const template = stored({ jurisdictions: ['AMPARO', 'CRIMINAL'] });

      const modification = template.modify(change({ jurisdictions: ['ADMINISTRATIVE', 'CRIMINAL'] }));

      expect(template.jurisdictions).toEqual(['ADMINISTRATIVE', 'CRIMINAL']);
      expect(template.jurisdictionsInContractOrder).toEqual(['CRIMINAL', 'ADMINISTRATIVE']);
      expect(modification).toMatchObject({
        jurisdictionsAdded: ['ADMINISTRATIVE'],
        jurisdictionsRemoved: ['AMPARO'],
        touchesStorage: true,
      });
    });

    it('enviar los mismos fueros, en otro orden, no toca la nube', () => {
      const modification = stored().modify(change({ jurisdictions: ['AMPARO', 'CRIMINAL'] }));

      expect(modification.touchesStorage).toBe(false);
    });

    // CA-36.3: el propio nombre no es conflicto, y el entorno lo decide el caso de uso
    it('conservar su propio nombre es una modificación válida', () => {
      const template = stored();

      expect(() => template.modify(change({ name: 'Recurso de casación' }))).not.toThrow();
    });

    // CA-36.1
    it('un pedido sin ningún campo es VALIDATION_ERROR bajo "body" y no cambia nada', () => {
      const template = stored();

      expect(detailsOf(() => template.modify(change()))).toEqual({
        body: 'Debe enviarse al menos un campo para modificar.',
      });
      expect(template.name).toBe('Recurso de casación');
    });

    // CA-36.2, CA-36.3, CA-36.5
    it('junta los problemas de todos los campos y no cambia nada si alguno falla', () => {
      const template = stored();

      expect(
        detailsOf(() =>
          template.modify(
            change({ name: '   ', jurisdictions: [], file: { originalName: 'casacion.pdf', mimeType: 'application/pdf' } }),
          ),
        ),
      ).toEqual({
        name: 'El nombre del modelo es obligatorio.',
        jurisdictions: 'Elegí al menos un fuero.',
        file: 'El archivo tiene que ser .docx.',
      });
      expect(template).toMatchObject({ name: 'Recurso de casación', fileName: 'casacion.docx' });
      expect(template.lastVersionAt).toBe(NOW);
    });

    it.each([
      [{ name: 'x'.repeat(151) }, { name: 'Debe tener hasta 150 caracteres.' }],
      [{ jurisdictions: ['LABORAL'] }, { jurisdictions: 'Los fueros válidos son CRIMINAL, ADMINISTRATIVE y AMPARO.' }],
      [{ jurisdictions: ['AMPARO', 'AMPARO'] }, { jurisdictions: 'Cada fuero se elige una sola vez.' }],
    ])('rechaza %j', (overrides, expected) => {
      expect(detailsOf(() => stored().modify(change(overrides)))).toEqual(expected);
    });
  });

  describe('quién maneja los modelos (CA-34.8, CA-35.7, CA-23.2, D-90)', () => {
    const actor = (roleNames: string[]): AuthenticatedUser => ({ userId: 1, roleNames, lawyerId: null, permissions: [] });

    it.each([[['ADMINISTRATOR']], [['LAWYER']], [['SECRETARY', 'LAWYER']]])('un usuario con %j puede', (roles) => {
      expect(() => DocumentTemplate.assertCanBeManagedBy(actor(roles))).not.toThrow();
    });

    it('la secretaría no: 403 FORBIDDEN con el texto del contrato', () => {
      const attempt = () => DocumentTemplate.assertCanBeManagedBy(actor(['SECRETARY']));

      expect(attempt).toThrow(ForbiddenActionError);
      expect(attempt).toThrow('Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.');
    });
  });
});
