import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
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
 * HU41 y HU42 — los tableros: GET /dashboards/lawyer y GET /dashboards/administrator
 * (API_CONTRACT_V5.md §3.11, :6953). El 401 está en el smoke.
 *
 * "Hoy" es el martes 6/10/2026 (reloj fijo). Los plazos se fijan con el
 * vencimiento manual del registro de actos, para que cada uno caiga en la
 * fecha exacta que el indicador necesita. El escenario trae dos abogados
 * (`lawyer` y `otherLawyer`) y una causa penal del primero, sin actos: es el
 * piso de cada test.
 */
type Body = Record<string, any>;
type Actor = { Authorization: string };
const LAWYER_URL = '/api/v1/dashboards/lawyer';
const ADMINISTRATOR_URL = '/api/v1/dashboards/administrator';
const QUALIFICATION_PREFIX = 'Tablero calificación';

describe('Tableros (HU41, HU42)', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;

  const server = () => request(app.getHttpServer());

  const newCaseFor = (lawyerId: number, overrides: Record<string, unknown> = {}) =>
    createCase({ clientId: s.client.id, responsibleLawyerId: lawyerId, createdByUserId: s.user.id, ...overrides });

  /** Registra un acto por la API, con el vencimiento en la fecha pedida, como el abogado responsable de esa causa. */
  const actDueOnAs = async (
    actor: Actor,
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

  /** Nombres propios: el contador del factory se reinicia en cada archivo y chocaría con otros specs. */
  let qualificationSequence = 0;
  const qualification = (prescriptionMonths: number) =>
    createLegalQualification({ name: `${QUALIFICATION_PREFIX} ${++qualificationSequence}`, prescriptionMonths });

  /** Le carga a la causa un hecho del 6/10/2018 con esa calificación. */
  const withOffense = async (caseId: number, qualificationId: number) =>
    getPrisma().offense.create({
      data: {
        caseId,
        legalQualificationId: qualificationId,
        offenseDate: new Date('2018-10-06T00:00:00.000Z'),
        prescriptionDate: new Date('2028-10-06T00:00:00.000Z'),
      },
    });

  /** Un token de un usuario real con ese rol, sacado del login (CA-41.14, CA-42.9). */
  const realLogin = async (role: TestRole): Promise<Actor> => {
    const user = await createUser({ roles: [role], lawyerId: null, passwordHash: await bcrypt.hash('password1', 4) });
    const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: 'password1' });
    return { Authorization: `Bearer ${login.body.data.accessToken}` };
  };

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
  });

  afterAll(async () => {
    await resetProceduralActData();
    await getPrisma().legalQualification.deleteMany({ where: { name: { startsWith: QUALIFICATION_PREFIX } } });
    await stopTestApp();
  });

  beforeEach(async () => {
    s = await setUpProceduralActScenario();
  });

  // ── HU41: tablero del abogado ────────────────────────────────────────

  describe(`GET ${LAWYER_URL}`, () => {
    const dashboard = async (actor: Actor = s.responsible): Promise<Body> =>
      expectData<Body>(await server().get(LAWYER_URL).set(actor), 200);

    /** Una causa penal del abogado responsable del escenario. */
    const newCase = (overrides: Record<string, unknown> = {}) => newCaseFor(s.lawyer.id, overrides);
    const actDueOn = (caseId: number, dueDate: string) => actDueOnAs(s.responsible, caseId, dueDate);

    /** Un acto sin plazo: la causa queda sin vencimiento abierto. */
    const actWithoutTerm = async (caseId: number, actDate: string) => {
      const res = await server()
        .post(`/api/v1/cases/${caseId}/procedural-acts`)
        .set(s.responsible)
        .send({ proceduralStateId: s.states.withoutTerm.stateId, actDate });
      if (res.status !== 201) throw new Error(`acto: ${res.status} ${JSON.stringify(res.body)}`);
    };

    // CA-41.1
    it('devuelve el tablero del abogado en la forma del contrato', async () => {
      const withDeadline = await newCase({ caption: 'GÓMEZ, Ariel p.s.a. Robo' });
      await actDueOn(withDeadline.id, '2026-10-06');

      const body = await dashboard();

      expect(Object.keys(body).sort()).toEqual(
        ['casesToAdvance', 'date', 'deadlines', 'lawyer', 'prescriptionAlerts', 'summary'].sort(),
      );
      expect(body.date).toBe('2026-10-06');
      expect(body.lawyer).toEqual({ id: s.lawyer.id, lastName: s.lawyer.lastName, firstName: s.lawyer.firstName });
      expect(body.deadlines[0]).toEqual({
        caseId: withDeadline.id,
        kind: 'PROCEDURAL_ACT',
        sacNumber: withDeadline.sacNumber,
        caption: 'GÓMEZ, Ariel p.s.a. Robo',
        jurisdiction: 'CRIMINAL',
        currentStateName: 'Oposición al requerimiento de elevación',
        responsibleLawyer: { id: s.lawyer.id, lastName: s.lawyer.lastName, firstName: s.lawyer.firstName },
        dueDate: '2026-10-06',
        businessDaysRemaining: 0,
      });
      // Una causa sin calificaciones no computa prescripción.
      expect(body.prescriptionAlerts).toEqual([]);
    });

    // CA-41.8
    it('lista las causas penales con el 70 % o más, en la forma del contrato', async () => {
      const tenYears = await qualification(120); // vence el 6/10/2028: 80 %
      const twentyYears = await qualification(240); // 40 %: no
      const near = await newCase({ caption: 'ACOSTA, Jonathan p.s.a. Infracción Ley 23.737' });
      const far = await newCase();
      await withOffense(near.id, tenYears.id);
      await withOffense(far.id, twentyYears.id);

      const { prescriptionAlerts } = await dashboard();

      expect(prescriptionAlerts).toEqual([
        {
          caseId: near.id,
          sacNumber: near.sacNumber,
          caption: 'ACOSTA, Jonathan p.s.a. Infracción Ley 23.737',
          responsibleLawyer: { id: s.lawyer.id, lastName: s.lawyer.lastName, firstName: s.lawyer.firstName },
          legalQualificationName: tenYears.name,
          startsOn: '2018-10-06',
          expiresOn: '2028-10-06',
          elapsedPercentage: 80,
          expired: false,
        },
      ]);
    });

    // CA-41.8 y CA-41.7: el acto interruptivo reinicia el cómputo y es la última actuación de la causa.
    it('un acto interruptivo registrado por la API la saca de las alertas y pasa a ser su última actuación', async () => {
      await withOffense(s.caseRow.id, (await qualification(120)).id);
      await actWithoutTerm(s.caseRow.id, '2026-08-01');
      expect((await dashboard()).prescriptionAlerts).toHaveLength(1);

      await server()
        .post(`/api/v1/cases/${s.caseRow.id}/interruptive-acts`)
        .set(s.responsible)
        .send({ name: 'Indagatoria', actDate: '2026-09-06' })
        .expect(201);

      const body = await dashboard();
      expect(body.prescriptionAlerts).toEqual([]);
      expect(body.casesToAdvance).toEqual([
        expect.objectContaining({ caseId: s.caseRow.id, lastActDate: '2026-09-06', daysSinceLastAct: 30 }),
      ]);
    });

    // CA-41.2, CA-41.9; CA-41.1: solo sus causas
    it('cuenta los indicadores en días hábiles, sin las causas de otro abogado', async () => {
      await actDueOn((await newCase()).id, '2026-10-06'); // hoy
      await actDueOn((await newCase()).id, '2026-10-02'); // vencido
      await actDueOn((await newCase()).id, '2026-10-09'); // 3 días hábiles
      await actDueOn((await newCase()).id, '2026-10-14'); // 6 días hábiles: no es "próximo"
      // + la causa del escenario, sin actos.
      const theirs = await newCaseFor(s.otherLawyer.id);
      await actDueOnAs(s.notResponsible, theirs.id, '2026-10-06'); // de otro abogado: no cuenta

      expect((await dashboard()).summary).toEqual({ dueToday: 1, overdue: 1, dueSoon: 1, activeCases: 5 });
    });

    // CA-41.3, CA-41.4
    it('ordena los plazos por urgencia: el vencido primero', async () => {
      const later = await newCase();
      const overdue = await newCase();
      const today = await newCase();
      await actDueOn(later.id, '2026-10-20');
      await actDueOn(overdue.id, '2026-10-02');
      await actDueOn(today.id, '2026-10-06');

      const { deadlines } = await dashboard();

      expect(deadlines.map((d: Body) => [d.caseId, d.businessDaysRemaining])).toEqual([
        [overdue.id, -2],
        [today.id, 0],
        [later.id, 10],
      ]);
    });

    // CA-41.7, CA-41.12
    it('lista para impulsar las causas sin plazo, con su última actuación, y refleja un acto apenas se registra', async () => {
      const quiet = await newCase();
      await actWithoutTerm(quiet.id, '2026-09-26');

      const { casesToAdvance } = await dashboard();

      expect(casesToAdvance).toEqual([
        {
          caseId: s.caseRow.id,
          sacNumber: s.caseRow.sacNumber,
          caption: s.caseRow.caption,
          jurisdiction: 'CRIMINAL',
          currentStateName: 'Iniciada',
          lastActDate: null,
          daysSinceLastAct: null,
        },
        expect.objectContaining({
          caseId: quiet.id,
          currentStateName: 'Con vista al fiscal',
          lastActDate: '2026-09-26',
          daysSinceLastAct: 10,
        }),
      ]);

      // CA-41.12: un acto con plazo la pasa de "para impulsar" a los plazos en la lectura siguiente.
      await actDueOn(s.caseRow.id, '2026-10-08');

      const after = await dashboard();
      expect(after.deadlines.map((d: Body) => d.caseId)).toEqual([s.caseRow.id]);
      expect(after.casesToAdvance.map((c: Body) => c.caseId)).toEqual([quiet.id]);
    });

    // CA-41.10, CA-41.8
    it('cuenta solo las causas activas: ni dadas de baja ni terminales; sí las de estado escrito a mano', async () => {
      const deactivated = await newCase();
      await deactivateCase(deactivated.id);
      await newCase({ currentStateId: s.states.terminal.stateId });
      // Prescripta, con un hecho que hoy cumple el plazo: es terminal y no entra en las alertas.
      const prescribed = await newCase({ currentStateId: s.states.prescribed.stateId });
      await withOffense(prescribed.id, (await qualification(96)).id);
      const custom = await newCase({ currentCustomState: 'En espera de pericia' });

      const body = await dashboard();

      expect(body.summary.activeCases).toBe(2);
      expect(body.casesToAdvance.map((c: Body) => c.caseId).sort()).toEqual([s.caseRow.id, custom.id].sort());
      expect(body.casesToAdvance.find((c: Body) => c.caseId === custom.id).currentStateName).toBe('En espera de pericia');
      expect(body.prescriptionAlerts).toEqual([]);
    });

    // CA-41.11
    it('un abogado sin causas recibe el tablero vacío, sin error', async () => {
      const body = await dashboard(s.notResponsible);

      expect(body.summary).toEqual({ dueToday: 0, overdue: 0, dueSoon: 0, activeCases: 0 });
      expect(body.deadlines).toEqual([]);
      expect(body.casesToAdvance).toEqual([]);
    });

    // CA-41.14, con login real; y un token de abogado sin ficha
    it('responde 403 a quien no tiene rol de abogado o no tiene ficha de abogado', async () => {
      for (const role of ['SECRETARY', 'ADMINISTRATOR'] as TestRole[]) {
        const res = await server().get(LAWYER_URL).set(await realLogin(role));

        expectError(res, 403, 'FORBIDDEN');
        expect(res.body.error.message).toBe('Se requiere el rol LAWYER para realizar esta operación.');
      }

      const withoutRecord = loginAs({ userId: s.user.id, roles: ['LAWYER'], lawyerId: null });
      expectError(await server().get(LAWYER_URL).set(withoutRecord), 403, 'FORBIDDEN');
    });
  });

  // ── HU42: tablero del administrador ──────────────────────────────────

  describe(`GET ${ADMINISTRATOR_URL}`, () => {
    const dashboard = async (actor: Actor = s.administrator): Promise<Body> =>
      expectData<Body>(await server().get(ADMINISTRATOR_URL).set(actor), 200);

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

    // CA-42.1 y CA-42.2: todo el estudio, no un abogado. CA-42.4: los plazos por urgencia, con su responsable.
    it('devuelve el tablero de todo el estudio, en la forma del contrato, con los plazos de cada abogado', async () => {
      await actDueOnAs(s.responsible, s.caseRow.id, '2026-10-06');
      const theirs = await newCaseFor(s.otherLawyer.id, {
        caption: 'PEREYRA, Marcos — Sumario',
        jurisdiction: 'ADMINISTRATIVE',
      });
      await actDueOnAs(s.notResponsible, theirs.id, '2026-10-02', {
        stateId: s.states.administrative.stateId,
        notificationDate: '2026-10-01',
      });

      const body = await dashboard();

      expect(Object.keys(body).sort()).toEqual(
        ['casesByJurisdiction', 'date', 'deadlines', 'prescriptionAlerts', 'summary', 'team'].sort(),
      );
      expect(body.date).toBe('2026-10-06');
      expect(body.summary).toEqual({ dueToday: 1, overdue: 1, dueSoon: 0, activeCases: 2 });
      expect(body.deadlines.map((d: Body) => [d.caseId, d.responsibleLawyer])).toEqual([
        [theirs.id, { id: s.otherLawyer.id, lastName: s.otherLawyer.lastName, firstName: s.otherLawyer.firstName }],
        [s.caseRow.id, { id: s.lawyer.id, lastName: s.lawyer.lastName, firstName: s.lawyer.firstName }],
      ]);
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

    // CA-42.5
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

    // CA-42.9, con login real
    it('responde 403 a quien no tiene rol de administrador', async () => {
      for (const role of ['SECRETARY', 'LAWYER'] as TestRole[]) {
        const res = await server().get(ADMINISTRATOR_URL).set(await realLogin(role));

        expectError(res, 403, 'FORBIDDEN');
        expect(res.body.error.message).toBe('Se requiere el rol ADMINISTRATOR para realizar esta operación.');
      }
    });
  });
});
