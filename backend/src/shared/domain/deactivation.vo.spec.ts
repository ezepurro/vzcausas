import { ValidationError } from '@shared/domain/domain-error';
import { Deactivation } from './deactivation.vo';

/**
 * El registro de una baja lógica (RN12): causas (HU21, CA-21.2 y CA-21.3) y
 * clientes (HU11, CA-11.5 y CA-11.7).
 */
const NOW = new Date('2026-10-07T12:00:00Z');
const context = { deactivatedByUserId: 5, deactivatedAt: NOW };

describe('Deactivation', () => {
  it('registra quién dio la baja, cuándo y el motivo recortado (CA-21.3, CA-11.5)', () => {
    const deactivation = Deactivation.create({ reason: '  Cargado dos veces.  ' }, context);

    expect(deactivation.reason).toBe('Cargado dos veces.');
    expect(deactivation.deactivatedByUserId).toBe(5);
    expect(deactivation.deactivatedAt).toEqual(NOW);
  });

  it.each([
    ['ausente', undefined],
    ['en null', null],
    ['en blanco', '   '],
  ])('el motivo es opcional: %s queda en null (CA-21.2, CA-11.7)', (_case, reason) => {
    expect(Deactivation.create({ reason }, context).reason).toBeNull();
  });

  it('acepta un motivo de 500 caracteres y rechaza uno de 501 con el texto del contrato', () => {
    expect(Deactivation.create({ reason: 'a'.repeat(500) }, context).reason).toHaveLength(500);

    let thrown: unknown;
    try {
      Deactivation.create({ reason: 'a'.repeat(501) }, context);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ValidationError);
    expect((thrown as ValidationError).details).toEqual({ reason: 'Debe tener hasta 500 caracteres.' });
  });

  it('mide el motivo ya recortado', () => {
    expect(Deactivation.create({ reason: ` ${'a'.repeat(500)} ` }, context).reason).toHaveLength(500);
  });

  it('dos registros con los mismos datos son iguales', () => {
    const one = Deactivation.create({ reason: 'Duplicado' }, context);

    expect(one.equals(Deactivation.hydrate({ reason: 'Duplicado', deactivatedByUserId: 5, deactivatedAt: NOW }))).toBe(true);
    expect(one.equals(Deactivation.create({ reason: null }, context))).toBe(false);
  });
});
