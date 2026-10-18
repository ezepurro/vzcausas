import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ClockPort } from '@shared/domain/clock.port';
import { ForbiddenActionError } from '@shared/domain/domain-error';
import {
  DashboardCaseRow,
  DashboardLawyerRef,
  LawyerDashboardQuery,
} from '../ports/lawyer-dashboard.query';
import { GetLawyerDashboard } from './get-lawyer-dashboard.use-case';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
/** Martes 6/10/2026: el 13/10 cae a 5 días hábiles y el 14/10 a 6. */
const TODAY = day('2026-10-06');
const clock: ClockPort = { now: () => new Date('2026-10-06T15:30:00.000Z'), today: () => TODAY };

const RIOS: DashboardLawyerRef = { id: 2, lastName: 'Ríos', firstName: 'Malena' };
const lawyerActor = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  userId: 5,
  roleNames: ['LAWYER'],
  lawyerId: RIOS.id,
  permissions: [],
  ...overrides,
});

let nextId = 1;
function aCase(overrides: Partial<DashboardCaseRow> = {}): DashboardCaseRow {
  const id = nextId++;
  return {
    caseId: id,
    sacNumber: `1000000${id}`,
    caption: `Causa ${id}`,
    jurisdiction: 'CRIMINAL',
    currentStateName: 'Citación a juicio',
    dueDate: null,
    lastProceduralActDate: null,
    lastInterruptiveActDate: null,
    responsibleLawyer: RIOS,
    ...overrides,
  };
}

class FakeDashboardQuery implements LawyerDashboardQuery {
  cases: DashboardCaseRow[] = [];
  lawyer: DashboardLawyerRef | null = RIOS;
  askedFor: number[] = [];

  async findLawyer(): Promise<DashboardLawyerRef | null> {
    return this.lawyer;
  }

  async findActiveCasesOf(lawyerId: number): Promise<DashboardCaseRow[]> {
    this.askedFor.push(lawyerId);
    return this.cases;
  }
}

describe('GetLawyerDashboard', () => {
  let query: FakeDashboardQuery;
  let useCase: GetLawyerDashboard;

  beforeEach(() => {
    nextId = 1;
    query = new FakeDashboardQuery();
    useCase = new GetLawyerDashboard(query, clock);
  });

  // CA-41.1
  it('es el tablero del abogado que pide, con la fecha del día', async () => {
    const view = await useCase.execute({ actor: lawyerActor() });

    expect(view.date).toEqual(TODAY);
    expect(view.lawyer).toEqual(RIOS);
    expect(query.askedFor).toEqual([RIOS.id]);
  });

  // CA-41.2 y CA-41.9: los bordes de cada indicador
  it('cuenta vencen hoy, vencidos y próximos 5 días hábiles en sus bordes', async () => {
    query.cases = [
      aCase({ dueDate: day('2026-10-05') }), // -1: vencido
      aCase({ dueDate: day('2026-10-06') }), //  0: hoy
      aCase({ dueDate: day('2026-10-07') }), //  1: próximo
      aCase({ dueDate: day('2026-10-13') }), //  5: próximo, el último
      aCase({ dueDate: day('2026-10-14') }), //  6: ya no es próximo
      aCase(), // sin plazo: no cuenta en ninguno
    ];

    const { summary, deadlines } = await useCase.execute({ actor: lawyerActor() });

    expect(deadlines.map((d) => d.businessDaysRemaining)).toEqual([-1, 0, 1, 5, 6]);
    expect(summary).toEqual({ dueToday: 1, overdue: 1, dueSoon: 2, activeCases: 6 });
  });

  it('un plazo que vence el lunes, visto el viernes, está a 1 día hábil (sábado y domingo no cuentan)', async () => {
    useCase = new GetLawyerDashboard(query, { now: () => new Date(), today: () => day('2026-10-09') });
    query.cases = [aCase({ dueDate: day('2026-10-12') })];

    const { deadlines, summary } = await useCase.execute({ actor: lawyerActor() });

    expect(deadlines[0].businessDaysRemaining).toBe(1);
    expect(summary.dueSoon).toBe(1);
  });

  // CA-41.3 y CA-41.4
  it('ordena los plazos por urgencia: los vencidos primero', async () => {
    query.cases = [
      aCase({ dueDate: day('2026-10-20') }),
      aCase({ dueDate: day('2026-10-01') }),
      aCase({ dueDate: day('2026-10-08') }),
    ];

    const { deadlines } = await useCase.execute({ actor: lawyerActor() });

    expect(deadlines.map((d) => d.caseId)).toEqual([2, 3, 1]);
    expect(deadlines[0]).toMatchObject({ kind: 'PROCEDURAL_ACT', caption: 'Causa 2', responsibleLawyer: RIOS });
  });

  // CA-41.7
  it('las causas sin plazo van a "para impulsar": primero las sin actos, después las más quietas', async () => {
    query.cases = [
      aCase({ lastProceduralActDate: day('2026-09-26') }), // 10 días
      aCase(), // sin actos
      aCase({ lastProceduralActDate: day('2026-07-28') }), // 70 días
      aCase({ dueDate: day('2026-10-08') }), // tiene plazo: no va
    ];

    const { casesToAdvance } = await useCase.execute({ actor: lawyerActor() });

    expect(casesToAdvance.map((c) => [c.caseId, c.daysSinceLastAct])).toEqual([
      [2, null],
      [3, 70],
      [1, 10],
    ]);
    expect(casesToAdvance[0].lastActDate).toBeNull();
  });

  it('la última actuación es la más reciente entre el acto procesal y el interruptivo', async () => {
    query.cases = [
      aCase({ lastProceduralActDate: day('2026-08-01'), lastInterruptiveActDate: day('2026-09-06') }),
      aCase({ lastProceduralActDate: day('2026-09-16'), lastInterruptiveActDate: day('2026-05-01') }),
    ];

    const { casesToAdvance } = await useCase.execute({ actor: lawyerActor() });

    expect(casesToAdvance.map((c) => [c.lastActDate, c.daysSinceLastAct])).toEqual([
      [day('2026-09-06'), 30],
      [day('2026-09-16'), 20],
    ]);
  });

  // CA-41.8, delegado a HU-52
  it('las alertas de prescripción van vacías hasta HU-52', async () => {
    query.cases = [aCase({ dueDate: day('2026-10-08') })];

    expect((await useCase.execute({ actor: lawyerActor() })).prescriptionAlerts).toEqual([]);
  });

  // CA-41.11
  it('un abogado sin causas recibe todo vacío y en cero, sin error', async () => {
    const view = await useCase.execute({ actor: lawyerActor() });

    expect(view.summary).toEqual({ dueToday: 0, overdue: 0, dueSoon: 0, activeCases: 0 });
    expect(view.deadlines).toEqual([]);
    expect(view.casesToAdvance).toEqual([]);
  });

  // CA-41.14
  it.each([
    ['sin rol de abogado', lawyerActor({ roleNames: ['ADMINISTRATOR'] })],
    ['la secretaría', lawyerActor({ roleNames: ['SECRETARY'], lawyerId: null })],
    ['un abogado sin ficha', lawyerActor({ lawyerId: null })],
  ])('rechaza a %s con 403 sin consultar nada', async (_caso, actor) => {
    const error = await useCase.execute({ actor }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenActionError);
    expect((error as Error).message).toBe('Se requiere el rol LAWYER para realizar esta operación.');
    expect(query.askedFor).toEqual([]);
  });
});
