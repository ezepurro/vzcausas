import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { startTestApp, stopTestApp, getPrisma } from '../../shared/harness/test-app';
import { civil, FIXED_NOW, withFixedClock } from '../../shared/harness/fixed-clock';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { expectProceduralAct } from '../../shared/contract/procedural-acts';
import { loginAs } from '../../shared/auth/login-as';
import { createCase } from '../../shared/factories/case.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU26 Registrar acto procesal — POST /cases/{caseId}/procedural-acts.
 * Contrato: openapi `paths/cases@{caseId}@procedural-acts.yaml` y
 * `components/schemas/ProceduralAct.yaml`.
 *
 * "Hoy" es el martes 6/10/2026 (reloj fijo): los vencimientos no dependen del
 * día en que se corre la suite. El estado, el fuero, el abogado y el usuario salen
 * de la base real a través de los adaptadores de `legal-parameters` y `people`, así
 * que cada test arma ese escenario con las factories.
 */
describe('POST /api/v1/cases/:caseId/procedural-acts', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;

  const url = (caseId: number | string = s.caseRow.id) => `/api/v1/cases/${caseId}/procedural-acts`;

  const register = (
    body: Record<string, unknown>,
    actor: { Authorization: string } = s.responsible,
    caseId: number | string = s.caseRow.id,
  ) => request(app.getHttpServer()).post(url(caseId)).set(actor).send(body);

  /** Lo que un rechazo no debe tocar: los actos guardados y la fila de la causa. */
  const snapshot = async (caseId: number = s.caseRow.id) => ({
    acts: await getPrisma().proceduralAct.count(),
    states: await getPrisma().proceduralState.count(),
    caseRow: await getPrisma().case.findUniqueOrThrow({ where: { id: caseId } }),
  });

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
  });

  afterAll(async () => {
    await resetProceduralActData(); // no dejar actos vigentes que rompan el beforeEach de otros specs
    await stopTestApp();
  });

  beforeEach(async () => {
    s = await setUpProceduralActScenario();
  });

  // ── Registro exitoso y cómputo ────────────────────────────────────

  describe('registro exitoso (CA-26.1) y cómputo del vencimiento (CA-26.3)', () => {
    it('asienta el acto con su plazo y mueve la causa al estado del acto', async () => {
      const stateId = s.states.fiveBusinessDays.stateId;

      const res = await register({
        proceduralStateId: stateId,
        actDate: '2026-10-05',
        notes: 'Con acusación, pero con oposición.',
      });

      // Contrato (ProceduralAct.yaml): el acto de 5 días hábiles del lunes 5/10 vence el lunes 12/10.
      const data = expectData<{ id: number }>(res, 201);
      expectProceduralAct(data, {
        caseId: s.caseRow.id,
        resultingState: {
          proceduralStateId: stateId,
          name: 'Oposición al requerimiento de elevación',
          custom: false,
        },
        actDate: '2026-10-05',
        notificationDate: null,
        notes: 'Con acusación, pero con oposición.',
        deadline: {
          timeLimitDays: 5,
          dayType: 'BUSINESS',
          countsFrom: '2026-10-05',
          computedDueDate: '2026-10-12',
          dueDate: '2026-10-12',
          manuallyAdjusted: false,
        },
        // El usuario es el que llama; el nombre sale de la ficha del abogado.
        registeredBy: { id: s.user.id, lastName: 'Ríos', firstName: 'Malena' },
        registeredAt: '2026-10-06T12:30:00-03:00',
      });

      // Base: el acto, con el plazo copiado de la tabla y quién lo registró.
      const act = await getPrisma().proceduralAct.findUniqueOrThrow({ where: { id: data.id } });
      expect(act).toMatchObject({
        caseId: s.caseRow.id,
        proceduralStateId: stateId,
        customState: null,
        actDate: civil('2026-10-05'),
        notificationDate: null,
        notes: 'Con acusación, pero con oposición.',
        deadlineTimeLimitDays: 5,
        deadlineDayType: 'BUSINESS',
        deadlineCountsFrom: civil('2026-10-05'),
        deadlineComputedDueDate: civil('2026-10-12'),
        deadlineManualDueDate: null,
        registeredByUserId: s.user.id,
        registeredByLawyerId: s.lawyer.id,
        registeredAt: FIXED_NOW,
      });
      // Base: la causa pasó al estado del acto y apunta a él.
      const caseRow = await getPrisma().case.findUniqueOrThrow({ where: { id: s.caseRow.id } });
      expect(caseRow).toMatchObject({
        currentStateId: stateId,
        currentCustomState: null,
        currentProceduralActId: data.id,
        updatedAt: FIXED_NOW,
      });
    });

    it('los días corridos se cuentan de corrido', async () => {
      const res = await register({ proceduralStateId: s.states.tenConsecutiveDays.stateId, actDate: '2026-10-05' });

      const data = expectData<{ id: number }>(res, 201);
      expectProceduralAct(data, {
        deadline: {
          timeLimitDays: 10,
          dayType: 'CONSECUTIVE',
          countsFrom: '2026-10-05',
          computedDueDate: '2026-10-15',
          dueDate: '2026-10-15',
          manuallyAdjusted: false,
        },
      });
      const act = await getPrisma().proceduralAct.findUniqueOrThrow({ where: { id: data.id } });
      expect(act).toMatchObject({ deadlineDayType: 'CONSECUTIVE', deadlineComputedDueDate: civil('2026-10-15') });
    });
  });

  // ── Solo el abogado responsable ───────────────────────────────────

  describe('solo el abogado responsable (CA-26.2)', () => {
    const body = () => ({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });

    it.each([
      ['otro abogado', () => s.notResponsible],
      ['un administrador que no es abogado, aunque su ficha sea la del responsable', () => s.administrator],
      ['un usuario sin ficha de abogado', () => loginAs({ roles: ['LAWYER'], lawyerId: null })],
    ])('responde 403 a %s y no guarda nada', async (_name, actor) => {
      const before = await snapshot();

      const res = await register(body(), actor());

      expectError(res, 403, 'FORBIDDEN');
      expect(await snapshot()).toEqual(before);
    });

    it('lo permite a quien es administrador y abogado a la vez, si es el responsable', async () => {
      const both = loginAs({ userId: s.user.id, roles: ['ADMINISTRATOR', 'LAWYER'], lawyerId: s.lawyer.id });

      const res = await register(body(), both);

      expectData(res, 201);
    });
  });

  // ── Fuero administrativo ──────────────────────────────────────────

  describe('fuero administrativo (CA-26.4, RN6)', () => {
    let administrativeCaseId: number;

    beforeEach(async () => {
      const administrativeCase = await createCase({
        clientId: s.client.id,
        responsibleLawyerId: s.lawyer.id,
        createdByUserId: s.user.id,
        jurisdiction: 'ADMINISTRATIVE',
      });
      administrativeCaseId = administrativeCase.id;
    });

    it('la fecha de notificación es obligatoria si el estado abre plazo', async () => {
      const before = await snapshot(administrativeCaseId);

      const res = await register(
        { proceduralStateId: s.states.administrative.stateId, actDate: '2026-10-02' },
        s.responsible,
        administrativeCaseId,
      );

      expectError(res, 400, 'VALIDATION_ERROR', ['notificationDate']);
      expect(await snapshot(administrativeCaseId)).toEqual(before);
    });

    it('el plazo corre desde la notificación y no desde la fecha del acto', async () => {
      const res = await register(
        { proceduralStateId: s.states.administrative.stateId, actDate: '2026-10-02', notificationDate: '2026-10-05' },
        s.responsible,
        administrativeCaseId,
      );

      // Notificación del lunes 5/10 + 10 días hábiles = lunes 19/10.
      const data = expectData<{ id: number }>(res, 201);
      expectProceduralAct(data, {
        actDate: '2026-10-02',
        notificationDate: '2026-10-05',
        deadline: { countsFrom: '2026-10-05', computedDueDate: '2026-10-19', dueDate: '2026-10-19' },
      });
      const act = await getPrisma().proceduralAct.findUniqueOrThrow({ where: { id: data.id } });
      expect(act).toMatchObject({
        actDate: civil('2026-10-02'),
        notificationDate: civil('2026-10-05'),
        deadlineCountsFrom: civil('2026-10-05'),
        deadlineComputedDueDate: civil('2026-10-19'),
      });
    });

    it('si el estado no abre plazo no hace falta notificación', async () => {
      const res = await register(
        { proceduralStateId: s.states.administrativeWithoutTerm.stateId, actDate: '2026-10-02' },
        s.responsible,
        administrativeCaseId,
      );

      expectData(res, 201);
    });

    it('en los otros fueros no se informa la notificación', async () => {
      const before = await snapshot();

      const res = await register({
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        actDate: '2026-10-05',
        notificationDate: '2026-10-05',
      });

      expectError(res, 400, 'VALIDATION_ERROR', ['notificationDate']);
      expect(await snapshot()).toEqual(before);
    });
  });

  // ── Ajuste manual ─────────────────────────────────────────────────

  describe('ajuste manual del vencimiento (CA-26.5)', () => {
    it('el vencimiento ajustado pasa a ser el vigente y se conserva el calculado', async () => {
      const res = await register({
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        actDate: '2026-10-05',
        manualDueDate: '2026-10-20',
      });

      const data = expectData<{ id: number }>(res, 201);
      expectProceduralAct(data, {
        deadline: {
          timeLimitDays: 5,
          dayType: 'BUSINESS',
          countsFrom: '2026-10-05',
          computedDueDate: '2026-10-12',
          dueDate: '2026-10-20',
          manuallyAdjusted: true,
        },
        // Quién lo ajustó queda registrado en el acto.
        registeredBy: { id: s.user.id },
      });
      const act = await getPrisma().proceduralAct.findUniqueOrThrow({ where: { id: data.id } });
      expect(act).toMatchObject({
        deadlineComputedDueDate: civil('2026-10-12'),
        deadlineManualDueDate: civil('2026-10-20'),
        registeredByUserId: s.user.id,
      });
    });

    it('rechaza un ajuste anterior a la fecha desde la que corre el plazo', async () => {
      const before = await snapshot();

      const res = await register({
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        actDate: '2026-10-05',
        manualDueDate: '2026-10-04',
      });

      expectError(res, 400, 'VALIDATION_ERROR', ['manualDueDate']);
      expect(await snapshot()).toEqual(before);
    });
  });

  // ── Plazo copiado ─────────────────────────────────────────────────

  describe('plazo copiado al acto (CA-26.6)', () => {
    it('si después se modifica el plazo del estado, el vencimiento del acto no cambia', async () => {
      const stateId = s.states.fiveBusinessDays.stateId;
      const res = await register({ proceduralStateId: stateId, actDate: '2026-10-05' });
      const { id } = expectData<{ id: number }>(res, 201);

      await getPrisma().proceduralState.update({
        where: { stateId },
        data: { timeLimitDays: 30, dayType: 'CONSECUTIVE' },
      });

      const act = await getPrisma().proceduralAct.findUniqueOrThrow({ where: { id } });
      expect(act).toMatchObject({
        deadlineTimeLimitDays: 5,
        deadlineDayType: 'BUSINESS',
        deadlineComputedDueDate: civil('2026-10-12'),
      });
    });
  });

  // ── Estado escrito a mano ─────────────────────────────────────────

  describe('estado escrito a mano (CA-26.7)', () => {
    const customState = 'Pedido de informes al Registro Nacional de Reincidencia';

    it('queda guardado solo en esa causa, sin plazo y sin entrar a la tabla del fuero', async () => {
      const statesBefore = await getPrisma().proceduralState.count();

      const res = await register({ customState, actDate: '2026-10-05' });

      const data = expectData<{ id: number }>(res, 201);
      expectProceduralAct(data, {
        resultingState: { proceduralStateId: null, name: customState, custom: true },
        // No abre plazo y no se cargó un vencimiento a mano: no hay plazo que informar.
        deadline: null,
      });
      const act = await getPrisma().proceduralAct.findUniqueOrThrow({ where: { id: data.id } });
      expect(act).toMatchObject({
        proceduralStateId: null,
        customState,
        deadlineTimeLimitDays: 0,
        deadlineDayType: 'NONE',
        deadlineComputedDueDate: null,
        deadlineManualDueDate: null,
      });
      // La causa pasa al texto escrito a mano (y a ningún estado de la tabla).
      const caseRow = await getPrisma().case.findUniqueOrThrow({ where: { id: s.caseRow.id } });
      expect(caseRow).toMatchObject({
        currentStateId: null,
        currentCustomState: customState,
        currentProceduralActId: data.id,
      });
      expect(await getPrisma().proceduralState.count()).toBe(statesBefore);
    });

    it('solo tiene vencimiento si se carga a mano', async () => {
      const res = await register({ customState, actDate: '2026-10-05', manualDueDate: '2026-10-25' });

      expectProceduralAct(expectData(res, 201), {
        deadline: {
          timeLimitDays: 0,
          dayType: 'NONE',
          countsFrom: '2026-10-05',
          computedDueDate: null,
          dueDate: '2026-10-25',
          manuallyAdjusted: true,
        },
      });
    });

    it('no puede coincidir con un estado de la tabla, sin distinguir mayúsculas', async () => {
      const before = await snapshot();

      const res = await register({
        customState: 'OPOSICIÓN AL REQUERIMIENTO DE ELEVACIÓN',
        actDate: '2026-10-05',
      });

      expectError(res, 400, 'VALIDATION_ERROR', ['customState']);
      expect(await snapshot()).toEqual(before);
    });
  });

  // ── Destinos que no se ofrecen ────────────────────────────────────

  describe('estados que no se ofrecen como destino (CA-26.8)', () => {
    it.each([
      ['un estado terminal', () => s.states.terminal.stateId],
      ['el estado inicial', () => s.states.initial.stateId],
      ['un estado de otro fuero', () => s.states.administrative.stateId],
      ['un estado dado de baja', () => s.states.deactivated.stateId],
      ['un estado que no existe', () => 999999],
    ])('rechaza %s y no guarda nada', async (_name, stateId) => {
      const before = await snapshot();

      const res = await register({ proceduralStateId: stateId(), actDate: '2026-10-05' });

      expectError(res, 400, 'VALIDATION_ERROR', ['proceduralStateId']);
      expect(await snapshot()).toEqual(before);
    });

    it('hay que indicar el estado de la tabla o uno escrito a mano, no ambos ni ninguno', async () => {
      const before = await snapshot();

      const both = await register({
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        customState: 'Otro',
        actDate: '2026-10-05',
      });
      const none = await register({ actDate: '2026-10-05' });

      expectError(both, 400, 'VALIDATION_ERROR', ['proceduralStateId']);
      expectError(none, 400, 'VALIDATION_ERROR', ['proceduralStateId']);
      expect(await snapshot()).toEqual(before);
    });
  });

  // ── Primer acto y actos anteriores ────────────────────────────────

  describe('primer acto de la causa (CA-26.9)', () => {
    it('saca a la causa del estado inicial y la lleva al ciclo de vida del fuero', async () => {
      expect(s.caseRow.currentStateId).toBe(s.states.initial.stateId);

      await register({ proceduralStateId: s.states.tenConsecutiveDays.stateId, actDate: '2026-10-05' });

      const caseRow = await getPrisma().case.findUniqueOrThrow({ where: { id: s.caseRow.id } });
      expect(caseRow.currentStateId).toBe(s.states.tenConsecutiveDays.stateId);
      expect(caseRow.currentStateId).not.toBe(s.states.initial.stateId);
    });
  });

  describe('acto con fecha anterior al del último (CA-26.10)', () => {
    it('queda asentado pero no retrocede el estado actual ni reemplaza el vencimiento vigente', async () => {
      const first = expectData<{ id: number }>(
        await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' }),
        201,
      );

      const older = await register({ proceduralStateId: s.states.tenConsecutiveDays.stateId, actDate: '2026-10-01' });

      expectData(older, 201);
      expect(await getPrisma().proceduralAct.count()).toBe(2);
      const caseRow = await getPrisma().case.findUniqueOrThrow({ where: { id: s.caseRow.id } });
      expect(caseRow).toMatchObject({
        currentStateId: s.states.fiveBusinessDays.stateId,
        currentProceduralActId: first.id,
      });
    });

    it('un acto posterior sí pasa a ser el vigente', async () => {
      await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-01' });

      const later = expectData<{ id: number }>(
        await register({ proceduralStateId: s.states.tenConsecutiveDays.stateId, actDate: '2026-10-05' }),
        201,
      );

      const caseRow = await getPrisma().case.findUniqueOrThrow({ where: { id: s.caseRow.id } });
      expect(caseRow).toMatchObject({
        currentStateId: s.states.tenConsecutiveDays.stateId,
        currentProceduralActId: later.id,
      });
    });
  });

  // ── Fecha del acto y estado sin plazo ─────────────────────────────

  describe('fecha del acto (CA-26.11)', () => {
    it('rechaza una fecha posterior a hoy y no guarda nada', async () => {
      const before = await snapshot();

      const res = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-07' });

      expectError(res, 400, 'VALIDATION_ERROR', ['actDate']);
      expect(await snapshot()).toEqual(before);
    });

    it('acepta un acto de hoy', async () => {
      const res = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-06' });

      expectProceduralAct(expectData(res, 201), { actDate: '2026-10-06' });
    });
  });

  describe('estado sin plazo (CA-26.12)', () => {
    it('sin vencimiento manual, la causa queda sin vencimiento vigente', async () => {
      const res = await register({ proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-10-05' });

      const data = expectData<{ id: number }>(res, 201);
      expectProceduralAct(data, { deadline: null });
      const act = await getPrisma().proceduralAct.findUniqueOrThrow({ where: { id: data.id } });
      expect(act).toMatchObject({
        deadlineTimeLimitDays: 0,
        deadlineDayType: 'NONE',
        deadlineComputedDueDate: null,
        deadlineManualDueDate: null,
      });
      const caseRow = await getPrisma().case.findUniqueOrThrow({ where: { id: s.caseRow.id } });
      expect(caseRow.currentProceduralActId).toBe(data.id);
    });
  });

  // ── Errores del contrato ──────────────────────────────────────────

  describe('errores del contrato', () => {
    const validBody = () => ({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });

    it('responde 401 sin token', async () => {
      const res = await request(app.getHttpServer()).post(url()).send(validBody());

      expectError(res, 401, 'UNAUTHENTICATED');
    });

    it('responde 404 si la causa no existe', async () => {
      const res = await register(validBody(), s.responsible, 999999);

      expectError(res, 404, 'CASE_NOT_FOUND');
    });

    it('responde 400 si el identificador de la causa no es un entero', async () => {
      const res = await register(validBody(), s.responsible, 'abc');

      expectError(res, 400, 'INVALID_PATH_PARAMETER', ['caseId']);
    });

    it('responde 422 si la causa está en un estado terminal y no guarda nada', async () => {
      const closed = await createCase({
        clientId: s.client.id,
        responsibleLawyerId: s.lawyer.id,
        createdByUserId: s.user.id,
        currentStateId: s.states.terminal.stateId,
      });
      const before = await snapshot(closed.id);

      const res = await register(validBody(), s.responsible, closed.id);

      expectError(res, 422, 'CASE_IN_TERMINAL_STATE');
      expect(await snapshot(closed.id)).toEqual(before);
    });

    it('el 404, el 403 y el 422 se resuelven antes que las reglas de los datos', async () => {
      const closed = await createCase({
        clientId: s.client.id,
        responsibleLawyerId: s.lawyer.id,
        createdByUserId: s.user.id,
        currentStateId: s.states.terminal.stateId,
      });
      const invalid = { proceduralStateId: 999999, actDate: '2026-12-01' };

      expectError(await register(invalid, s.responsible, 999999), 404, 'CASE_NOT_FOUND');
      expectError(await register(invalid, s.notResponsible), 403, 'FORBIDDEN');
      expectError(await register(invalid, s.responsible, closed.id), 422, 'CASE_IN_TERMINAL_STATE');
    });

    it('responde 400 con el campo por una propiedad que el contrato no define', async () => {
      const res = await register({ ...validBody(), registeredAt: '2026-01-01' });

      expectError(res, 400, 'VALIDATION_ERROR', ['registeredAt']);
    });

    it('responde 400 con el campo si un valor no tiene el tipo del contrato', async () => {
      const res = await register({ proceduralStateId: 'doce', actDate: 'ayer', notes: 123 });

      expectError(res, 400, 'VALIDATION_ERROR', ['proceduralStateId', 'actDate', 'notes']);
    });

    it('responde 400 si la fecha del acto falta', async () => {
      const res = await register({ proceduralStateId: s.states.fiveBusinessDays.stateId });

      expectError(res, 400, 'VALIDATION_ERROR', ['actDate']);
    });
  });
});
