import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ClockPort } from '@shared/domain/clock.port';
import { ForbiddenActionError } from '@shared/domain/domain-error';
import { DashboardLawyerRef } from '../ports/lawyer-dashboard.query';
import { aCase, day, FakeDashboardQuery, resetCaseIds, RIOS } from '../../test-support/dashboard-fakes';
import { GetAdministratorDashboard } from './get-administrator-dashboard.use-case';

/** Martes 6/10/2026, mismo reloj fijo que el de "Mi día". */
const TODAY = day('2026-10-06');
const clock: ClockPort = { now: () => new Date('2026-10-06T15:30:00.000Z'), today: () => TODAY };

const PERALTA: DashboardLawyerRef = { id: 4, lastName: 'Peralta', firstName: 'Ignacio' };

const adminActor = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  userId: 1,
  roleNames: ['ADMINISTRATOR'],
  lawyerId: null,
  permissions: [],
  ...overrides,
});

describe('GetAdministratorDashboard', () => {
  let query: FakeDashboardQuery;
  let useCase: GetAdministratorDashboard;

  beforeEach(() => {
    resetCaseIds();
    query = new FakeDashboardQuery();
    query.lawyers = [RIOS, PERALTA];
    useCase = new GetAdministratorDashboard(query, clock);
  });

  // CA-42.1 y CA-42.2: el alcance es todo el estudio, no un abogado
  it('es el tablero de todo el estudio, con la fecha del día', async () => {
    query.cases = [
      aCase({ responsibleLawyer: RIOS, dueDate: day('2026-10-06') }),
      aCase({ responsibleLawyer: PERALTA, dueDate: day('2026-10-05') }),
    ];

    const view = await useCase.execute({ actor: adminActor() });

    expect(view.date).toEqual(TODAY);
    expect(view.summary).toEqual({ dueToday: 1, overdue: 1, dueSoon: 0, activeCases: 2 });
    expect(query.askedFor).toEqual([]); // no usa findActiveCasesOf: ese es el de HU41
  });

  // CA-42.3: siempre los tres fueros, aunque alguno tenga cero
  it('cuenta las causas activas de cada fuero, con los tres fueros presentes', async () => {
    query.cases = [aCase({ jurisdiction: 'CRIMINAL' }), aCase({ jurisdiction: 'CRIMINAL' }), aCase({ jurisdiction: 'AMPARO' })];

    const { casesByJurisdiction } = await useCase.execute({ actor: adminActor() });

    expect(casesByJurisdiction).toEqual([
      { jurisdiction: 'CRIMINAL', activeCases: 2 },
      { jurisdiction: 'ADMINISTRATIVE', activeCases: 0 },
      { jurisdiction: 'AMPARO', activeCases: 1 },
    ]);
  });

  // CA-42.4: todos los plazos del estudio, por urgencia, con su responsable
  it('lista los plazos de todo el estudio por urgencia, con el abogado responsable', async () => {
    query.cases = [
      aCase({ responsibleLawyer: PERALTA, dueDate: day('2026-10-20') }),
      aCase({ responsibleLawyer: RIOS, dueDate: day('2026-10-01') }),
    ];

    const { deadlines } = await useCase.execute({ actor: adminActor() });

    expect(deadlines.map((d) => [d.caseId, d.responsibleLawyer])).toEqual([
      [2, RIOS],
      [1, PERALTA],
    ]);
  });

  // CA-42.5
  it('lista las causas en alerta de prescripción de todo el estudio', async () => {
    const offense = (months: number) => ({
      legalQualificationId: months,
      legalQualificationName: `Calificación de ${months} meses`,
      prescriptionMonths: months,
      offenseDate: day('2018-10-06'),
    });
    query.cases = [
      aCase({ responsibleLawyer: RIOS, offenses: [offense(120)] }), // 80 %: entra
      aCase({ responsibleLawyer: PERALTA, offenses: [offense(240)] }), // 40 %: no entra
    ];

    const { prescriptionAlerts } = await useCase.execute({ actor: adminActor() });

    expect(prescriptionAlerts.map((a) => [a.caseId, a.responsibleLawyer])).toEqual([[1, RIOS]]);
  });

  // CA-42.6: un elemento por abogado vigente, tenga o no causas
  it('muestra la carga de cada abogado vigente, tenga o no causas', async () => {
    query.cases = [
      aCase({ responsibleLawyer: RIOS, dueDate: day('2026-10-05') }), // vencida
      aCase({ responsibleLawyer: RIOS, dueDate: day('2026-10-06') }), // hoy
    ];
    // PERALTA no tiene ninguna causa.

    const { team } = await useCase.execute({ actor: adminActor() });

    expect(team).toEqual([
      { lawyer: RIOS, activeCases: 2, openDeadlines: { overdue: 1, dueToday: 1, dueSoon: 0, later: 0 } },
      { lawyer: PERALTA, activeCases: 0, openDeadlines: { overdue: 0, dueToday: 0, dueSoon: 0, later: 0 } },
    ]);
  });

  // CA-42.7: primero los que tienen más plazos vencidos
  it('ordena a los abogados por urgencia: más vencidos primero, después por apellido', async () => {
    const RÍOS_2: DashboardLawyerRef = { id: 3, lastName: 'Ríos', firstName: 'Zulema' };
    query.lawyers = [PERALTA, RIOS, RÍOS_2];
    query.cases = [
      aCase({ responsibleLawyer: PERALTA, dueDate: day('2026-10-05') }), // 1 vencido
      aCase({ responsibleLawyer: RIOS, dueDate: day('2026-10-05') }), // 1 vencido
      aCase({ responsibleLawyer: RIOS, dueDate: day('2026-10-05') }), // 2 vencidos
      aCase({ responsibleLawyer: RÍOS_2, dueDate: day('2026-10-13') }), // sin vencidos, 1 "próx. 5 días"
    ];

    const { team } = await useCase.execute({ actor: adminActor() });

    expect(team.map((t) => t.lawyer)).toEqual([RIOS, PERALTA, RÍOS_2]);
  });

  // CA-42.9
  it.each([
    ['la secretaría', adminActor({ roleNames: ['SECRETARY'] })],
    ['un abogado que no es administrador', adminActor({ roleNames: ['LAWYER'], lawyerId: RIOS.id })],
  ])('rechaza a %s con 403 sin consultar nada', async (_caso, actor) => {
    const error = await useCase.execute({ actor }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenActionError);
    expect((error as Error).message).toBe('Se requiere el rol ADMINISTRATOR para realizar esta operación.');
    expect(query.calledFindAllActiveCases).toBe(false);
    expect(query.calledFindActiveLawyers).toBe(false);
  });

  it('un estudio sin plazos, alertas ni causas recibe todo vacío y en cero', async () => {
    query.lawyers = [];

    const view = await useCase.execute({ actor: adminActor() });

    expect(view.summary).toEqual({ dueToday: 0, overdue: 0, dueSoon: 0, activeCases: 0 });
    expect(view.deadlines).toEqual([]);
    expect(view.prescriptionAlerts).toEqual([]);
    expect(view.team).toEqual([]);
    expect(view.casesByJurisdiction).toEqual([
      { jurisdiction: 'CRIMINAL', activeCases: 0 },
      { jurisdiction: 'ADMINISTRATIVE', activeCases: 0 },
      { jurisdiction: 'AMPARO', activeCases: 0 },
    ]);
  });
});
