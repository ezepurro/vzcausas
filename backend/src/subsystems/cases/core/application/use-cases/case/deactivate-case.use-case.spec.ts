import { CaseNotFoundError } from '../../../domain/errors/case.errors';
import { aCase, anActor, INITIAL_STATES, NOW, STATES_TABLE, TODAY, validationDetailsOf } from '../../../test-support/case-fixtures';
import { FakeAuditTrail, FakeCaseRepository, FakeClock, FakeTransactionManager } from '../../../test-support/case-fakes';
import { DeactivateCase, DeactivateCaseCommand } from './deactivate-case.use-case';

/*
 * HU21 · Registrar baja de una causa. Solo lo que es del caso de uso: el 404,
 * que un rechazo no escriba nada y la auditoría. Las reglas del motivo están
 * en `case-deactivation.vo.spec.ts` y las de la causa en `case.entity.spec.ts`.
 */

function build() {
  const cases = new FakeCaseRepository([...Object.values(INITIAL_STATES), ...STATES_TABLE]);
  const existing = aCase();
  cases.add(existing);
  const audit = new FakeAuditTrail();
  const useCase = new DeactivateCase(cases, audit, new FakeTransactionManager(), new FakeClock(NOW, TODAY));
  return { useCase, cases, audit, existing };
}

const command = (overrides: Partial<DeactivateCaseCommand> = {}): DeactivateCaseCommand => ({
  caseId: 1,
  input: { reason: 'Causa duplicada: se registró dos veces.' },
  actor: anActor({ userId: 5, roleNames: ['SECRETARY'], lawyerId: null }),
  ...overrides,
});

describe('DeactivateCase', () => {
  // CA-21.1, CA-21.3
  it('guarda la baja y la audita con quién y cuándo, sin el motivo', async () => {
    const { useCase, cases, audit, existing } = build();

    await useCase.execute(command());

    expect(cases.deactivations).toEqual([existing]);
    expect(existing.active).toBe(false);
    expect(existing.deactivation).toMatchObject({
      reason: 'Causa duplicada: se registró dos veces.',
      deactivatedByUserId: 5,
      deactivatedAt: NOW,
    });
    expect(audit.entries).toEqual([
      { actorUserId: 5, action: 'case.deactivated', entityType: 'Case', entityId: '1', occurredAt: NOW },
    ]);
  });

  // CA-21.5
  it('una causa inexistente es 404 y no se escribe nada', async () => {
    const { useCase, cases, audit } = build();

    await expect(useCase.execute(command({ caseId: 999 }))).rejects.toThrow(CaseNotFoundError);

    expect(cases.deactivations).toEqual([]);
    expect(audit.entries).toEqual([]);
  });

  // CA-21.5
  it('una causa ya dada de baja es 404: la segunda baja no escribe ni audita', async () => {
    const { useCase, cases, audit, existing } = build();
    await useCase.execute(command());

    await expect(useCase.execute(command({ input: { reason: 'Otra vez' } }))).rejects.toThrow(CaseNotFoundError);

    expect(cases.deactivations).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
    expect(existing.deactivation?.reason).toBe('Causa duplicada: se registró dos veces.');
  });

  it('si otra baja ganó entre la lectura y la escritura, es 404 y no se audita (CA-21.5)', async () => {
    const { useCase, cases, audit } = build();
    cases.alreadyDeactivatedOnSave = true;

    await expect(useCase.execute(command())).rejects.toThrow(CaseNotFoundError);

    expect(audit.entries).toEqual([]);
  });

  // CA-21.2
  it('un motivo de más de 500 caracteres es 400 y no se escribe nada', async () => {
    const { useCase, cases, audit, existing } = build();

    expect(await validationDetailsOf(() => useCase.execute(command({ input: { reason: 'a'.repeat(501) } })))).toEqual({
      reason: 'Debe tener hasta 500 caracteres.',
    });
    expect(cases.deactivations).toEqual([]);
    expect(audit.entries).toEqual([]);
    expect(existing.active).toBe(true);
  });
});
