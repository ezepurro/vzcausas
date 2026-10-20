import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { createCase } from '../../shared/factories/case.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import { createInitialState } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU42 Tablero del administrador: GET /dashboards/administrator (contrato V4 §3.11).
 *
 * "Hoy" es el martes 6/10/2026 (reloj fijo), igual que en el tablero del
 * abogado (HU41). El escenario ya trae dos abogados (`lawyer` y
 * `otherLawyer`) y una causa penal del primero, sin plazo: ese es el piso de
 * cada test.
 */
type Body = Record<string, any>;
const URL = '/api/v1/dashboards/administrator';

describe('GET /api/v1/dashboards/administrator', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;

  const server = () => request(app.getHttpServer());
  const dashboard = async (actor: { Authorization: string } = s.administrator): Promise<Body> =>
    expectData<Body>(await server().get(URL).set(actor), 200);

  const newCaseFor = (lawyerId: number, overrides: Record<string, unknown> = {}) =>
    createCase({ clientId: s.client.id, responsibleLawyerId: lawyerId, createdByUserId: s.user.id, ...overrides });

  /** Registra un acto por la API, con el vencimiento en la fecha pedida, como el abogado responsable de esa causa. */
  const actDueOnAs = async (
    actor: { Authorization: string },
    caseId: number,
    dueDate: string,
    options: { actDate?: string; stateId?: number; notificationDate?: string } = {},
  ) => {
    const res = await server()
      .post(`/api/v1/cases/${caseId}/procedural-acts`)
      .set(actor)
      .send({
        proceduralStateId: options.stateId ?? s.states.fiveBusinessDays.stateId,
        actDate: options.actDate ?? '2026-10-01',
        manualDueDate: dueDate,
        ...(options.notificationDate ? { notificationDate: options.notificationDate } : {}),
      });
    if (res.status !== 201) throw new Error(`acto: ${res.status} ${JSON.stringify(res.body)}`);
  };

  /** Una causa de amparo: el único fuero que no crea la fábrica `createCase` (CreateCaseOverrides no lo acepta). */
  const newAmparoCase = async (lawyerId: number) => {
    const initial = await createInitialState('AMPARO');
    return getPrisma().case.create({
      data: {
        caption: 'MOYANO, Daniela c/ APROSS — Amparo de salud',
        jurisdictionId: initial.jurisdictionId,
        proceduralRole: 'ACTORA',
        subjectMatter: 'Objeto del amparo',
        clientId: s.client.id,
        responsibleLawyerId: lawyerId,
        startDate: new Date('2021-03-12T00:00:00.000Z'),
        currentStateId: initial.stateId,
        createdByUserId: s.user.id,
      },
    });
  };

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
  });

  afterAll(async () => {
    await resetProceduralActData();
    await stopTestApp();
  });

  beforeEach(async () => {
    s = await setUpProceduralActScenario();
  });

  // CA-42.1 y CA-42.2: todo el estudio, no un abogado
  it('devuelve el tablero de todo el estudio, en la forma del contrato', async () => {
    await actDueOnAs(s.responsible, s.caseRow.id, '2026-10-06');
    const otherCase = await newCaseFor(s.otherLawyer.id);
    await actDueOnAs(s.notResponsible, otherCase.id, '2026-10-02');

    const body = await dashboard();

    expect(Object.keys(body).sort()).toEqual(
      ['casesByJurisdiction', 'date', 'deadlines', 'prescriptionAlerts', 'summary', 'team'].sort(),
    );
    expect(body.date).toBe('2026-10-06');
    expect(body.summary).toEqual({ dueToday: 1, overdue: 1, dueSoon: 0, activeCases: 2 });
  });

  // CA-42.3: siempre los tres fueros, aunque alguno tenga cero
  it('cuenta las causas activas de cada fuero, con los tres fueros presentes', async () => {
    await newCaseFor(s.lawyer.id); // CRIMINAL: el de "s.caseRow" + este = 2
    await newAmparoCase(s.otherLawyer.id); // AMPARO: 1
    // Ninguna causa administrativa: tiene que aparecer en 0.

    const { casesByJurisdiction } = await dashboard();

    expect(casesByJurisdiction).toEqual([
      { jurisdiction: 'CRIMINAL', activeCases: 2 },
      { jurisdiction: 'ADMINISTRATIVE', activeCases: 0 },
      { jurisdiction: 'AMPARO', activeCases: 1 },
    ]);
  });

  // CA-42.4: todos los plazos del estudio, por urgencia, con su responsable
  it('lista los plazos de todo el estudio por urgencia, con el abogado responsable de cada uno', async () => {
    const mine = await newCaseFor(s.lawyer.id, { caption: 'GÓMEZ, Ariel p.s.a. Robo' });
    const theirs = await newCaseFor(s.otherLawyer.id, { caption: 'PEREYRA, Marcos — Sumario', jurisdiction: 'ADMINISTRATIVE' });
    await actDueOnAs(s.responsible, mine.id, '2026-10-20');
    await actDueOnAs(s.notResponsible, theirs.id, '2026-10-02', {
      stateId: s.states.administrative.stateId,
      notificationDate: '2026-10-01',
    });

    const { deadlines } = await dashboard();

    expect(deadlines.map((d: Body) => [d.caseId, d.responsibleLawyer])).toEqual([
      [theirs.id, { id: s.otherLawyer.id, lastName: s.otherLawyer.lastName, firstName: s.otherLawyer.firstName }],
      [mine.id, { id: s.lawyer.id, lastName: s.lawyer.lastName, firstName: s.lawyer.firstName }],
    ]);
  });

  // CA-42.5
  describe('alertas de prescripción', () => {
    let qualificationSequence = 0;
    const qualification = (prescriptionMonths: number) =>
      createLegalQualification({ name: `HU42 calificación ${++qualificationSequence}`, prescriptionMonths });

    const withOffense = async (caseId: number, qualificationId: number) =>
      getPrisma().offense.create({
        data: {
          caseId,
          legalQualificationId: qualificationId,
          offenseDate: new Date('2018-10-06T00:00:00.000Z'),
          prescriptionDate: new Date('2028-10-06T00:00:00.000Z'),
        },
      });

    afterAll(async () => {
      await resetProceduralActData();
      await getPrisma().legalQualification.deleteMany({ where: { name: { startsWith: 'HU42 calificación' } } });
    });

    it('lista las causas en alerta de prescripción de todo el estudio, con su abogado responsable', async () => {
      const near = await newCaseFor(s.otherLawyer.id, { caption: 'ACOSTA, Jonathan p.s.a. Infracción Ley 23.737' });
      await withOffense(near.id, (await qualification(120)).id); // 80 %: entra
      await withOffense(s.caseRow.id, (await qualification(240)).id); // 40 %: no entra

      const { prescriptionAlerts } = await dashboard();

      expect(prescriptionAlerts).toEqual([
        expect.objectContaining({
          caseId: near.id,
          responsibleLawyer: { id: s.otherLawyer.id, lastName: s.otherLawyer.lastName, firstName: s.otherLawyer.firstName },
          elapsedPercentage: 80,
        }),
      ]);
    });
  });

  // CA-42.6 y CA-42.7
  it('muestra la carga de cada abogado vigente y los ordena por urgencia: más vencidos primero', async () => {
    const thirdLawyer = await createLawyer({ lastName: 'Aguirre', firstName: 'Noelia' });
    // s.lawyer: una causa vencida (la del escenario, sin acto, no cuenta como plazo).
    const overdueOne = await newCaseFor(s.lawyer.id);
    const overdueTwo = await newCaseFor(s.otherLawyer.id);
    const overdueThree = await newCaseFor(s.otherLawyer.id);
    await actDueOnAs(s.responsible, overdueOne.id, '2026-10-02');
    await actDueOnAs(s.notResponsible, overdueTwo.id, '2026-10-02');
    await actDueOnAs(s.notResponsible, overdueThree.id, '2026-10-05');
    // thirdLawyer no tiene ninguna causa.

    const { team } = await dashboard();

    expect(team.map((t: Body) => [t.lawyer.id, t.activeCases, t.openDeadlines.overdue])).toEqual([
      [s.otherLawyer.id, 2, 2],
      [s.lawyer.id, 2, 1], // s.caseRow (sin plazo) + overdueOne
      [thirdLawyer.id, 0, 0],
    ]);
  });

  // CA-42.9
  it.each<TestRole>(['SECRETARY', 'LAWYER'])('responde 403 a %s sin rol de administrador', async (role) => {
    const user = await createUser({ roles: [role], lawyerId: null, passwordHash: await bcrypt.hash('password1', 4) });
    const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: 'password1' });

    const res = await server().get(URL).set({ Authorization: `Bearer ${login.body.data.accessToken}` });

    expectError(res, 403, 'FORBIDDEN');
    expect(res.body.error.message).toBe('Se requiere el rol ADMINISTRATOR para realizar esta operación.');
  });

  it('exige autenticación', async () => {
    await server().get(URL).expect(401);
  });

  it('un estudio sin plazos ni alertas, aparte de la causa del escenario, recibe el tablero al día', async () => {
    const body = await dashboard();

    expect(body.summary).toEqual({ dueToday: 0, overdue: 0, dueSoon: 0, activeCases: 1 });
    expect(body.deadlines).toEqual([]);
    expect(body.prescriptionAlerts).toEqual([]);
    // Los dos empatan en cero: el orden entre ellos depende del apellido, que
    // `otherLawyer` recibe al azar del escenario — se verifica el contenido,
    // no la posición relativa de estos dos.
    expect(body.team).toHaveLength(2);
    expect(body.team).toContainEqual({
      lawyer: { id: s.lawyer.id, lastName: s.lawyer.lastName, firstName: s.lawyer.firstName },
      activeCases: 1,
      openDeadlines: { overdue: 0, dueToday: 0, dueSoon: 0, later: 0 },
    });
    expect(body.team).toContainEqual({
      lawyer: { id: s.otherLawyer.id, lastName: s.otherLawyer.lastName, firstName: s.otherLawyer.firstName },
      activeCases: 0,
      openDeadlines: { overdue: 0, dueToday: 0, dueSoon: 0, later: 0 },
    });
  });
});
