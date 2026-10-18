import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { expectProceduralAct } from '../../shared/contract/procedural-acts';
import { TestRole } from '../../shared/auth/login-as';
import { createCase } from '../../shared/factories/case.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createProceduralAct } from '../../shared/factories/procedural-act.factory';
import { createUser } from '../../shared/factories/user.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU27 Consultar actos procesales:
 *   GET /cases/{caseId}/procedural-acts
 *   GET /cases/{caseId}/procedural-acts/{actId}
 *
 * Los actos se registran por el `POST` real y se leen por `GET`: lo que se
 * prueba no es solo la forma, sino que **el recurso leído es idéntico al que
 * devolvió el registro**. "Hoy" es el martes 6/10/2026 (reloj fijo).
 */
describe('GET /api/v1/cases/:caseId/procedural-acts', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;

  const url = (caseId: number | string = s.caseRow.id) => `/api/v1/cases/${caseId}/procedural-acts`;
  const server = () => request(app.getHttpServer());

  const register = async (
    body: Record<string, unknown>,
    caseId: number = s.caseRow.id,
  ): Promise<Record<string, any>> => {
    const res = await server().post(url(caseId)).set(s.responsible).send(body);
    if (res.status !== 201) {
      throw new Error(`registro falló: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return res.body.data;
  };

  const list = (caseId: number | string = s.caseRow.id, actor = s.notResponsible) =>
    server().get(url(caseId)).set(actor);

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

  // ── Contenido ─────────────────────────────────────────────────────

  // CA-27.1
  it('devuelve cada acto idéntico a como lo devolvió su registro', async () => {
    const registered = await register({
      proceduralStateId: s.states.fiveBusinessDays.stateId,
      actDate: '2026-10-05',
      notes: 'Con acusación, pero con oposición.',
    });

    const data = expectPaginated<Record<string, unknown>>(await list(), {
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
    });

    expect(data).toEqual([registered]);
    expectProceduralAct(data[0], {
      resultingState: {
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        name: 'Oposición al requerimiento de elevación',
        custom: false,
      },
      registeredBy: { id: s.user.id, lastName: 'Ríos', firstName: 'Malena' },
    });
  });

  // CA-27.2
  it('ordena del más reciente al más antiguo y, en la misma fecha, el último registrado primero', async () => {
    const base = { caseId: s.caseRow.id, registeredByUserId: s.user.id, registeredByLawyerId: s.lawyer.id };
    const oldest = await createProceduralAct({ ...base, proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-09-01' });
    const newest = await createProceduralAct({ ...base, proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-09-20' });
    const sameDayFirst = await createProceduralAct({ ...base, proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-09-10' });
    const sameDaySecond = await createProceduralAct({ ...base, proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-09-10' });

    const data = expectPaginated<{ id: number }>(await list());

    expect(data.map((a) => a.id)).toEqual([newest.id, sameDaySecond.id, sameDayFirst.id, oldest.id]);
  });

  // CA-27.3
  it('en el fuero administrativo trae la fecha de notificación', async () => {
    const administrative = await createCase({
      clientId: s.client.id,
      responsibleLawyerId: s.lawyer.id,
      createdByUserId: s.user.id,
      jurisdiction: 'ADMINISTRATIVE',
    });
    await register(
      { proceduralStateId: s.states.administrative.stateId, actDate: '2026-10-02', notificationDate: '2026-10-05' },
      administrative.id,
    );

    const [act] = expectPaginated<Record<string, any>>(await list(administrative.id));

    expect(act.notificationDate).toBe('2026-10-05');
    expect(act.deadline.countsFrom).toBe('2026-10-05');
  });

  it('en el fuero penal la fecha de notificación es null', async () => {
    await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });

    const [act] = expectPaginated<Record<string, any>>(await list());

    expect(act.notificationDate).toBeNull();
  });

  // CA-27.4
  it('muestra el vencimiento ajustado a mano junto con el que resultaba de la tabla', async () => {
    await register({
      proceduralStateId: s.states.fiveBusinessDays.stateId,
      actDate: '2026-10-05',
      manualDueDate: '2026-10-20',
    });

    const [act] = expectPaginated<Record<string, any>>(await list());

    expect(act.deadline).toMatchObject({
      computedDueDate: '2026-10-12',
      dueDate: '2026-10-20',
      manuallyAdjusted: true,
    });
  });

  // CA-27.5
  it('conserva el plazo con que se registró aunque después cambie la tabla', async () => {
    await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });
    await getPrisma().proceduralState.update({
      where: { stateId: s.states.fiveBusinessDays.stateId },
      data: { timeLimitDays: 30 },
    });

    const [act] = expectPaginated<Record<string, any>>(await list());

    expect(act.deadline).toMatchObject({ timeLimitDays: 5, dueDate: '2026-10-12' });
  });

  /**
   * CA-27.8. Desde V4 un acto puede llevar la causa a un estado terminal (D-69).
   * La causa archivada no está dada de baja: sigue apareciendo, y su historial
   * también.
   */
  it('muestra el acto que llevó la causa a un estado terminal, y la causa sigue consultable', async () => {
    await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-01' });
    const archived = await register({ proceduralStateId: s.states.terminal.stateId, actDate: '2026-10-05' });

    const data = expectPaginated<Record<string, any>>(await list(), { totalItems: 2 });

    expect(data[0].id).toBe(archived.id);
    expect(data[0].resultingState).toEqual({
      proceduralStateId: s.states.terminal.stateId,
      name: 'Archivada',
      custom: false,
    });
    const detail = await server().get(`/api/v1/cases/${s.caseRow.id}`).set(s.notResponsible);
    expect(detail.status).toBe(200);
  });

  // CA-27.6
  it('identifica el estado escrito a mano', async () => {
    await register({ customState: 'En espera de pericia contable', actDate: '2026-10-05' });

    const [act] = expectPaginated<Record<string, any>>(await list());

    expect(act.resultingState).toEqual({
      proceduralStateId: null,
      name: 'En espera de pericia contable',
      custom: true,
    });
  });

  /** Un estado dado de baja sigue en la historia de la causa (§4, Bajas). */
  it('muestra el nombre de un estado que se dio de baja después del acto', async () => {
    await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });
    await getPrisma().proceduralState.update({
      where: { stateId: s.states.fiveBusinessDays.stateId },
      data: { isActive: false },
    });

    const [act] = expectPaginated<Record<string, any>>(await list());

    expect(act.resultingState.name).toBe('Oposición al requerimiento de elevación');
  });

  // CA-27.7
  it('una causa sin actos devuelve la colección vacía, sin error', async () => {
    const data = expectPaginated(await list(), { totalItems: 0 });

    expect(data).toEqual([]);
  });

  it('pagina contra la base', async () => {
    const base = { caseId: s.caseRow.id, registeredByUserId: s.user.id, registeredByLawyerId: s.lawyer.id };
    for (const day of ['01', '02', '03']) {
      await createProceduralAct({ ...base, proceduralStateId: s.states.withoutTerm.stateId, actDate: `2026-09-${day}` });
    }

    const res = await server().get(url()).query({ page: 2, limit: 2 }).set(s.notResponsible);
    const data = expectPaginated<{ actDate: string }>(res, { page: 2, limit: 2, totalItems: 3, totalPages: 2 });

    expect(data.map((a) => a.actDate)).toEqual(['2026-09-01']);
  });

  // ── Errores ───────────────────────────────────────────────────────

  // CA-27.10
  it('responde 404 para una causa inexistente', async () => {
    expectError(await list(999999), 404, 'CASE_NOT_FOUND');
  });

  it('responde 404 para una causa dada de baja', async () => {
    await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });
    await getPrisma().case.update({ where: { id: s.caseRow.id }, data: { active: false } });

    expectError(await list(), 404, 'CASE_NOT_FOUND');
  });

  it('rechaza un caseId que no es un entero', async () => {
    expectError(await list('abc'), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
  });

  it.each([
    ['page', { page: 0 }],
    ['limit', { limit: 500 }],
  ])('rechaza %s fuera de rango con INVALID_PAGINATION', async (_campo, query) => {
    const res = await server().get(url()).query(query).set(s.notResponsible);

    expectError(res, 400, 'INVALID_PAGINATION', ['page', 'limit']);
  });

  // CA-27.11
  it('exige autenticación', async () => {
    await server().get(url()).expect(401);
  });
});

describe('GET /api/v1/cases/:caseId/procedural-acts/:actId', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;

  const url = (caseId: number | string, actId: number | string) =>
    `/api/v1/cases/${caseId}/procedural-acts/${actId}`;
  const server = () => request(app.getHttpServer());

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

  const register = async (caseId: number = s.caseRow.id): Promise<Record<string, any>> => {
    const res = await server()
      .post(`/api/v1/cases/${caseId}/procedural-acts`)
      .set(s.responsible)
      .send({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });
    if (res.status !== 201) throw new Error(`registro falló: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body.data;
  };

  // CA-27.8
  it('devuelve el acto, idéntico a como lo devolvió su registro', async () => {
    const registered = await register();

    const res = await server().get(url(s.caseRow.id, registered.id)).set(s.notResponsible);

    expect(expectData(res, 200)).toEqual(registered);
  });

  it('responde 404 para un acto inexistente', async () => {
    const res = await server().get(url(s.caseRow.id, 999999)).set(s.notResponsible);

    expectError(res, 404, 'PROCEDURAL_ACT_NOT_FOUND');
  });

  /** El acto existe, pero es de otra causa: por esta URL no existe. */
  it('responde 404 para un acto de otra causa', async () => {
    const registered = await register();
    const other = await createCase({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id });

    const res = await server().get(url(other.id, registered.id)).set(s.notResponsible);

    expectError(res, 404, 'PROCEDURAL_ACT_NOT_FOUND');
  });

  it('verifica la causa antes que el acto', async () => {
    const res = await server().get(url(999999, 1)).set(s.notResponsible);

    expectError(res, 404, 'CASE_NOT_FOUND');
  });

  it('rechaza un actId que no es un entero', async () => {
    const res = await server().get(url(s.caseRow.id, 'abc')).set(s.notResponsible);

    expectError(res, 400, 'INVALID_PATH_PARAMETER', ['actId']);
  });

  /**
   * Las dos rutas tienen tres segmentos: si `:actId` estuviera declarada antes,
   * la previsualización respondería 400 con `actId: "deadline-preview"`.
   */
  it('no le roba la ruta a la previsualización del vencimiento', async () => {
    const res = await server()
      .get(`/api/v1/cases/${s.caseRow.id}/procedural-acts/deadline-preview`)
      .query({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' })
      .set(s.responsible);

    expect(res.status).toBe(200);
  });

  it('exige autenticación', async () => {
    await server().get(url(s.caseRow.id, 1)).expect(401);
  });
});

/**
 * CA-27.9 con login real: el que consulta no tiene por qué ser el abogado
 * responsable. Se crean usuarios propios con contraseña porque los del
 * escenario firman su token a mano.
 */
describe('acceso a la consulta de actos (CA-27.9)', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;
  const PASSWORD = 'password1';

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

  async function loginWithRole(role: TestRole) {
    // Un abogado necesita su propia ficha: cada ficha admite una sola cuenta activa.
    const lawyerId = role === 'LAWYER' ? (await createLawyer()).id : null;
    const user = await createUser({ roles: [role], lawyerId, passwordHash: await bcrypt.hash(PASSWORD, 4) });
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: user.username, password: PASSWORD });
    if (res.status !== 200) throw new Error(`login con rol ${role} falló: ${res.status} ${JSON.stringify(res.body)}`);
    return { Authorization: `Bearer ${res.body.data.accessToken}` };
  }

  it.each<TestRole>(['ADMINISTRATOR', 'LAWYER', 'SECRETARY'])(
    '%s consulta los actos de una causa de la que no es responsable',
    async (role) => {
      const registered = await request(app.getHttpServer())
        .post(`/api/v1/cases/${s.caseRow.id}/procedural-acts`)
        .set(s.responsible)
        .send({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });
      const auth = await loginWithRole(role);

      const listing = await request(app.getHttpServer()).get(`/api/v1/cases/${s.caseRow.id}/procedural-acts`).set(auth);
      const one = await request(app.getHttpServer())
        .get(`/api/v1/cases/${s.caseRow.id}/procedural-acts/${registered.body.data.id}`)
        .set(auth);

      expect(listing.status).toBe(200);
      expect(one.status).toBe(200);
    },
  );
});
