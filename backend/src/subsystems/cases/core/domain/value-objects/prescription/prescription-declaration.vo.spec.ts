import { CannotDeclarePrescriptionError } from '../../errors/case.errors';
import { anActor, day, NOW, TODAY, validationDetailsOf } from '../../../test-support/case-fixtures';
import { PrescriptionDeclaration, PrescriptionDeclarationInput } from './prescription-declaration.vo';

/** HU33, CA-33.1 to CA-33.3, contract V4 §3.7 (`POST /cases/{caseId}/prescription`). */
const context = { registeredByUserId: 5, registeredAt: NOW, today: TODAY };

const valid: PrescriptionDeclarationInput = {
  prescriptionDate: day('2026-09-15'),
  resolution: 'Sentencia N° 214 del Juzgado de Control N° 3',
  grounds: 'Transcurrió el plazo del art. 62 inc. 2 CP sin actos interruptivos.',
};

const create = (overrides: Partial<PrescriptionDeclarationInput> = {}) =>
  PrescriptionDeclaration.create({ ...valid, ...overrides }, context);

describe('PrescriptionDeclaration', () => {
  it('registra la fecha, la resolución, el fundamento y quién la marcó y cuándo (CA-33.5)', async () => {
    const declaration = create();

    expect(declaration.prescriptionDate).toEqual(day('2026-09-15'));
    expect(declaration.resolution).toBe('Sentencia N° 214 del Juzgado de Control N° 3');
    expect(declaration.grounds).toBe(valid.grounds);
    expect(declaration.registeredByUserId).toBe(5);
    expect(declaration.registeredAt).toEqual(NOW);
  });

  it('acepta la fecha de hoy: el límite es "posterior a hoy" (CA-33.3)', async () => {
    expect(create({ prescriptionDate: TODAY }).prescriptionDate).toEqual(TODAY);
  });

  it('rechaza una fecha posterior a hoy con el texto del contrato', async () => {
    expect(await validationDetailsOf(() => create({ prescriptionDate: day('2026-10-07') }))).toEqual({
      prescriptionDate: 'No puede ser posterior a hoy.',
    });
  });

  it.each([
    ['ausente', undefined],
    ['inválida', new Date('no-es-fecha')],
  ])('rechaza una fecha %s', async (_caso, prescriptionDate) => {
    expect(await validationDetailsOf(() => create({ prescriptionDate }))).toEqual({
      prescriptionDate: 'La fecha de la prescripción es obligatoria.',
    });
  });

  it.each([
    ['vacía', ''],
    ['en blanco', '   '],
    ['ausente', undefined],
  ])('rechaza una resolución %s con el texto del contrato', async (_caso, resolution) => {
    expect(await validationDetailsOf(() => create({ resolution }))).toEqual({
      resolution: 'La resolución que declara la prescripción es obligatoria.',
    });
  });

  it('admite una resolución de 255 caracteres y rechaza una de 256', async () => {
    expect(create({ resolution: 'r'.repeat(255) }).resolution).toHaveLength(255);
    expect(await validationDetailsOf(() => create({ resolution: 'r'.repeat(256) }))).toEqual({
      resolution: 'Debe tener como máximo 255 caracteres.',
    });
  });

  it('admite un fundamento de 2000 caracteres y rechaza uno de 2001', async () => {
    expect(create({ grounds: 'f'.repeat(2000) }).grounds).toHaveLength(2000);
    expect(await validationDetailsOf(() => create({ grounds: 'f'.repeat(2001) }))).toEqual({
      grounds: 'Debe tener como máximo 2000 caracteres.',
    });
  });

  it('el fundamento es opcional: ausente o en blanco queda en null, y la resolución se recorta', async () => {
    expect(create({ grounds: undefined }).grounds).toBeNull();
    expect(create({ grounds: '  ' }).grounds).toBeNull();
    expect(create({ resolution: '  Auto N° 12  ' }).resolution).toBe('Auto N° 12');
  });

  it('informa todos los campos inválidos juntos, como el ejemplo del contrato', async () => {
    expect(await validationDetailsOf(() => create({ prescriptionDate: day('2026-12-01'), resolution: '' }))).toEqual({
      prescriptionDate: 'No puede ser posterior a hoy.',
      resolution: 'La resolución que declara la prescripción es obligatoria.',
    });
  });

  describe('quién puede declararla (CA-33.1, CA-33.2)', () => {
    it.each([['ADMINISTRATOR'], ['LAWYER']])('%s puede, sea o no el responsable', (role) => {
      expect(() =>
        PrescriptionDeclaration.assertCanBeDeclaredBy(anActor({ roleNames: [role], lawyerId: 999 })),
      ).not.toThrow();
    });

    it('la secretaría no puede: FORBIDDEN con el texto del contrato', () => {
      const attempt = () => PrescriptionDeclaration.assertCanBeDeclaredBy(anActor({ roleNames: ['SECRETARY'], lawyerId: null }));

      expect(attempt).toThrow(CannotDeclarePrescriptionError);
      expect(attempt).toThrow('Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.');
    });
  });
});
