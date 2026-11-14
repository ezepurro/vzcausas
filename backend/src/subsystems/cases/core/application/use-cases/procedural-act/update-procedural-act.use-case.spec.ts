import { ValidationError } from '@shared/domain/domain-error';
import { Case } from '../../../domain/entities/case/case.entity';
import {
  CaseInTerminalStateError,
  CaseNotFoundError,
  NotResponsibleLawyerError,
  ProceduralActNotFoundError,
} from '../../../domain/errors/case.errors';
import { ProceduralActView } from '../../../domain/ports/procedural-act/procedural-act.repository';
import { Deactivation } from '@shared/domain/deactivation.vo';
import { DayType } from '../../../domain/value-objects/deadline/day-type';
import {
  FakeAuditTrail,
  FakeCaseRepository,
  FakeClock,
  FakeDeadlineCalculator,
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
import { GetProceduralAct } from './get-procedural-act.use-case';
import { UpdateProceduralAct, UpdateProceduralActCommand } from './update-procedural-act.use-case';

/*
 * HU28 · Modificar acto procesal. Solo lo que es del caso de uso: el orden de
 * los chequeos, que un rechazo no escriba nada, qué plazo le pide al calculador,
 * la transacción y la auditoría. Las reglas, en `case-modify-procedural-act.spec.ts`
 * y `procedural-act.entity.spec.ts`.
 *
 * La causa 1 está en el acto 1 (30/09/2026, "Oposición…", 5 días hábiles).
 */

/** Lo que responde `GetProceduralAct`: acá alcanza con saber que se lo pidió para el acto correcto. */
const RESPONSE = { marker: 'GetProceduralAct' } as unknown as ProceduralActView;

function build(existing: Case = aCaseInState({ currentAct: anAct() })) {
  const cases = new FakeCaseRepository([...Object.values(INITIAL_STATES), ...STATES_TABLE]);
  cases.add(existing);
  const acts = new FakeProceduralActRepository();
  acts.views.push({ act: anAct(), resultingStateName: OPPOSITION.name, registeredBy: LAWYER });
  const calculator = new FakeDeadlineCalculator();
  const audit = new FakeAuditTrail();
  const transactions = new FakeTransactionManager();
  const asked: { caseId: number; actId: number }[] = [];
  const getProceduralAct = {
    execute: async (query: { caseId: number; actId: number }) => {
      asked.push(query);
      return RESPONSE;
    },
  } as GetProceduralAct;
  const useCase = new UpdateProceduralAct(
    cases,
    acts,
    new FakeLegalParametersLookup(INITIAL_STATES, [], STATES_TABLE),
    calculator,
    audit,
    transactions,
    new FakeClock(NOW, TODAY),
    getProceduralAct,
  );
  return { useCase, cases, acts, calculator, audit, transactions, asked };
}

const command = (overrides: Partial<UpdateProceduralActCommand> = {}): UpdateProceduralActCommand => ({
  caseId: 1,
  actId: 1,
  changes: { actDate: day('2026-09-28'), notes: 'Se corrigió la fecha.' },
  actor: anActor({ userId: 5 }),
  ...overrides,
});

/** Nada escrito: ni el acto, ni la causa, ni la auditoría. */
function expectNothingWritten(fakes: ReturnType<typeof build>) {
  expect(fakes.acts.modifications).toEqual([]);
  expect(fakes.cases.currentActUpdates).toEqual([]);
  expect(fakes.audit.entries).toEqual([]);
}

describe('UpdateProceduralAct', () => {
  // CA-28.1, CA-28.5, CA-28.10
  it('guarda el acto con el plazo copiado, recalcula la causa, audita y responde con GetProceduralAct', async () => {
    const fakes = build();

    const result = await fakes.useCase.execute(command());

    expect(result).toBe(RESPONSE);
    expect(fakes.asked).toEqual([{ caseId: 1, actId: 1 }]);
    // El estado no cambió: el plazo es el que el acto copió, contado desde la fecha nueva.
    expect(fakes.calculator.calls).toEqual([{ countsFrom: day('2026-09-28'), days: 5, dayType: DayType.BUSINESS }]);
    expect(fakes.acts.modifications).toHaveLength(1);
    const saved = fakes.acts.modifications[0];
    expect(saved.actDate).toEqual(day('2026-09-28'));
    expect(saved.notes).toBe('Se corrigió la fecha.');
    expect(saved.lastModifiedByUserId).toBe(5);
    expect(saved.lastModifiedAt).toBe(NOW);
    expect(fakes.cases.currentActUpdates).toEqual([
      { currentProceduralActId: 1, currentStateId: OPPOSITION.id, currentCustomState: null },
    ]);
    expect(fakes.transactions.calls).toBe(1);
    expect(fakes.audit.entries).toEqual([
      {
        actorUserId: 5,
        action: 'procedural-act.updated',
        entityType: 'ProceduralAct',
        entityId: '1',
        occurredAt: NOW,
        // Solo los nombres de los campos, nunca sus valores (AUDITORIA_Y_TRAZABILIDAD.md §4).
        metadata: { caseId: 1, changedFields: ['actDate', 'notes'] },
      },
    ]);
  });

  // CA-28.4
  it('si cambia el estado, le pide al calculador el plazo de la tabla del estado nuevo', async () => {
    const fakes = build();

    await fakes.useCase.execute(command({ changes: { proceduralStateId: SUMMONS.id } }));

    expect(fakes.calculator.calls).toEqual([{ countsFrom: day('2026-09-30'), days: 10, dayType: DayType.CONSECUTIVE }]);
  });

  // CA-28.7
  it('si otro acto queda como el más reciente, la causa pasa a ese', async () => {
    const fakes = build();
    fakes.acts.latestOther = anAct({ id: 2, proceduralStateId: SUMMONS.id, actDate: day('2026-10-02') });

    await fakes.useCase.execute(command());

    expect(fakes.cases.currentActUpdates).toEqual([
      { currentProceduralActId: 2, currentStateId: SUMMONS.id, currentCustomState: null },
    ]);
  });

  // Decisión del 05/11/2026: un PATCH válido sin cambios reales responde 200 sin escribir nada.
  it('sin cambios reales responde el acto y no escribe nada', async () => {
    const fakes = build();

    const result = await fakes.useCase.execute(command({ changes: { actDate: day('2026-09-30'), notes: null } }));

    expect(result).toBe(RESPONSE);
    expectNothingWritten(fakes);
    expect(fakes.transactions.calls).toBe(0);
  });

  /*
   * Orden de los chequeos: 404 causa → 403 → 404 acto → 422 → 400. Cada fila
   * trae además datos inválidos, para probar que el chequeo anterior gana.
   */
  const deactivated = () => {
    const target = aCaseInState({ currentAct: anAct() });
    target.deactivate(Deactivation.hydrate({ reason: null, deactivatedByUserId: 5, deactivatedAt: NOW }));
    return target;
  };
  const prescribed = () =>
    aCaseInState({ currentStateId: PRESCRIBED.id, prescriptionDeclaration: aPrescriptionDeclaration() });

  it.each<[string, () => Case, Partial<UpdateProceduralActCommand>, new (...args: never[]) => Error]>([
    ['una causa inexistente es 404', () => aCaseInState({ currentAct: anAct() }), { caseId: 999 }, CaseNotFoundError],
    ['una causa dada de baja es 404', deactivated, {}, CaseNotFoundError],
    ['otro abogado es 403, antes que el acto inexistente', () => aCaseInState({ currentAct: anAct() }), { actId: 999, actor: anActor({ lawyerId: 99 }) }, NotResponsibleLawyerError],
    ['un acto inexistente o de otra causa es 404', () => aCaseInState({ currentAct: anAct() }), { actId: 999 }, ProceduralActNotFoundError],
    ['una causa prescripta es 422, antes que los datos', prescribed, {}, CaseInTerminalStateError],
  ])('%s, y no escribe nada', async (_label, existing, overrides, expected) => {
    const fakes = build(existing());

    await expect(
      fakes.useCase.execute(command({ changes: { actDate: day('2026-10-07') }, ...overrides })),
    ).rejects.toBeInstanceOf(expected);
    expectNothingWritten(fakes);
  });

  // CA-28.3: está conectada la validación del acto resultante.
  it('datos inválidos son 400 y no escriben nada', async () => {
    const fakes = build();

    await expect(fakes.useCase.execute(command({ changes: { actDate: day('2026-10-07') } }))).rejects.toBeInstanceOf(
      ValidationError,
    );
    expectNothingWritten(fakes);
  });
});
