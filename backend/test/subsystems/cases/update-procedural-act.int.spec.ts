import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { civil, FIXED_NOW, withFixedClock } from '../../shared/harness/fixed-clock';
import { purgeAuditLog } from '../../shared/harness/audit-log';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { expectProceduralAct } from '../../shared/contract/procedural-acts';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU28 · Modificar acto procesal: PATCH /cases/{caseId}/procedural-acts/{actId}
 * (contrato V5 §3.8, `:5935-6145`; D-98, D-99).
 *
 * Escrito desde `.claude/plans/tests-hu28-modificar-acto-procesal.md`, no desde el
 * código. Reloj fijo: hoy es el martes 06/10/2026, 12:30 en Córdoba. La causa es la
 * del escenario de actos procesales: penal, responsable Ríos, Malena.
 *
 * Los actos se preparan con el `POST` real, registrado con el mismo reloj: así
 * `registeredAt` no queda después de `lastModifiedAt` (CHECK de la base). El 401
 * sin token está en `test/smoke/app.int.spec.ts`.
 */
type Body = Record<string, any>;
type Actor = { Authorization: string };

const NOW_WITH_OFFSET = '2026-10-06T12:30:00-03:00';
const INVALID_DATA = 'Los datos enviados no son válidos.';

let app: INestApplication;
let s: ProceduralActScenario;

const server = () => request(app.getHttpServer());
const actsUrl = (caseId: number | string) => `/api/v1/cases/${caseId}/procedural-acts`;

