import { ValidationError } from '@shared/domain/domain-error';
import { Deactivation } from '@shared/domain/deactivation.vo';
import { Case } from '../../../domain/entities/case/case.entity';
import {
  CaseInTerminalStateError,
  CaseNotFoundError,
  NotResponsibleLawyerError,
  ProceduralActNotFoundError,
} from '../../../domain/errors/case.errors';
import {
  FakeAuditTrail,
  FakeCaseRepository,
  FakeClock,
  FakeLegalParametersLookup,
  FakeProceduralActRepository,
  FakeTransactionManager,
} from '../../../test-support/case-fakes';
import {
  aCaseInState,
  anAct,
  anActor,
  aPrescriptionDeclaration,
  day,
  INITIAL_STATES,
  LAWYER,
  NOW,
  OPPOSITION,
  PRESCRIBED,
  STATES_TABLE,
  SUMMONS,
  TODAY,
} from '../../../test-support/case-fixtures';
import { DeactivateProceduralAct, DeactivateProceduralActCommand } from './deactivate-procedural-act.use-case';

/*
 * HU29 · Dar de baja un acto procesal. Solo lo que es del caso de uso: el orden
 * de los chequeos, que un rechazo no escriba nada, la transacción, la auditoría
 * y la carrera. Las reglas del estado, en `case.entity.spec.ts`; las del motivo,
 * en `shared/domain/deactivation.vo.spec.ts`.
 *
 * La causa 1 está en el acto 2 (05/10/2026, "Citación a juicio"); el acto 1
 * (30/09/2026, "Oposición…") es el anterior.
 */
const previous = () => anAct();
const current = () => anAct({ id: 2, proceduralStateId: SUMMONS.id, actDate: day('2026-10-05') });

function build(existing: Case = aCaseInState({ currentAct: current() })) {
  const cases = new FakeCaseRepository([...Object.values(INITIAL_STATES), ...STATES_TABLE]);
  cases.add(existing);
  const acts = new FakeProceduralActRepository();
  acts.views.push({ act: previous(), resultingStateName: OPPOSITION.name, registeredBy: LAWYER });
  acts.views.push({ act: current(), resultingStateName: SUMMONS.name, registeredBy: LAWYER });
  acts.latestOther = previous();
  const audit = new FakeAuditTrail();
  const transactions = new FakeTransactionManager();
  const useCase = new DeactivateProceduralAct(
    cases,
    acts,
    new FakeLegalParametersLookup(INITIAL_STATES, [], STATES_TABLE),
    audit,
    transactions,
    new FakeClock(NOW, TODAY),
  );
  return { useCase, cases, acts, audit, transactions };
}

const command = (overrides: Partial<DeactivateProceduralActCommand> = {}): DeactivateProceduralActCommand => ({
  caseId: 1,
  actId: 2,
  input: { reason: '  Cargado dos veces.  ' },
  actor: anActor({ userId: 5 }),
  ...overrides,
});

/** Nada escrito: ni el acto, ni la causa, ni la auditoría. */
function expectNothingWritten(fakes: ReturnType<typeof build>) {
  expect(fakes.acts.deactivations).toEqual([]);
  expect(fakes.cases.currentActUpdates).toEqual([]);
  expect(fakes.audit.entries).toEqual([]);
}

describe('DeactivateProceduralAct', () => {
  // CA-29.1, CA-29.3, CA-29.12
  it('da de baja el acto, deja la causa en el acto anterior y lo audita, todo en una transacción', async () => {
    const fakes = build();

    await fakes.useCase.execute(command());

    expect(fakes.acts.deactivations).toHaveLength(1);
    const [written] = fakes.acts.deactivations;
    expect(written).toMatchObject({ caseId: 1, actId: 2 });
    expect(
      written.deactivation.equals(
        Deactivation.hydrate({ reason: 'Cargado dos veces.', deactivatedByUserId: 5, deactivatedAt: NOW }),
      ),
    ).toBe(true);
    expect(fakes.cases.currentActUpdates).toHaveLength(1);
    expect(fakes.cases.currentActUpdates[0]).toMatchObject({ currentProceduralActId: 1, currentStateId: OPPOSITION.id });
    // El motivo queda en el acto, no en la auditoría (audit §4).
    expect(fakes.audit.entries).toEqual([
      {
        actorUserId: 5,
        action: 'procedural-act.deactivated',
        entityType: 'ProceduralAct',
        entityId: '2',
        occurredAt: NOW,
        metadata: { caseId: 1 },
      },
    ]);
    expect(fakes.transactions.calls).toBe(1);
  });

  /*
   * Orden de los chequeos, el del contrato (`:7001`, "Primero 404, después 403"):
   * 404 causa → 404 acto → 403 → 422 → 400. Cada fila trae además un motivo de
   * 501 caracteres, para probar que el chequeo anterior gana.
   */
  const deactivatedCase = () => {
    const target = aCaseInState({ currentAct: current() });
    target.deactivate(Deactivation.hydrate({ reason: null, deactivatedByUserId: 5, deactivatedAt: NOW }));
    return target;
  };
  const prescribed = () =>
    aCaseInState({ currentStateId: PRESCRIBED.id, prescriptionDeclaration: aPrescriptionDeclaration() });
  const inForce = () => aCaseInState({ currentAct: current() });

  it.each<[string, () => Case, Partial<DeactivateProceduralActCommand>, new (...args: never[]) => Error]>([
    ['una causa inexistente es 404', inForce, { caseId: 999 }, CaseNotFoundError],
    ['una causa dada de baja es 404', deactivatedCase, {}, CaseNotFoundError],
    ['un acto inexistente es 404, antes que otro abogado (CA-29.7)', inForce, { actId: 999, actor: anActor({ lawyerId: 99 }) }, ProceduralActNotFoundError],
    ['otro abogado es 403', inForce, { actor: anActor({ lawyerId: 99 }) }, NotResponsibleLawyerError],
    ['un administrador que no es el abogado responsable es 403', inForce, { actor: anActor({ roleNames: ['ADMINISTRATOR'] }) }, NotResponsibleLawyerError],
    ['una causa prescripta es 422, antes que el motivo', prescribed, {}, CaseInTerminalStateError],
  ])('%s, y no escribe nada', async (_label, existing, overrides, expected) => {
    const fakes = build(existing());

    await expect(
      fakes.useCase.execute(command({ input: { reason: 'a'.repeat(501) }, ...overrides })),
    ).rejects.toBeInstanceOf(expected);
    expectNothingWritten(fakes);
  });

  // CA-29.10
  it('un motivo de más de 500 caracteres es 400 y no escribe nada', async () => {
    const fakes = build();

    await expect(fakes.useCase.execute(command({ input: { reason: 'a'.repeat(501) } }))).rejects.toBeInstanceOf(
      ValidationError,
    );
    expectNothingWritten(fakes);
  });

  // CA-29.9: otro pedido dio de baja el mismo acto un momento antes.
  it('si el acto ya no estaba vigente al escribir, es 404 y no audita', async () => {
    const fakes = build();
    fakes.acts.alreadyDeactivatedOnSave = true;

    await expect(fakes.useCase.execute(command())).rejects.toBeInstanceOf(ProceduralActNotFoundError);
    expect(fakes.audit.entries).toEqual([]);
  });
});
