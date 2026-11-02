import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { expectProceduralAct } from '../../shared/contract/procedural-acts';
import { TestRole } from '../../shared/auth/login-as';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
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
 *
 * El 401 sin token (CA-27.11) está en `test/smoke/app.int.spec.ts`. El cálculo del
 * vencimiento, en `register-procedural-act.int.spec.ts` y en los specs del dominio.
 */
let app: INestApplication;
let s: ProceduralActScenario;

const actsUrl = (caseId: number | string = s.caseRow.id) => `/api/v1/cases/${caseId}/procedural-acts`;
const server = () => request(app.getHttpServer());

const register = async (body: Record<string, unknown>, caseId: number = s.caseRow.id): Promise<Record<string, any>> => {
  const res = await server().post(actsUrl(caseId)).set(s.responsible).send(body);
  if (res.status !== 201) {
    throw new Error(`registro falló: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
};

const list = (caseId: number | string = s.caseRow.id, actor = s.notResponsible) => server().get(actsUrl(caseId)).set(actor);

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

describe('GET /api/v1/cases/:caseId/procedural-acts', () => {
  // CA-27.1. En el fuero penal la fecha de notificación viaja en null.
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
    expect(data[0].notificationDate).toBeNull();
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
      // D-86: el plazo que da la fecha manual, del lunes 5/10 al martes 20/10.
      manualTimeLimitDays: 11,
    });
  });

  /**
   * CA-27.5: el plazo queda con el que se registró aunque después cambie la tabla.
   * §4, Bajas: un estado dado de baja sigue en la historia de la causa.
   */
  it('conserva el plazo y el nombre del estado aunque después la tabla cambie o lo dé de baja', async () => {
    await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });
    await getPrisma().proceduralState.update({
      where: { stateId: s.states.fiveBusinessDays.stateId },
      data: { timeLimitDays: 30, isActive: false },
    });

    const [act] = expectPaginated<Record<string, any>>(await list());

    expect(act.deadline).toMatchObject({ timeLimitDays: 5, dueDate: '2026-10-12' });
    expect(act.resultingState.name).toBe('Oposición al requerimiento de elevación');
  });

  /**
   * CA-27.6 y CA-27.8. Desde V4 un acto puede llevar la causa a un estado terminal
   * (D-69). La causa archivada no está dada de baja: sigue apareciendo, y su
   * historial también, con el estado escrito a mano que tuvo antes.
   */
  it('identifica el estado escrito a mano y el terminal, y la causa archivada sigue consultable', async () => {
    await register({ customState: 'En espera de pericia contable', actDate: '2026-10-01' });
    const archived = await register({ proceduralStateId: s.states.terminal.stateId, actDate: '2026-10-05' });

    const data = expectPaginated<Record<string, any>>(await list(), { totalItems: 2 });

    expect(data[0].id).toBe(archived.id);
    expect(data.map((a) => a.resultingState)).toEqual([
      { proceduralStateId: s.states.terminal.stateId, name: 'Archivada', custom: false },
      { proceduralStateId: null, name: 'En espera de pericia contable', custom: true },
    ]);
    const detail = await server().get(`/api/v1/cases/${s.caseRow.id}`).set(s.notResponsible);
    expect(detail.status).toBe(200);
  });

  // CA-27.7: sin actos, la colección vacía y sin error. Con actos, la página sale de la base.
  it('una causa sin actos devuelve la colección vacía, y con actos pagina contra la base', async () => {
    expect(expectPaginated(await list(), { totalItems: 0 })).toEqual([]);

    const base = { caseId: s.caseRow.id, registeredByUserId: s.user.id, registeredByLawyerId: s.lawyer.id };
    for (const day of ['01', '02', '03']) {
      await createProceduralAct({ ...base, proceduralStateId: s.states.withoutTerm.stateId, actDate: `2026-09-${day}` });
    }

    const res = await server().get(actsUrl()).query({ page: 2, limit: 2 }).set(s.notResponsible);
    const data = expectPaginated<{ actDate: string }>(res, { page: 2, limit: 2, totalItems: 3, totalPages: 2 });

    expect(data.map((a) => a.actDate)).toEqual(['2026-09-01']);
  });

  // CA-27.10: una causa dada de baja arrastra sus actos (D-97).
  it('responde 404 para una causa inexistente o dada de baja', async () => {
    expectError(await list(999999), 404, 'CASE_NOT_FOUND');

    await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });
    await deactivateCase(s.caseRow.id);

    expectError(await list(), 404, 'CASE_NOT_FOUND');
  });

  it('rechaza un caseId que no es un entero y una paginación fuera de rango', async () => {
    expectError(await list('abc'), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
    for (const query of [{ page: 0 }, { limit: 500 }]) {
      const res = await server().get(actsUrl()).query(query).set(s.notResponsible);
      expectError(res, 400, 'INVALID_PAGINATION', ['page', 'limit']);
    }
  });
});

describe('GET /api/v1/cases/:caseId/procedural-acts/:actId', () => {
  const actUrl = (caseId: number | string, actId: number | string) => `/api/v1/cases/${caseId}/procedural-acts/${actId}`;
  const registerOne = () => register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });

  // CA-27.8
  it('devuelve el acto, idéntico a como lo devolvió su registro', async () => {
    const registered = await registerOne();

    const res = await server().get(actUrl(s.caseRow.id, registered.id)).set(s.notResponsible);

    expect(expectData(res, 200)).toEqual(registered);
  });

  /** Un acto de otra causa, por esta URL, no existe. La causa se verifica antes que el acto. */
  it('responde 404 para un acto inexistente o de otra causa, y para una causa inexistente', async () => {
    const registered = await registerOne();
    const other = await createCase({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id });

    expectError(await server().get(actUrl(s.caseRow.id, 999999)).set(s.notResponsible), 404, 'PROCEDURAL_ACT_NOT_FOUND');
    expectError(await server().get(actUrl(other.id, registered.id)).set(s.notResponsible), 404, 'PROCEDURAL_ACT_NOT_FOUND');
    expectError(await server().get(actUrl(999999, 1)).set(s.notResponsible), 404, 'CASE_NOT_FOUND');
  });

  /**
   * Las dos rutas tienen tres segmentos: si `:actId` estuviera declarada antes,
   * la previsualización respondería 400 con `actId: "deadline-preview"`.
   */
  it('rechaza un actId que no es un entero, sin robarle la ruta a la previsualización', async () => {
    expectError(await server().get(actUrl(s.caseRow.id, 'abc')).set(s.notResponsible), 400, 'INVALID_PATH_PARAMETER', ['actId']);

    const preview = await server()
      .get(`/api/v1/cases/${s.caseRow.id}/procedural-acts/deadline-preview`)
      .query({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' })
      .set(s.responsible);

    expect(preview.status).toBe(200);
  });
});

/**
 * CA-27.9 con login real: el que consulta no tiene por qué ser el abogado
 * responsable. Se crean usuarios propios con contraseña porque los del
 * escenario firman su token a mano.
 */
describe('acceso a la consulta de actos (CA-27.9)', () => {
  const PASSWORD = 'password1';

  async function loginWithRole(role: TestRole) {
    // Un abogado necesita su propia ficha: cada ficha admite una sola cuenta activa.
    const lawyerId = role === 'LAWYER' ? (await createLawyer()).id : null;
    const user = await createUser({ roles: [role], lawyerId, passwordHash: await bcrypt.hash(PASSWORD, 4) });
    const res = await server().post('/api/v1/auth/login').send({ username: user.username, password: PASSWORD });
    if (res.status !== 200) throw new Error(`login con rol ${role} falló: ${res.status} ${JSON.stringify(res.body)}`);
    return { Authorization: `Bearer ${res.body.data.accessToken}` };
  }

  it('cada rol consulta los actos de una causa de la que no es responsable', async () => {
    const registered = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });

    for (const role of ['ADMINISTRATOR', 'LAWYER', 'SECRETARY'] as TestRole[]) {
      const auth = await loginWithRole(role);
      const listing = await server().get(actsUrl()).set(auth);
      const one = await server().get(`${actsUrl()}/${registered.id}`).set(auth);

      expect({ role, listing: listing.status, one: one.status }).toEqual({ role, listing: 200, one: 200 });
    }
  });
});
