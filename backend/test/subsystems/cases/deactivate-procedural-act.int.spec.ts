import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { FIXED_NOW, withFixedClock } from '../../shared/harness/fixed-clock';
import { purgeAuditLog } from '../../shared/harness/audit-log';
import { loginAs } from '../../shared/auth/login-as';
import { expectData, expectPaginated } from '../../shared/contract/envelopes';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import { createProceduralAct } from '../../shared/factories/procedural-act.factory';
import { createProceduralState } from '../../shared/factories/procedural-state.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU29 · Dar de baja un acto procesal: DELETE /cases/{caseId}/procedural-acts/{actId}
 * (contrato V6 §3.8, `:6993-7134`; D-124, D-99, D-14, D-30). El contrato lo llama "anular".
 *
 * Escrito desde `.claude/plans/tests-hu29-baja-acto-procesal.md`, no desde el código.
 * Reloj fijo: hoy es el martes 06/10/2026, 12:30 en Córdoba. La causa es la del
 * escenario de actos procesales: penal, responsable Ríos, Malena.
 *
 * Los actos se preparan con el `POST` real, registrado con el mismo reloj, así sus
 * plazos son los del cálculo verdadero. El 401 sin token está en
 * `test/smoke/app.int.spec.ts`.
 */
type Body = Record<string, any>;
type Actor = { Authorization: string };

const NOT_RESPONSIBLE = 'Solo el abogado responsable de la causa puede anular sus actos procesales.';
const ACT_NOT_FOUND = 'No se encontró el acto procesal solicitado.';
const CASE_NOT_FOUND = 'No se encontró la causa solicitada.';

let app: INestApplication;
let s: ProceduralActScenario;

const server = () => request(app.getHttpServer());
const actsUrl = (caseId: number | string = s.caseRow.id) => `/api/v1/cases/${caseId}/procedural-acts`;

