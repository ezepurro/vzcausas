import { ValidationError } from '@shared/domain/domain-error';
import {
  LegalQualification,
  LegalQualificationProps,
  QUALIFICATION_NAME_MAX_LENGTH,
} from './legal-qualification';

function props(overrides: Partial<LegalQualificationProps> = {}): LegalQualificationProps {
  return {
    id: 1,
    name: 'Hurto simple — art. 162 CP',
    prescriptionMonths: 24,
    isActive: true,
    createdAt: null,
    ...overrides,
  };
}

describe('LegalQualification.create', () => {
  // CA-48.2
  it('guarda el delito y el artículo en un único campo, sin partirlos', () => {
    const qualification = LegalQualification.create(props());

    expect(qualification.name).toBe('Hurto simple — art. 162 CP');
  });

  it('recorta los espacios de la denominación', () => {
    const qualification = LegalQualification.create(props({ name: '  Hurto simple  ' }));

    expect(qualification.name).toBe('Hurto simple');
  });

  // CA-48.3
  it('guarda el plazo como una cantidad total de meses', () => {
    // 6 años y 6 meses, que es como el prototipo lo pide y como la
    // interfaz lo vuelve a mostrar.
    const qualification = LegalQualification.create(props({ prescriptionMonths: 78 }));

    expect(qualification.prescriptionMonths).toBe(78);
  });

  it('admite el plazo mínimo de un mes', () => {
    expect(LegalQualification.create(props({ prescriptionMonths: 1 })).prescriptionMonths).toBe(1);
  });

  // CA-48.5
  it.each([
    ['vacía', ''],
    ['en blanco', '   '],
  ])('rechaza una denominación %s nombrando el campo', (_caso, name) => {
    expect(() => LegalQualification.create(props({ name }))).toThrow(ValidationError);

    try {
      LegalQualification.create(props({ name }));
    } catch (error) {
      expect((error as ValidationError).details).toEqual({ name: 'Es un campo obligatorio.' });
    }
  });

  // CA-48.6
  it('admite una denominación de exactamente 255 caracteres', () => {
    const name = 'A'.repeat(QUALIFICATION_NAME_MAX_LENGTH);

    expect(LegalQualification.create(props({ name })).name).toBe(name);
  });

  it('rechaza una denominación de más de 255 caracteres nombrando el campo', () => {
    const name = 'A'.repeat(QUALIFICATION_NAME_MAX_LENGTH + 1);

    try {
      LegalQualification.create(props({ name }));
      fail('debía rechazarla');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toHaveProperty('name');
    }
  });

  it.each([
    ['cero', 0],
    ['negativo', -6],
    ['fraccionario', 12.5],
  ])('rechaza un plazo %s nombrando el campo', (_caso, prescriptionMonths) => {
    try {
      LegalQualification.create(props({ prescriptionMonths }));
      fail('debía rechazarlo');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toEqual({
        prescriptionMonths: 'Debe ser un número entero mayor o igual a 1.',
      });
    }
  });

  // CA-48.7: el alta no arrastra nada de causas; la calificación nace vigente.
  it('nace vigente', () => {
    expect(LegalQualification.create(props()).isActive).toBe(true);
  });
});

describe('LegalQualification.hydrate', () => {
  /**
   * Las filas ya persistidas no se revalidan: una calificación dada de
   * baja, o una guardada antes de que existiera una regla, tiene que
   * poder reconstruirse para que el 404 de CA-47.9 pueda decidirse
   * sobre ella.
   */
  it('reconstruye una calificación dada de baja sin validar', () => {
    const qualification = LegalQualification.hydrate(props({ isActive: false, name: '' }));

    expect(qualification.isActive).toBe(false);
    expect(qualification.name).toBe('');
  });
});
