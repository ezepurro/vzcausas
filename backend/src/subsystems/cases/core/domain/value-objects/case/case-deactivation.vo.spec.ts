import { NOW, validationDetailsOf } from '../../../test-support/case-fixtures';
import { CaseDeactivation } from './case-deactivation.vo';

/** HU21, CA-21.2 and CA-21.3, contract V5 §3.7 (`DELETE /cases/{caseId}`). */
const context = { deactivatedByUserId: 5, deactivatedAt: NOW };

describe('CaseDeactivation', () => {
  it('registra quién la dio de baja, cuándo y el motivo recortado (CA-21.3)', () => {
    const deactivation = CaseDeactivation.create({ reason: '  Causa duplicada.  ' }, context);

    expect(deactivation.reason).toBe('Causa duplicada.');
    expect(deactivation.deactivatedByUserId).toBe(5);
    expect(deactivation.deactivatedAt).toEqual(NOW);
  });

  it.each([
    ['ausente', undefined],
    ['en null', null],
    ['en blanco', '   '],
  ])('el motivo es opcional: %s queda en null (CA-21.2)', (_case, reason) => {
    expect(CaseDeactivation.create({ reason }, context).reason).toBeNull();
  });

  it('acepta un motivo de 500 caracteres y rechaza uno de 501 con el texto del contrato', async () => {
    expect(CaseDeactivation.create({ reason: 'a'.repeat(500) }, context).reason).toHaveLength(500);
    expect(await validationDetailsOf(() => CaseDeactivation.create({ reason: 'a'.repeat(501) }, context))).toEqual({
      reason: 'Debe tener hasta 500 caracteres.',
    });
  });

  it('mide el motivo ya recortado', () => {
    expect(CaseDeactivation.create({ reason: ` ${'a'.repeat(500)} ` }, context).reason).toHaveLength(500);
  });

  it('dos registros con los mismos datos son iguales', () => {
    const one = CaseDeactivation.create({ reason: 'Duplicada' }, context);

    expect(one.equals(CaseDeactivation.hydrate({ reason: 'Duplicada', deactivatedByUserId: 5, deactivatedAt: NOW }))).toBe(true);
    expect(one.equals(CaseDeactivation.create({ reason: null }, context))).toBe(false);
  });
});