const register = async (body: Body, caseId: number = s.caseRow.id): Promise<Body> => {
  const res = await server().post(actsUrl(caseId)).set(s.responsible).send(body);
  if (res.status !== 201) throw new Error(`registro del acto: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
};

const remove = (actId: number | string, body?: Body, actor: Actor = s.responsible, caseId: number | string = s.caseRow.id) => {
  const req = server().delete(`${actsUrl(caseId)}/${actId}`).set(actor);
  return body === undefined ? req : req.send(body);
};

const detail = async (caseId: number = s.caseRow.id): Promise<Body> =>
  expectData<Body>(await server().get(`/api/v1/cases/${caseId}`).set(s.responsible), 200);

/** Lo que un rechazo no puede tocar: los actos, la causa y la auditoría. */
const snapshot = async (caseId: number = s.caseRow.id) => ({
  acts: await getPrisma().proceduralAct.findMany({ where: { caseId }, orderBy: { id: 'asc' } }),
  caseRow: await getPrisma().case.findUnique({ where: { id: caseId } }),
  audit: await getPrisma().auditLog.count(),
});

/** A: "Oposición…" (5 días hábiles) del lunes 28/09, vence el lunes 05/10. B: "Archivada" del 30/09, cierra la causa. */
const anOppositionThenArchived = async () => {
  const a = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-28' });
  const b = await register({ proceduralStateId: s.states.terminal.stateId, actDate: '2026-09-30' });
  return { a, b };
};

beforeAll(async () => {
  app = await startTestApp(withFixedClock);
});

afterAll(async () => {
  await purgeAuditLog();
  await resetProceduralActData();
  await stopTestApp();
});

beforeEach(async () => {
  // Antes de borrar usuarios: la auditoría los referencia.
  await purgeAuditLog();
  s = await setUpProceduralActScenario();
});

describe('DELETE /api/v1/cases/{caseId}/procedural-acts/{actId}', () => {
  describe('baja exitosa', () => {
    // CA-29.1, CA-29.12
    it('responde 204 sin cuerpo; el acto queda dado de baja con quién, cuándo y el motivo recortado, y se audita', async () => {
      const act = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-28' });

      const res = await remove(act.id, { reason: '  Acto cargado dos veces.  ' }).set('X-Correlation-Id', 'hu29-baja');

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
      const row = await getPrisma().proceduralAct.findUniqueOrThrow({ where: { id: act.id } });
      expect(row).toMatchObject({
        active: false,
        deactivatedAt: FIXED_NOW,
        deactivatedByUserId: s.user.id,
        deactivationReason: 'Acto cargado dos veces.',
      });
      const audit = await getPrisma().auditLog.findMany();
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        actorUserId: s.user.id,
        action: 'procedural-act.deactivated',
        entityType: 'ProceduralAct',
        entityId: String(act.id),
        occurredAt: FIXED_NOW,
        correlationId: 'hu29-baja',
        // El motivo queda en el acto, no en la auditoría (AUDITORIA §4).
        metadata: { caseId: s.caseRow.id },
      });
    });

    // CA-29.1, CA-29.10: el cuerpo es opcional, y un motivo en blanco es ausente.
    it.each([
      ['sin cuerpo', undefined],
      ['con un motivo en blanco', { reason: '   ' }],
    ])('%s responde 204 y el motivo queda en null', async (_label, body) => {
      const act = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-28' });

      await remove(act.id, body).expect(204);

      const row = await getPrisma().proceduralAct.findUniqueOrThrow({ where: { id: act.id } });
      expect(row).toMatchObject({ active: false, deactivationReason: null });
    });

    // CA-29.2, D-124
    it('el acto deja de mostrarse: no está en la lista ni en el ciclo de vida, y GET y PATCH responden 404', async () => {
      const kept = await register({ proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-09-01' });
      const gone = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-28' });

      await remove(gone.id).expect(204);

      const list = expectPaginated<Body>(await server().get(actsUrl()).set(s.responsible), { totalItems: 1 });
      expect(list.map((act) => act.id)).toEqual([kept.id]);
      // La línea de vida no está paginada: `data` es la lista entera.
      const timeline = await server().get(`/api/v1/cases/${s.caseRow.id}/timeline`).set(s.responsible);
      expect(timeline.status).toBe(200);
      expect(timeline.body.data.map((entry: Body) => entry.proceduralAct?.id)).toEqual([kept.id]);
      for (const res of [
        await server().get(`${actsUrl()}/${gone.id}`).set(s.responsible),
        await server().patch(`${actsUrl()}/${gone.id}`).set(s.responsible).send({ notes: 'Intento.' }),
      ]) {
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: { code: 'PROCEDURAL_ACT_NOT_FOUND', message: ACT_NOT_FOUND, details: null } });
      }
    });
  });

  describe('estado de la causa (D-99, D-14)', () => {
    // CA-29.3, CA-29.4, CA-29.5
    it('dar de baja el acto que la archivó la reabre en el acto anterior, con su plazo aunque esté vencido', async () => {
      const { a, b } = await anOppositionThenArchived();
      const reader = loginAs({ roles: ['ADMINISTRATOR'], permissions: ['lawyer:read'] });
      const activeCases = async () =>
        expectData<Body>(await server().get(`/api/v1/lawyers/${s.lawyer.id}`).set(reader), 200).activeCases;
      expect(await activeCases()).toBe(0);

      await remove(b.id).expect(204);

      expect((await detail()).currentState).toMatchObject({
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        name: 'Oposición al requerimiento de elevación',
        initial: false,
        custom: false,
        proceduralActId: a.id,
        // Vencido ayer, lunes 05/10: sigue abierto.
        dueDate: '2026-10-05',
        businessDaysRemaining: -1,
      });
      expect(await activeCases()).toBe(1);
    });

    // CA-29.3
    it('dar de baja el único acto la devuelve a "Iniciada", sin acto ni vencimiento', async () => {
      const act = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-28' });

      await remove(act.id).expect(204);

      expect((await detail()).currentState).toMatchObject({
        proceduralStateId: null,
        name: 'Iniciada',
        initial: true,
        custom: false,
        proceduralActId: null,
        dueDate: null,
        businessDaysRemaining: null,
      });
    });

    // CA-29.3: en un amparo vuelve a correr el plazo del acto lesivo, que solo existe en "Iniciada".
    it('en un amparo, al volver a "Iniciada" vuelve el plazo del acto lesivo', async () => {
      const amparo = await createCase({
        clientId: s.client.id,
        responsibleLawyerId: s.lawyer.id,
        createdByUserId: s.user.id,
        jurisdiction: 'AMPARO',
        harmfulAct: { date: '2026-09-01', termDays: 30, termDayType: 'CONSECUTIVE' },
      });
      const informe = await createProceduralState({ jurisdiction: 'AMPARO', name: 'Pedido de informe' });
      const act = await register({ proceduralStateId: informe.stateId, actDate: '2026-09-15' }, amparo.id);
      expect((await detail(amparo.id)).harmfulActDeadline).toBeNull();

      await remove(act.id, undefined, s.responsible, amparo.id).expect(204);

      expect((await detail(amparo.id)).harmfulActDeadline).toMatchObject({
        actDate: '2026-09-01',
        renewed: false,
        dueDate: '2026-10-01',
      });
    });
  });

  describe('lo que no cambia y el reflejo en el resto del sistema', () => {
    // CA-29.6
    it('dar de baja un acto más viejo no mueve la causa, y los actos interruptivos y la prescripción quedan igual', async () => {
      const old = await register({ proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-09-01' });
      const current = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-28' });
      await server()
        .post(`/api/v1/cases/${s.caseRow.id}/interruptive-acts`)
        .set(s.responsible)
        .send({ name: 'Indagatoria', actDate: '2026-09-10' })
        .expect(201);
      const before = await detail();
      const interruptiveBefore = expectPaginated<Body>(
        await server().get(`/api/v1/cases/${s.caseRow.id}/interruptive-acts`).set(s.responsible),
      );

      await remove(old.id).expect(204);

      const after = await detail();
      expect(after.currentState).toEqual(before.currentState);
      expect(after.currentState.proceduralActId).toBe(current.id);
      expect(after.prescription).toEqual(before.prescription);
      expect(
        expectPaginated<Body>(await server().get(`/api/v1/cases/${s.caseRow.id}/interruptive-acts`).set(s.responsible)),
      ).toEqual(interruptiveBefore);
    });

    // CA-29.11: la "última actuación" del tablero del abogado no cuenta el acto dado de baja.
    it('el tablero del abogado deja de contarlo como última actuación', async () => {
      await register({ proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-09-01' });
      const latest = await register({ proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-09-30' });

      await remove(latest.id).expect(204);

      const dashboard = expectData<Body>(await server().get('/api/v1/dashboards/lawyer').set(s.responsible), 200);
      expect(dashboard.casesToAdvance).toEqual([
        expect.objectContaining({ caseId: s.caseRow.id, lastActDate: '2026-09-01', daysSinceLastAct: 35 }),
      ]);
    });
  });

  describe('rechazos: responden el error del contrato y no escriben nada', () => {
    // CA-29.7, CA-29.9
    it.each<[string, () => Promise<{ caseId: number | string; actId: number | string; actor: Actor }>, number, string, string, Body | null]>([
      [
        'otro abogado',
        async () => ({ caseId: s.caseRow.id, actId: (await anOppositionThenArchived()).b.id, actor: s.notResponsible }),
        403, 'FORBIDDEN', NOT_RESPONSIBLE, null,
      ],
      [
        'un administrador',
        async () => ({ caseId: s.caseRow.id, actId: (await anOppositionThenArchived()).b.id, actor: s.administrator }),
        403, 'FORBIDDEN', NOT_RESPONSIBLE, null,
      ],
      [
        'otro abogado sobre un acto inexistente: 404 antes que 403',
        async () => ({ caseId: s.caseRow.id, actId: 999999, actor: s.notResponsible }),
        404, 'PROCEDURAL_ACT_NOT_FOUND', ACT_NOT_FOUND, null,
      ],
      [
        'un acto ya dado de baja',
        async () => {
          const act = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-28' });
          await remove(act.id).expect(204);
          return { caseId: s.caseRow.id, actId: act.id, actor: s.responsible };
        },
        404, 'PROCEDURAL_ACT_NOT_FOUND', ACT_NOT_FOUND, null,
      ],
      [
        'un acto de otra causa',
        async () => {
          const other = await createCase({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id });
          const otherAct = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-28' }, other.id);
          return { caseId: s.caseRow.id, actId: otherAct.id, actor: s.responsible };
        },
        404, 'PROCEDURAL_ACT_NOT_FOUND', ACT_NOT_FOUND, null,
      ],
      [
        'una causa inexistente',
        async () => ({ caseId: 999999, actId: 1, actor: s.responsible }),
        404, 'CASE_NOT_FOUND', CASE_NOT_FOUND, null,
      ],
      [
        'una causa dada de baja',
        async () => {
          const act = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-28' });
          await deactivateCase(s.caseRow.id);
          return { caseId: s.caseRow.id, actId: act.id, actor: s.responsible };
        },
        404, 'CASE_NOT_FOUND', CASE_NOT_FOUND, null,
      ],
      [
        'un caseId que no es entero',
        async () => ({ caseId: 'abc', actId: 1, actor: s.responsible }),
        400, 'INVALID_PATH_PARAMETER', 'El identificador de la causa no es válido.', { caseId: 'Debe ser un número entero válido.' },
      ],
      [
        'un actId que no es entero',
        async () => ({ caseId: s.caseRow.id, actId: 'abc', actor: s.responsible }),
        400, 'INVALID_PATH_PARAMETER', 'El identificador del acto procesal no es válido.', { actId: 'Debe ser un número entero válido.' },
      ],
    ])('%s', async (_label, prepare, status, code, message, details) => {
      const { caseId, actId, actor } = await prepare();
      const before = await snapshot();

      const res = await remove(actId, { reason: 'Intento.' }, actor, caseId);

      expect(res.status).toBe(status);
      expect(res.body).toEqual({ error: { code, message, details } });
      expect(await snapshot()).toEqual(before);
    });

    // CA-29.8
    it('en una causa prescripta responde 422', async () => {
      const prescribed = await createCase({
        clientId: s.client.id,
        responsibleLawyerId: s.lawyer.id,
        createdByUserId: s.user.id,
        currentStateId: s.states.prescribed.stateId,
        prescriptionDeclaration: {
          prescriptionDate: '2026-10-05',
          resolution: 'Sentencia N° 214 del Juzgado de Control N° 3',
          registeredByUserId: s.user.id,
          registeredAt: FIXED_NOW,
        },
      });
      const act = await createProceduralAct({
        caseId: prescribed.id,
        registeredByUserId: s.user.id,
        registeredByLawyerId: s.lawyer.id,
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        actDate: '2026-09-28',
      });
      const before = await snapshot(prescribed.id);

      const res = await remove(act.id, undefined, s.responsible, prescribed.id);

      expect(res.status).toBe(422);
      expect(res.body).toEqual({
        error: {
          code: 'CASE_IN_TERMINAL_STATE',
          message: 'La causa está prescripta: sus actos procesales no se pueden anular.',
          details: null,
        },
      });
      expect(await snapshot(prescribed.id)).toEqual(before);
    });

    // CA-29.10
    it('un motivo de más de 500 caracteres responde 400 con el detalle del contrato', async () => {
      const act = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-28' });
      const before = await snapshot();

      const res = await remove(act.id, { reason: 'a'.repeat(501) });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Los datos enviados no son válidos.',
          details: { reason: 'Debe tener hasta 500 caracteres.' },
        },
      });
      expect(await snapshot()).toEqual(before);
    });
  });
});
