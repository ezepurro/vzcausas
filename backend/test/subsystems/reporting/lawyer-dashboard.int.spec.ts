import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { createCase } from '../../shared/factories/case.factory';
import { createUser } from '../../shared/factories/user.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU41 Tablero del abogado: GET /dashboards/lawyer (contrato V4 §3.11).
 *
 * "Hoy" es el martes 6/10/2026 (reloj fijo). Los plazos se fijan con el
 * vencimiento manual del registro de actos, para que cada uno caiga en la
 * fecha exacta que el indicador necesita.
 */
type Body = Record<string, any>;
const URL = '/api/v1/dashboards/lawyer';

describe('GET /api/v1/dashboards/lawyer', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;

  const server = () => request(app.getHttpServer());
  const dashboard = async (actor: { Authorization: string } = s.responsible): Promise<Body> =>
    expectData<Body>(await server().get(URL).set(actor), 200);

  /** Una causa penal del abogado responsable del escenario. */
  const newCase = (overrides: Record<string, unknown> = {}) =>
    createCase({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id, ...overrides });

  /** Registra un acto por la API, con el vencimiento en la fecha pedida. */
  const actDueOn = async (caseId: number, dueDate: string, actDate = '2026-10-01') => {
    const res = await server()
      .post(`/api/v1/cases/${caseId}/procedural-acts`)
      .set(s.responsible)
      .send({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate, manualDueDate: dueDate });
    if (res.status !== 201) throw new Error(`acto: ${res.status} ${JSON.stringify(res.body)}`);
  };

  /** Un acto sin plazo: la causa queda sin vencimiento abierto. */
  const actWithoutTerm = async (caseId: number, actDate: string) => {
    const res = await server()
      .post(`/api/v1/cases/${caseId}/procedural-acts`)
      .set(s.responsible)
      .send({ proceduralStateId: s.states.withoutTerm.stateId, actDate });
    if (res.status !== 201) throw new Error(`acto: ${res.status} ${JSON.stringify(res.body)}`);
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
  describe('alertas de prescripción', () => {
    /** Nombres propios: el contador del factory se reinicia en cada archivo y chocaría con otros specs. */
    let qualificationSequence = 0;
    const qualification = (prescriptionMonths: number) =>
      createLegalQualification({ name: `HU41 calificación ${++qualificationSequence}`, prescriptionMonths });

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

    afterAll(async () => {
      await resetProceduralActData();
      await getPrisma().legalQualification.deleteMany({ where: { name: { startsWith: 'HU41 calificación' } } });
    });

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

    it('un acto interruptivo registrado por la API la saca de las alertas', async () => {
      await withOffense(s.caseRow.id, (await qualification(120)).id);
      expect((await dashboard()).prescriptionAlerts).toHaveLength(1);

      await server()
        .post(`/api/v1/cases/${s.caseRow.id}/interruptive-acts`)
        .set(s.responsible)
        .send({ name: 'Indagatoria', actDate: '2026-09-06' })
        .expect(201);

      expect((await dashboard()).prescriptionAlerts).toEqual([]);
    });

    it('no incluye una causa prescripta: es terminal y ya no es activa', async () => {
      const prescribed = await newCase({ currentStateId: s.states.prescribed.stateId });
      await withOffense(prescribed.id, (await qualification(96)).id);

      expect((await dashboard()).prescriptionAlerts).toEqual([]);
    });
  });

  // CA-41.2, CA-41.9
  it('cuenta los indicadores en días hábiles', async () => {
    await actDueOn((await newCase()).id, '2026-10-06'); // hoy
    await actDueOn((await newCase()).id, '2026-10-02'); // vencido
    await actDueOn((await newCase()).id, '2026-10-09'); // 3 días hábiles
    await actDueOn((await newCase()).id, '2026-10-14'); // 6 días hábiles: no es "próximo"
    // + la causa del escenario, sin actos.

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

  // CA-41.7
  it('lista para impulsar las causas sin plazo, con su última actuación', async () => {
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
  });

  it('la última actuación puede ser un acto interruptivo', async () => {
    await actWithoutTerm(s.caseRow.id, '2026-08-01');
    await server()
      .post(`/api/v1/cases/${s.caseRow.id}/interruptive-acts`)
      .set(s.responsible)
      .send({ name: 'Indagatoria', actDate: '2026-09-06' })
      .expect(201);

    const [item] = (await dashboard()).casesToAdvance;

    expect(item).toMatchObject({ lastActDate: '2026-09-06', daysSinceLastAct: 30 });
  });

  // CA-41.10
  it('cuenta solo las causas activas: ni dadas de baja ni terminales; sí las de estado escrito a mano', async () => {
    const deactivated = await newCase();
    await getPrisma().case.update({ where: { id: deactivated.id }, data: { active: false } });
    await newCase({ currentStateId: s.states.terminal.stateId });
    const custom = await newCase({ currentCustomState: 'En espera de pericia' });

    const body = await dashboard();

    expect(body.summary.activeCases).toBe(2);
    expect(body.casesToAdvance.map((c: Body) => c.caseId).sort()).toEqual([s.caseRow.id, custom.id].sort());
    expect(body.casesToAdvance.find((c: Body) => c.caseId === custom.id).currentStateName).toBe('En espera de pericia');
  });

  // CA-41.1: solo sus causas
  it('no incluye las causas de otro abogado', async () => {
    await createCase({ clientId: s.client.id, responsibleLawyerId: s.otherLawyer.id, createdByUserId: s.user.id });

    expect((await dashboard()).summary.activeCases).toBe(1);
  });

  // CA-41.11
  it('un abogado sin causas recibe el tablero vacío, sin error', async () => {
    const body = await dashboard(s.notResponsible);

    expect(body.summary).toEqual({ dueToday: 0, overdue: 0, dueSoon: 0, activeCases: 0 });
    expect(body.deadlines).toEqual([]);
    expect(body.casesToAdvance).toEqual([]);
  });

  // CA-41.12
  it('refleja un acto apenas se registra', async () => {
    expect((await dashboard()).deadlines).toEqual([]);

    await actDueOn(s.caseRow.id, '2026-10-08');

    const body = await dashboard();
    expect(body.deadlines.map((d: Body) => d.caseId)).toEqual([s.caseRow.id]);
    expect(body.casesToAdvance).toEqual([]);
  });

  // CA-41.14, con login real
  it.each<TestRole>(['SECRETARY', 'ADMINISTRATOR'])('responde 403 a %s sin rol de abogado', async (role) => {
    const user = await createUser({ roles: [role], passwordHash: await bcrypt.hash('password1', 4) });
    const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: 'password1' });

    const res = await server().get(URL).set({ Authorization: `Bearer ${login.body.data.accessToken}` });

    expectError(res, 403, 'FORBIDDEN');
    expect(res.body.error.message).toBe('Se requiere el rol LAWYER para realizar esta operación.');
  });

  it('un token sin ficha de abogado recibe 403', async () => {
    expectError(await server().get(URL).set(loginAs({ userId: s.user.id, roles: ['LAWYER'], lawyerId: null })), 403, 'FORBIDDEN');
  });

  // CA-41.15
  it('exige autenticación', async () => {
    await server().get(URL).expect(401);
  });
});