const register = async (body: Body, caseId: number = s.caseRow.id): Promise<Body> => {
  const res = await server().post(actsUrl(caseId)).set(s.responsible).send(body);
  if (res.status !== 201) throw new Error(`registro del acto: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
};

const patch = (actId: number | string, body: unknown, actor: Actor = s.responsible, caseId: number | string = s.caseRow.id) =>
  server().patch(`${actsUrl(caseId)}/${actId}`).set(actor).send(body as object);

const currentStateOf = async (caseId: number = s.caseRow.id): Promise<Body> =>
  expectData<Body>(await server().get(`/api/v1/cases/${caseId}`).set(s.responsible), 200).currentState;

/** Lo que un rechazo no puede tocar: los actos, la causa y la auditoría. */
const snapshot = async (caseId: number = s.caseRow.id) => ({
  acts: await getPrisma().proceduralAct.findMany({ where: { caseId }, orderBy: { id: 'asc' } }),
  caseRow: await getPrisma().case.findUnique({ where: { id: caseId } }),
  audit: await getPrisma().auditLog.count(),
});

const anAdministrativeCase = () =>
  createCase({
    jurisdiction: 'ADMINISTRATIVE',
    clientId: s.client.id,
    responsibleLawyerId: s.lawyer.id,
    createdByUserId: s.user.id,
  });

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

describe('PATCH /api/v1/cases/{caseId}/procedural-acts/{actId}', () => {
  describe('modificación y trazabilidad', () => {
    // CA-28.1, CA-28.5, CA-28.10
    it('responde 200 con el acto corregido; conserva quién lo registró, anota quién lo modificó y lo audita', async () => {
      const act = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-30' });

      const res = await patch(act.id, { actDate: '2026-09-28', notes: 'Se corrigió la fecha del acto.' });

      const data = expectData<Body>(res, 200);
      expect(data).toEqual({
        id: act.id,
        caseId: s.caseRow.id,
        resultingState: {
          proceduralStateId: s.states.fiveBusinessDays.stateId,
          name: 'Oposición al requerimiento de elevación',
          custom: false,
        },
        actDate: '2026-09-28',
        notificationDate: null,
        notes: 'Se corrigió la fecha del acto.',
        // 5 días hábiles desde el lunes 28/09: vence el lunes 05/10.
        deadline: {
          timeLimitDays: 5,
          dayType: 'BUSINESS',
          countsFrom: '2026-09-28',
          computedDueDate: '2026-10-05',
          dueDate: '2026-10-05',
          manuallyAdjusted: false,
          manualTimeLimitDays: null,
        },
        registeredBy: { id: s.user.id, lastName: 'Ríos', firstName: 'Malena' },
        registeredAt: NOW_WITH_OFFSET,
        // Decisión del 05/11/2026: el nombre sale de la fila de `users` del que modificó.
        lastModifiedBy: { id: s.user.id, lastName: s.user.lastName, firstName: s.user.firstName },
        lastModifiedAt: NOW_WITH_OFFSET,
      });

      const row = await getPrisma().proceduralAct.findUniqueOrThrow({ where: { id: act.id } });
      expect(row).toMatchObject({
        actDate: civil('2026-09-28'),
        notes: 'Se corrigió la fecha del acto.',
        deadlineComputedDueDate: civil('2026-10-05'),
        registeredByUserId: s.user.id,
        registeredAt: FIXED_NOW,
        lastModifiedByUserId: s.user.id,
        lastModifiedAt: FIXED_NOW,
      });
      // La causa sigue en este acto, con su vencimiento nuevo.
      expect(await currentStateOf()).toMatchObject({ proceduralActId: act.id, dueDate: '2026-10-05' });

      const audit = await getPrisma().auditLog.findMany();
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        actorUserId: s.user.id,
        action: 'procedural-act.updated',
        entityType: 'ProceduralAct',
        entityId: String(act.id),
        occurredAt: FIXED_NOW,
        metadata: { caseId: s.caseRow.id, changedFields: ['actDate', 'notes'] },
      });
      expect(JSON.stringify(audit[0].metadata)).not.toContain('Se corrigió');
    });

    // CA-28.10: los dos campos están en todas las lecturas del acto.
    it('el registro los trae en null, y después del PATCH el GET, el listado y la línea de vida los traen', async () => {
      const act = expectProceduralAct(await register({ proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-10-01' }));
      expect(act).toMatchObject({ lastModifiedBy: null, lastModifiedAt: null });

      expectData(await patch(act.id, { notes: 'Corregido.' }), 200);

      const expected = {
        lastModifiedBy: { id: s.user.id, lastName: s.user.lastName, firstName: s.user.firstName },
        lastModifiedAt: NOW_WITH_OFFSET,
      };
      const one = expectData(await server().get(`${actsUrl(s.caseRow.id)}/${act.id}`).set(s.notResponsible), 200);
      expectProceduralAct(one, expected);

      const listed = await server().get(actsUrl(s.caseRow.id)).set(s.notResponsible);
      expect(listed.status).toBe(200);
      expectProceduralAct(listed.body.data[0], expected);

      const timeline = await server().get(`/api/v1/cases/${s.caseRow.id}/timeline`).set(s.notResponsible);
      expect(timeline.status).toBe(200);
      const entry = timeline.body.data.find((item: Body) => item.type === 'PROCEDURAL_ACT');
      expectProceduralAct(entry.proceduralAct, expected);
    });
  });

  describe('rechazos', () => {
    type Prepared = { caseId: number; actId: number };
    const aCriminalAct = async (body: Body = {}): Promise<Prepared> => {
      const act = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-30', ...body });
      return { caseId: s.caseRow.id, actId: act.id };
    };
    const anAdministrativeAct = async (): Promise<Prepared> => {
      const caseRow = await anAdministrativeCase();
      const act = await register(
        { proceduralStateId: s.states.administrative.stateId, actDate: '2026-10-01', notificationDate: '2026-10-02' },
        caseRow.id,
      );
      return { caseId: caseRow.id, actId: act.id };
    };

    // CA-28.3, CA-28.6
    it.each<[string, () => Promise<Prepared>, () => Body, Record<string, string>]>([
      [
        'los dos estados y un ajuste anterior al inicio del plazo (el ejemplo del contrato)',
        () => aCriminalAct(),
        () => ({ proceduralStateId: s.states.tenConsecutiveDays.stateId, customState: 'Otro', manualDueDate: '2026-09-01' }),
        {
          proceduralStateId: 'Elegí un estado de la tabla o escribí uno, no las dos cosas.',
          manualDueDate: 'No puede ser anterior a la fecha desde la que corre el plazo.',
        },
      ],
      [
        '"Prescripta" como destino',
        () => aCriminalAct(),
        () => ({ proceduralStateId: s.states.prescribed.stateId }),
        { proceduralStateId: 'El estado procesal no pertenece al fuero de la causa o es el estado Prescripta.' },
      ],
      [
        'una fecha del acto posterior a hoy',
        () => aCriminalAct(),
        () => ({ actDate: '2026-10-07' }),
        { actDate: 'No puede ser posterior a la fecha de hoy.' },
      ],
      [
        'una notificación que queda anterior a la fecha del acto nueva',
        anAdministrativeAct,
        () => ({ actDate: '2026-10-03' }),
        { notificationDate: 'Debe estar entre la fecha del acto y hoy.' },
      ],
      [
        'quitar la notificación de un acto administrativo que abre plazo',
        anAdministrativeAct,
        () => ({ notificationDate: null }),
        { notificationDate: 'Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6).' },
      ],
      [
        'pasar a un estado terminal sin quitar el ajuste manual',
        () => aCriminalAct({ manualDueDate: '2026-10-20' }),
        () => ({ proceduralStateId: s.states.terminal.stateId }),
        { manualDueDate: 'Un estado terminal cierra la causa y no admite vencimiento.' },
      ],
      [
        'mover la fecha y que el ajuste manual quede antes del inicio del plazo',
        () => aCriminalAct({ actDate: '2026-10-01', manualDueDate: '2026-10-02' }),
        () => ({ actDate: '2026-10-05' }),
        { manualDueDate: 'No puede ser anterior a la fecha desde la que corre el plazo.' },
      ],
      ['un pedido sin campos', () => aCriminalAct(), () => ({}), { body: 'Debe enviarse al menos un campo para modificar.' }],
      ['vaciar la fecha del acto', () => aCriminalAct(), () => ({ actDate: null }), { actDate: 'No puede quedar vacío.' }],
    ])('400 VALIDATION_ERROR: %s; no escribe nada', async (_label, prepare, body, details) => {
      const { caseId, actId } = await prepare();
      const before = await snapshot(caseId);

      const res = await patch(actId, body(), s.responsible, caseId);

      expectError(res, 400, 'VALIDATION_ERROR', Object.keys(details));
      expect(res.body.error).toEqual({ code: 'VALIDATION_ERROR', message: INVALID_DATA, details });
      expect(await snapshot(caseId)).toEqual(before);
    });

    // CA-28.2, CA-28.11
    it.each<[string, () => Promise<{ caseId: number | string; actId: number | string; actor: Actor }>, number, string, string, Body | null]>([
      [
        'otro abogado',
        async () => ({ ...(await aCriminalAct()), actor: s.notResponsible }),
        403, 'FORBIDDEN', 'Solo el abogado responsable de la causa puede modificar sus actos procesales.', null,
      ],
      [
        'un administrador',
        async () => ({ ...(await aCriminalAct()), actor: s.administrator }),
        403, 'FORBIDDEN', 'Solo el abogado responsable de la causa puede modificar sus actos procesales.', null,
      ],
      [
        'quien registró el acto, si ya no es el responsable',
        async () => {
          const prepared = await aCriminalAct();
          await getPrisma().case.update({ where: { id: s.caseRow.id }, data: { responsibleLawyerId: s.otherLawyer.id } });
          return { ...prepared, actor: s.responsible };
        },
        403, 'FORBIDDEN', 'Solo el abogado responsable de la causa puede modificar sus actos procesales.', null,
      ],
      [
        'un acto inexistente',
        async () => ({ caseId: s.caseRow.id, actId: 999999, actor: s.responsible }),
        404, 'PROCEDURAL_ACT_NOT_FOUND', 'No se encontró el acto procesal solicitado.', null,
      ],
      [
        'un acto de otra causa',
        async () => {
          const other = await createCase({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id });
          const otherAct = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-30' }, other.id);
          return { caseId: s.caseRow.id, actId: otherAct.id, actor: s.responsible };
        },
        404, 'PROCEDURAL_ACT_NOT_FOUND', 'No se encontró el acto procesal solicitado.', null,
      ],
      [
        'una causa inexistente',
        async () => ({ caseId: 999999, actId: 1, actor: s.responsible }),
        404, 'CASE_NOT_FOUND', 'No se encontró la causa solicitada.', null,
      ],
      [
        'una causa dada de baja',
        async () => {
          const prepared = await aCriminalAct();
          await deactivateCase(s.caseRow.id);
          return { ...prepared, actor: s.responsible };
        },
        404, 'CASE_NOT_FOUND', 'No se encontró la causa solicitada.', null,
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
    ])('%s: responde el error del contrato y no escribe nada', async (_label, prepare, status, code, message, details) => {
      const { caseId, actId, actor } = await prepare();
      const before = await snapshot();

      const res = await patch(actId, { notes: 'Intento de corrección.' }, actor, caseId);

      expect(res.status).toBe(status);
      expect(res.body).toEqual({ error: { code, message, details } });
      expect(await snapshot()).toEqual(before);
    });

    // CA-28.2: el responsable **actual** modifica, aunque no haya registrado el acto.
    it('el responsable actual modifica un acto que registró otro, y registeredBy no cambia', async () => {
      const { actId } = await aCriminalAct();
      await getPrisma().case.update({ where: { id: s.caseRow.id }, data: { responsibleLawyerId: s.otherLawyer.id } });

      const data = expectData<Body>(await patch(actId, { notes: 'Corrige el nuevo responsable.' }, s.notResponsible), 200);

      expect(data.registeredBy).toEqual({ id: s.user.id, lastName: 'Ríos', firstName: 'Malena' });
      expect(data.lastModifiedBy).toMatchObject({ id: s.otherUser.id });
    });

    // CA-28.9
    it('en una causa prescripta responde 422 y no escribe nada', async () => {
      const { actId } = await aCriminalAct();
      // Lo que deja HU33 al marcarla: estado "Prescripta", sin acto vigente y la declaración.
      await getPrisma().case.update({
        where: { id: s.caseRow.id },
        data: {
          currentStateId: s.states.prescribed.stateId,
          currentProceduralActId: null,
          prescriptionDate: civil('2026-10-05'),
          prescriptionResolution: 'Sentencia N° 214 del Juzgado de Control N° 3',
          prescriptionRegisteredByUserId: s.user.id,
          prescriptionRegisteredAt: FIXED_NOW,
        },
      });
      const before = await snapshot();

      const res = await patch(actId, { notes: 'Intento de corrección.' });

      expect(res.status).toBe(422);
      expect(res.body).toEqual({
        error: {
          code: 'CASE_IN_TERMINAL_STATE',
          message: 'La causa está prescripta: sus actos procesales no se pueden modificar.',
          details: null,
        },
      });
      expect(await snapshot()).toEqual(before);
    });
  });

  describe('recálculo del plazo (D-98)', () => {
    // CA-28.4: la tabla del estado nuevo cambió a 7 días corridos antes del PATCH.
    it('si cambia el estado, usa el plazo y el tipo de día vigentes hoy en la tabla del estado nuevo', async () => {
      const act = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-30' });
      await getPrisma().proceduralState.update({
        where: { stateId: s.states.tenConsecutiveDays.stateId },
        data: { timeLimitDays: 7 },
      });

      const data = expectData<Body>(await patch(act.id, { proceduralStateId: s.states.tenConsecutiveDays.stateId }), 200);

      expect(data.resultingState).toEqual({
        proceduralStateId: s.states.tenConsecutiveDays.stateId,
        name: 'Citación a juicio',
        custom: false,
      });
      // 7 días corridos desde el 30/09: vence el 07/10.
      expect(data.deadline).toMatchObject({
        timeLimitDays: 7,
        dayType: 'CONSECUTIVE',
        countsFrom: '2026-09-30',
        computedDueDate: '2026-10-07',
      });
      expect(await currentStateOf()).toMatchObject({ name: 'Citación a juicio', dueDate: '2026-10-07' });
    });

    // CA-28.5: la tabla del estado pasó a 20 días; el acto conserva los 5 que copió.
    it('si no cambia el estado, mueve el vencimiento con el plazo copiado, aunque se reenvíe el mismo estado', async () => {
      const act = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-30' });
      await getPrisma().proceduralState.update({
        where: { stateId: s.states.fiveBusinessDays.stateId },
        data: { timeLimitDays: 20 },
      });

      const data = expectData<Body>(
        await patch(act.id, { proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-28' }),
        200,
      );

      expect(data.deadline).toMatchObject({
        timeLimitDays: 5,
        dayType: 'BUSINESS',
        countsFrom: '2026-09-28',
        computedDueDate: '2026-10-05',
      });
    });

    // CA-28.6
    it('un ajuste manual que no se toca se conserva; en null vuelve al vencimiento calculado', async () => {
      const act = await register({
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        actDate: '2026-09-30',
        manualDueDate: '2026-10-20',
      });

      const moved = expectData<Body>(await patch(act.id, { actDate: '2026-09-28' }), 200);
      // Del lunes 28/09 al martes 20/10 hay 16 días hábiles (D-86).
      expect(moved.deadline).toEqual({
        timeLimitDays: 5,
        dayType: 'BUSINESS',
        countsFrom: '2026-09-28',
        computedDueDate: '2026-10-05',
        dueDate: '2026-10-20',
        manuallyAdjusted: true,
        manualTimeLimitDays: 16,
      });

      const cleared = expectData<Body>(await patch(act.id, { manualDueDate: null }), 200);
      expect(cleared.deadline).toMatchObject({ dueDate: '2026-10-05', manuallyAdjusted: false, manualTimeLimitDays: null });
      expect(await currentStateOf()).toMatchObject({ dueDate: '2026-10-05', manuallyAdjusted: false });
    });
  });

  describe('estado actual de la causa (D-99)', () => {
    const currentFlags = async () => {
      const res = await server().get(`/api/v1/cases/${s.caseRow.id}/timeline`).set(s.responsible);
      expect(res.status).toBe(200);
      return Object.fromEntries(
        res.body.data
          .filter((item: Body) => item.type === 'PROCEDURAL_ACT')
          .map((item: Body) => [item.proceduralAct.id, item.current]),
      );
    };

    // CA-28.7
    it('la causa queda en el acto con la fecha más reciente, aunque el cambio de fecha haga que rija otro', async () => {
      const first = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-30' });
      const second = await register({ proceduralStateId: s.states.tenConsecutiveDays.stateId, actDate: '2026-10-02' });
      expect(await currentStateOf()).toMatchObject({ proceduralActId: second.id });

      // El segundo pasa a ser anterior al primero: rige el primero.
      expectData(await patch(second.id, { actDate: '2026-09-28' }), 200);
      expect(await currentStateOf()).toMatchObject({
        proceduralActId: first.id,
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        dueDate: '2026-10-07',
      });
      expect(await currentFlags()).toEqual({ [first.id]: true, [second.id]: false });

      // Corregido de vuelta, el segundo vuelve a regir: 10 días corridos desde el 03/10.
      expectData(await patch(second.id, { actDate: '2026-10-03' }), 200);
      expect(await currentStateOf()).toMatchObject({
        proceduralActId: second.id,
        proceduralStateId: s.states.tenConsecutiveDays.stateId,
        dueDate: '2026-10-13',
      });
      expect(await currentFlags()).toEqual({ [first.id]: false, [second.id]: true });
    });

    // CA-28.8, CA-28.9 (otro estado terminal sí se corrige)
    it('pasar el acto que rige a "Archivada" cierra la causa; corregirlo la reabre y admite actos nuevos', async () => {
      const act = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-30' });
      const newAct = { proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-10-05' };

      const closed = expectData<Body>(await patch(act.id, { proceduralStateId: s.states.terminal.stateId }), 200);
      expect(closed.deadline).toBeNull();
      expect(await currentStateOf()).toMatchObject({ name: 'Archivada', proceduralActId: act.id, dueDate: null });
      expectError(await server().post(actsUrl(s.caseRow.id)).set(s.responsible).send(newAct), 422, 'CASE_IN_TERMINAL_STATE');

      expectData(await patch(act.id, { proceduralStateId: s.states.fiveBusinessDays.stateId }), 200);
      expect(await currentStateOf()).toMatchObject({ name: 'Oposición al requerimiento de elevación', dueDate: '2026-10-07' });
      expectData(await server().post(actsUrl(s.caseRow.id)).set(s.responsible).send(newAct), 201);
    });
  });
});
