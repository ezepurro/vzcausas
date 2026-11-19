import {
  FakeAuditTrail,
  FakeCaseRepository,
  FakeClock,
} from '../../../test-support/case-fakes';
import { aCase, anOrphanedCase, INITIAL_STATES, LAWYER, NOW, STATES_TABLE, TODAY } from '../../../test-support/case-fixtures';
import { ReassignLawyerCases } from './reassign-lawyer-cases.use-case';

/* HU15 · La baja de un abogado reparte sus causas o las deja huérfanas (D-143). */
function build(...existing: ReturnType<typeof aCase>[]) {
  const cases = new FakeCaseRepository([...Object.values(INITIAL_STATES), ...STATES_TABLE]);
  existing.forEach((c) => cases.add(c));
  const audit = new FakeAuditTrail();
  const useCase = new ReassignLawyerCases(cases, audit, new FakeClock(NOW, TODAY));
  return { useCase, cases, audit };
}

const FROM = LAWYER.id;

describe('ReassignLawyerCases', () => {
  it('reasigna una causa a otro abogado, la guarda y deja el cambio en su auditoría', async () => {
    const target = aCase();
    const { useCase, cases, audit } = build(target);

    await useCase.execute({
      fromLawyerId: FROM,
      reassignments: [{ caseId: target.id, responsibleLawyerId: 7 }],
      actorUserId: 9,
    });

    expect(target.responsibleLawyerId).toBe(7);
    expect(cases.modifications).toHaveLength(1);
    expect(audit.entries).toEqual([
      {
        actorUserId: 9,
        action: 'case.updated',
        entityType: 'Case',
        entityId: String(target.id),
        occurredAt: NOW,
        metadata: { changedFields: ['responsibleLawyerId'] },
      },
    ]);
  });

  it('con responsibleLawyerId null deja la causa huérfana: sin responsable y con orphanedAt', async () => {
    const target = aCase();
    const { useCase, cases } = build(target);

    await useCase.execute({
      fromLawyerId: FROM,
      reassignments: [{ caseId: target.id, responsibleLawyerId: null }],
      actorUserId: 9,
    });

    expect(target.responsibleLawyerId).toBeNull();
    expect(target.orphanedAt).toEqual(NOW);
    expect(cases.modifications).toHaveLength(1);
  });

  it('reparte varias causas entre abogados y huérfanas en un solo pedido', async () => {
    const first = aCase({ id: 1 });
    const second = aCase({ id: 2 });
    const { useCase, cases, audit } = build(first, second);

    await useCase.execute({
      fromLawyerId: FROM,
      reassignments: [
        { caseId: first.id, responsibleLawyerId: 7 },
        { caseId: second.id, responsibleLawyerId: null },
      ],
      actorUserId: 9,
    });

    expect(first.responsibleLawyerId).toBe(7);
    expect(second.responsibleLawyerId).toBeNull();
    expect(cases.modifications).toHaveLength(2);
    expect(audit.entries.map((entry) => entry.entityId)).toEqual([String(first.id), String(second.id)]);
  });

  it.each([
    ['inexistente', () => build(), 99],
    ['de otro abogado', () => build(aCase({ responsibleLawyerId: 99 })), 1],
    ['ya huérfana', () => build(anOrphanedCase()), 1],
  ])('una causa %s es un dato roto: lo informa y no escribe nada', async (_caso, setUp, caseId) => {
    const { useCase, cases, audit } = setUp();

    await expect(
      useCase.execute({ fromLawyerId: FROM, reassignments: [{ caseId, responsibleLawyerId: 7 }], actorUserId: 9 }),
    ).rejects.toThrow(/is not an active case of the lawyer/);

    expect(cases.modifications).toEqual([]);
    expect(audit.entries).toEqual([]);
  });
});
