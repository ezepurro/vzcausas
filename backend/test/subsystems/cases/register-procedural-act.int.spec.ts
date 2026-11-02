import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { startTestApp, stopTestApp, getPrisma } from '../../shared/harness/test-app';
import { civil, FIXED_NOW, withFixedClock } from '../../shared/harness/fixed-clock';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { expectDeadlinePreview, expectProceduralAct } from '../../shared/contract/procedural-acts';
import { loginAs } from '../../shared/auth/login-as';
import { createCase } from '../../shared/factories/case.factory';
import { createProceduralAct } from '../../shared/factories/procedural-act.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU26 Registrar acto procesal:
 *   POST /cases/{caseId}/procedural-acts
 *   GET  /cases/{caseId}/procedural-acts/deadline-preview
 * Contrato: `API_CONTRACT_V5.md` §3.8 (`ProceduralAct`, `Deadline`, `DeadlinePreview`).
 *
 * Una sola app: la previsualización anticipa el vencimiento que el registro va a
 * calcular (D-20), y los dos comparten el escenario y el orden de los chequeos.
 * "Hoy" es el martes 6/10/2026 (reloj fijo). El estado, el fuero, el abogado y el
 * usuario salen de la base real por los adaptadores de `legal-parameters` y `people`.
 *
 * El cómputo del vencimiento y sus bordes están en `business-days.spec.ts` y
 * `deadline.vo.spec.ts`; las reglas del acto, en `procedural-act.entity.spec.ts`.
 * Acá: la forma del contrato, lo persistido, que un rechazo no escriba nada, cada
 * código de error una vez y las reglas que necesitan la base. El 401 sin token está
 * en `test/smoke/app.int.spec.ts`.
 */
let app: INestApplication;
let s: ProceduralActScenario;

const actsUrl = (caseId: number | string = s.caseRow.id) => `/api/v1/cases/${caseId}/procedural-acts`;

const register = (
  body: Record<string, unknown>,
  actor: { Authorization: string } = s.responsible,
  caseId: number | string = s.caseRow.id,
) => request(app.getHttpServer()).post(actsUrl(caseId)).set(actor).send(body);

const preview = (
  query: Record<string, string | number>,
  actor: { Authorization: string } = s.responsible,
  caseId: number | string = s.caseRow.id,
) => request(app.getHttpServer()).get(`${actsUrl(caseId)}/deadline-preview`).set(actor).query(query);

/** Lo que un rechazo no debe tocar: los actos guardados, los estados y la fila de la causa. */
const snapshot = async (caseId: number = s.caseRow.id) => ({
  acts: await getPrisma().proceduralAct.count(),
  states: await getPrisma().proceduralState.count(),
  caseRow: await getPrisma().case.findUniqueOrThrow({ where: { id: caseId } }),
});

const caseRowOf = (caseId: number = s.caseRow.id) => getPrisma().case.findUniqueOrThrow({ where: { id: caseId } });
const actRow = (id: number) => getPrisma().proceduralAct.findUniqueOrThrow({ where: { id } });

const aClosedCase = () =>
  createCase({
    clientId: s.client.id,
    responsibleLawyerId: s.lawyer.id,
    createdByUserId: s.user.id,
    currentStateId: s.states.terminal.stateId,
  });

const anAdministrativeCase = () =>
  createCase({
    clientId: s.client.id,
    responsibleLawyerId: s.lawyer.id,
    createdByUserId: s.user.id,
    jurisdiction: 'ADMINISTRATIVE',
  });

/** Los destinos que no se ofrecen (CA-26.8, D-69): los mismos para el registro y la previsualización. */
const notOffered = () => [
  ['el estado Prescripta', s.states.prescribed.stateId],
  ['el estado inicial', s.states.initial.stateId],
  ['un estado de otro fuero', s.states.administrative.stateId],
  ['un estado dado de baja', s.states.deactivated.stateId],
  ['un estado que no existe', 999999],
] as const;

/** CA-26.2: otro abogado, un administrador sin el rol de abogado (aunque su ficha sea la del responsable) y un usuario sin ficha. */
const notResponsibleActors = () => [s.notResponsible, s.administrator, loginAs({ roles: ['LAWYER'], lawyerId: null })];

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

describe('POST /api/v1/cases/{caseId}/procedural-acts', () => {
  // CA-26.1, CA-26.3, CA-26.9
  it('asienta el acto con su plazo, en la forma del contrato, y saca a la causa del estado inicial', async () => {
    const stateId = s.states.fiveBusinessDays.stateId;

    const res = await register({ proceduralStateId: stateId, actDate: '2026-10-05', notes: 'Con acusación, pero con oposición.' });

    // El acto de 5 días hábiles del lunes 5/10 vence el lunes 12/10.
    const data = expectData<{ id: number }>(res, 201);
    expectProceduralAct(data, {
      caseId: s.caseRow.id,
      resultingState: { proceduralStateId: stateId, name: 'Oposición al requerimiento de elevación', custom: false },
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
        manualTimeLimitDays: null,
      },
      // El usuario es el que llama; el nombre sale de la ficha del abogado.
      registeredBy: { id: s.user.id, lastName: 'Ríos', firstName: 'Malena' },
      registeredAt: '2026-10-06T12:30:00-03:00',
    });
    expect(await actRow(data.id)).toMatchObject({
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
    // La misma transacción mueve la causa al estado del acto y la apunta a él.
    expect(await caseRowOf()).toMatchObject({
      currentStateId: stateId,
      currentCustomState: null,
      currentProceduralActId: data.id,
      updatedAt: FIXED_NOW,
    });
  });

  // CA-26.2
  it('sólo lo registra el abogado responsable: a cualquier otro le responde 403 sin guardar nada; administrador y abogado a la vez, sí', async () => {
    const body = { proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' };
    const before = await snapshot();

    for (const actor of notResponsibleActors()) {
      expectError(await register(body, actor), 403, 'FORBIDDEN');
    }
    expect(await snapshot()).toEqual(before);

    const both = loginAs({ userId: s.user.id, roles: ['ADMINISTRATOR', 'LAWYER'], lawyerId: s.lawyer.id });
    expectData(await register(body, both), 201);
  });

  // CA-26.4, RN6
  describe('fuero administrativo', () => {
    it('el plazo corre desde la notificación; sin plazo no hace falta notificación', async () => {
      const administrative = await anAdministrativeCase();

      const res = await register(
        { proceduralStateId: s.states.administrative.stateId, actDate: '2026-10-02', notificationDate: '2026-10-05' },
        s.responsible,
        administrative.id,
      );

      // Notificación del lunes 5/10 + 10 días hábiles = lunes 19/10.
      const data = expectData<{ id: number }>(res, 201);
      expectProceduralAct(data, {
        actDate: '2026-10-02',
        notificationDate: '2026-10-05',
        deadline: { countsFrom: '2026-10-05', computedDueDate: '2026-10-19', dueDate: '2026-10-19' },
      });
      expect(await actRow(data.id)).toMatchObject({
        notificationDate: civil('2026-10-05'),
        deadlineCountsFrom: civil('2026-10-05'),
        deadlineComputedDueDate: civil('2026-10-19'),
      });
      expectData(
        await register(
          { proceduralStateId: s.states.administrativeWithoutTerm.stateId, actDate: '2026-10-05' },
          s.responsible,
          administrative.id,
        ),
        201,
      );
    });

    it('rechaza la falta de notificación si el estado abre plazo, y una notificación en otro fuero, sin guardar nada', async () => {
      const administrative = await anAdministrativeCase();
      const before = { administrative: await snapshot(administrative.id), criminal: await snapshot() };

      const missing = await register(
        { proceduralStateId: s.states.administrative.stateId, actDate: '2026-10-02' },
        s.responsible,
        administrative.id,
      );
      const notApplicable = await register({
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        actDate: '2026-10-05',
        notificationDate: '2026-10-05',
      });

      expectError(missing, 400, 'VALIDATION_ERROR', ['notificationDate']);
      expectError(notApplicable, 400, 'VALIDATION_ERROR', ['notificationDate']);
      expect({ administrative: await snapshot(administrative.id), criminal: await snapshot() }).toEqual(before);
    });
  });

  // CA-26.5, D-86
  it('el vencimiento ajustado a mano pasa a ser el vigente y se conserva el calculado', async () => {
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
        // Del lunes 5/10 al martes 20/10 hay 11 días hábiles (6-9, 12-16, 19-20).
        manualTimeLimitDays: 11,
      },
      registeredBy: { id: s.user.id },
    });
    expect(await actRow(data.id)).toMatchObject({
      deadlineComputedDueDate: civil('2026-10-12'),
      deadlineManualDueDate: civil('2026-10-20'),
    });
  });

  // CA-26.6
  it('el plazo se copia al acto: si después cambia el del estado, el vencimiento del acto no cambia', async () => {
    const stateId = s.states.fiveBusinessDays.stateId;
    const { id } = expectData<{ id: number }>(await register({ proceduralStateId: stateId, actDate: '2026-10-05' }), 201);

    await getPrisma().proceduralState.update({ where: { stateId }, data: { timeLimitDays: 30, dayType: 'CONSECUTIVE' } });

    expect(await actRow(id)).toMatchObject({
      deadlineTimeLimitDays: 5,
      deadlineDayType: 'BUSINESS',
      deadlineComputedDueDate: civil('2026-10-12'),
    });
  });

  // CA-26.7
  it('un estado escrito a mano queda sólo en esa causa, fuera de la tabla, y tiene vencimiento sólo si se carga a mano', async () => {
    const customState = 'Pedido de informes al Registro Nacional de Reincidencia';
    const other = await createCase({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id });
    const statesBefore = await getPrisma().proceduralState.count();

    const plain = expectData<{ id: number }>(await register({ customState, actDate: '2026-10-05' }), 201);
    const withManual = expectData(
      await register({ customState, actDate: '2026-10-05', manualDueDate: '2026-10-25' }, s.responsible, other.id),
      201,
    );

    expectProceduralAct(plain, {
      resultingState: { proceduralStateId: null, name: customState, custom: true },
      deadline: null, // no abre plazo y no se cargó un vencimiento a mano
    });
    expect(await actRow(plain.id)).toMatchObject({
      proceduralStateId: null,
      customState,
      deadlineTimeLimitDays: 0,
      deadlineDayType: 'NONE',
      deadlineComputedDueDate: null,
      deadlineManualDueDate: null,
    });
    expect(await caseRowOf()).toMatchObject({ currentStateId: null, currentCustomState: customState, currentProceduralActId: plain.id });
    expect(await getPrisma().proceduralState.count()).toBe(statesBefore);
    expectProceduralAct(withManual, {
      deadline: {
        timeLimitDays: 0,
        dayType: 'NONE',
        countsFrom: '2026-10-05',
        computedDueDate: null,
        dueDate: '2026-10-25',
        manuallyAdjusted: true,
        manualTimeLimitDays: null, // D-86: sin plazo de tabla no hay unidad en la que contar
      },
    });
  });

  // CA-26.12
  it('un estado sin plazo deja la causa sin vencimiento vigente', async () => {
    const data = expectData<{ id: number }>(
      await register({ proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-10-05' }),
      201,
    );

    expectProceduralAct(data, { deadline: null });
    expect(await actRow(data.id)).toMatchObject({
      deadlineTimeLimitDays: 0,
      deadlineDayType: 'NONE',
      deadlineComputedDueDate: null,
      deadlineManualDueDate: null,
    });
    expect((await caseRowOf()).currentProceduralActId).toBe(data.id);
  });

  // CA-26.10
  it('un acto anterior al último queda asentado sin retroceder el estado; uno posterior pasa a ser el vigente', async () => {
    const first = expectData<{ id: number }>(
      await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' }),
      201,
    );

    expectData(await register({ proceduralStateId: s.states.tenConsecutiveDays.stateId, actDate: '2026-10-01' }), 201);
    expect(await getPrisma().proceduralAct.count()).toBe(2);
    expect(await caseRowOf()).toMatchObject({ currentStateId: s.states.fiveBusinessDays.stateId, currentProceduralActId: first.id });

    const later = expectData<{ id: number }>(
      await register({ proceduralStateId: s.states.tenConsecutiveDays.stateId, actDate: '2026-10-06' }),
      201,
    );
    expect(await caseRowOf()).toMatchObject({ currentStateId: s.states.tenConsecutiveDays.stateId, currentProceduralActId: later.id });
  });

  // D-69
  it('un acto puede cerrar la causa en "Archivada", sin vencimiento, y después la causa no admite actos nuevos', async () => {
    const res = await register({ proceduralStateId: s.states.terminal.stateId, actDate: '2026-10-05' });

    expect(expectData<{ deadline: unknown }>(res, 201).deadline).toBeNull();
    expect((await caseRowOf()).currentStateId).toBe(s.states.terminal.stateId);
    expectError(
      await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-06' }),
      422,
      'CASE_IN_TERMINAL_STATE',
    );
  });

  // CA-26.8. Contra la base: la tabla de estados la resuelve `legal-parameters`.
  it('rechaza un destino que no se ofrece, y el estado de la tabla y uno escrito a mano juntos o ninguno, sin guardar nada', async () => {
    const before = await snapshot();

    for (const [name, stateId] of notOffered()) {
      const res = await register({ proceduralStateId: stateId, actDate: '2026-10-05' });
      expect({ name, status: res.status }).toEqual({ name, status: 400 });
      expectError(res, 400, 'VALIDATION_ERROR', ['proceduralStateId']);
    }
    expectError(
      await register({ proceduralStateId: s.states.fiveBusinessDays.stateId, customState: 'Otro', actDate: '2026-10-05' }),
      400,
      'VALIDATION_ERROR',
      ['proceduralStateId'],
    );
    expectError(await register({ actDate: '2026-10-05' }), 400, 'VALIDATION_ERROR', ['proceduralStateId']);
    expect(await snapshot()).toEqual(before);
  });

  // CA-26.5, CA-26.7, CA-26.11, D-69
  it('rechaza los datos que el dominio no admite nombrando el campo, sin guardar nada', async () => {
    const stateId = s.states.fiveBusinessDays.stateId;
    const before = await snapshot();

    const cases: [Record<string, unknown>, string][] = [
      [{ proceduralStateId: stateId, actDate: '2026-10-05', manualDueDate: '2026-10-04' }, 'manualDueDate'],
      [{ proceduralStateId: s.states.terminal.stateId, actDate: '2026-10-05', manualDueDate: '2026-10-20' }, 'manualDueDate'],
      // No puede coincidir con un estado de la tabla, sin distinguir mayúsculas.
      [{ customState: 'OPOSICIÓN AL REQUERIMIENTO DE ELEVACIÓN', actDate: '2026-10-05' }, 'customState'],
      [{ proceduralStateId: stateId, actDate: '2026-10-07' }, 'actDate'], // mañana
    ];
    for (const [body, field] of cases) {
      expectError(await register(body), 400, 'VALIDATION_ERROR', [field]);
    }
    expect(await snapshot()).toEqual(before);
  });

  // `flujo-hu-backend.md`: 401 → 400 de forma → 403 → 404 → 422 → 400 de contenido.
  it('resuelve 404, 403 y 422 antes que las reglas de los datos, y el 422 no guarda nada', async () => {
    const closed = await aClosedCase();
    const invalid = { proceduralStateId: 999999, actDate: '2026-12-01' };
    const before = await snapshot(closed.id);

    const notFound = await register(invalid, s.responsible, 999999);
    expectError(notFound, 404, 'CASE_NOT_FOUND');
    expect(notFound.body.error.message).toBe('No se encontró la causa solicitada.');
    expectError(await register(invalid, s.notResponsible), 403, 'FORBIDDEN');
    expectError(await register(invalid, s.responsible, closed.id), 422, 'CASE_IN_TERMINAL_STATE');
    expect(await snapshot(closed.id)).toEqual(before);
  });

  it('responde 400 de forma: propiedad que el contrato no define, tipos inválidos, fecha faltante e id de causa no entero', async () => {
    const valid = { proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' };

    expectError(await register({ ...valid, registeredAt: '2026-01-01' }), 400, 'VALIDATION_ERROR', ['registeredAt']);
    expectError(await register({ proceduralStateId: 'doce', actDate: 'ayer', notes: 123 }), 400, 'VALIDATION_ERROR', [
      'proceduralStateId',
      'actDate',
      'notes',
    ]);
    expectError(await register({ proceduralStateId: valid.proceduralStateId }), 400, 'VALIDATION_ERROR', ['actDate']);
    expectError(await register(valid, s.responsible, 'abc'), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
  });
});

describe('GET /api/v1/cases/{caseId}/procedural-acts/deadline-preview', () => {
  // CA-26.3, CA-26.12. Desde hoy (martes 6/10).
  it('devuelve el vencimiento que tendría el acto y los días hábiles que restan, en la forma del contrato', async () => {
    const five = s.states.fiveBusinessDays.stateId;

    // Lunes 5/10 + 5 días hábiles = lunes 12/10: restan miércoles, jueves, viernes y lunes.
    expectDeadlinePreview(expectData(await preview({ proceduralStateId: five, actDate: '2026-10-05' }), 200), {
      proceduralStateId: five,
      timeLimitDays: 5,
      dayType: 'BUSINESS',
      countsFrom: '2026-10-05',
      dueDate: '2026-10-12',
      businessDaysRemaining: 4,
    });
    // Un acto de hoy deja todo el plazo por delante (CA-26.11 lo admite).
    expectDeadlinePreview(expectData(await preview({ proceduralStateId: five, actDate: '2026-10-06' }), 200), {
      dueDate: '2026-10-13',
      businessDaysRemaining: 5,
    });
    // Lunes 14/9 + 5 = lunes 21/9: venció hace 11 días hábiles, y se informa en negativo.
    expectDeadlinePreview(expectData(await preview({ proceduralStateId: five, actDate: '2026-09-14' }), 200), {
      dueDate: '2026-09-21',
      businessDaysRemaining: -11,
    });
    expectDeadlinePreview(
      expectData(await preview({ proceduralStateId: s.states.tenConsecutiveDays.stateId, actDate: '2026-10-05' }), 200),
      { timeLimitDays: 10, dayType: 'CONSECUTIVE', dueDate: '2026-10-15', businessDaysRemaining: 7 },
    );
    expectDeadlinePreview(
      expectData(await preview({ proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-10-05' }), 200),
      { timeLimitDays: 0, dayType: 'NONE', countsFrom: '2026-10-05', dueDate: null, businessDaysRemaining: null },
    );
  });

  it('no registra nada, y responde igual sobre una causa en estado terminal: el 422 lo da el registro', async () => {
    const before = await caseRowOf();
    const closed = await aClosedCase();

    await preview({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });
    const onClosed = await preview(
      { proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' },
      s.responsible,
      closed.id,
    );

    expectDeadlinePreview(expectData(onClosed, 200), { dueDate: '2026-10-12' });
    expect(await getPrisma().proceduralAct.count()).toBe(0);
    expect(await caseRowOf()).toEqual(before);
  });

  // D-20
  it('previsualizar y registrar con los mismos datos da el mismo vencimiento', async () => {
    const query = { proceduralStateId: s.states.tenConsecutiveDays.stateId, actDate: '2026-10-05' };

    const previewed = expectData<Record<string, unknown>>(await preview(query), 200);
    const registered = expectData<{ deadline: Record<string, unknown> }>(await register(query), 201);

    expect(registered.deadline).toMatchObject({
      timeLimitDays: previewed.timeLimitDays,
      dayType: previewed.dayType,
      countsFrom: previewed.countsFrom,
      dueDate: previewed.dueDate,
    });
  });

  // CA-26.4, RN6
  it('en el fuero administrativo corre desde la notificación, que es obligatoria sólo si el estado abre plazo y no se informa en otro fuero', async () => {
    const administrative = await anAdministrativeCase();
    const onAdministrative = (query: Record<string, string | number>) => preview(query, s.responsible, administrative.id);

    // Notificación del lunes 5/10 + 10 días hábiles = lunes 19/10.
    expectDeadlinePreview(
      expectData(
        await onAdministrative({
          proceduralStateId: s.states.administrative.stateId,
          actDate: '2026-10-02',
          notificationDate: '2026-10-05',
        }),
        200,
      ),
      { timeLimitDays: 10, dayType: 'BUSINESS', countsFrom: '2026-10-05', dueDate: '2026-10-19', businessDaysRemaining: 9 },
    );
    expectDeadlinePreview(
      expectData(await onAdministrative({ proceduralStateId: s.states.administrativeWithoutTerm.stateId, actDate: '2026-10-02' }), 200),
      { countsFrom: '2026-10-02', dueDate: null },
    );

    const missing = await onAdministrative({ proceduralStateId: s.states.administrative.stateId, actDate: '2026-10-02' });
    expectError(missing, 400, 'INVALID_REQUEST', ['notificationDate']);
    expect(missing.body.error.message).toBe('Parámetros de query inválidos.');
    expectError(
      await preview({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05', notificationDate: '2026-10-05' }),
      400,
      'INVALID_REQUEST',
      ['notificationDate'],
    );
  });

  it('responde 400 de forma: faltan el estado y la fecha, formatos inválidos, un parámetro que el contrato no define y un id de causa no entero', async () => {
    const valid = { proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' };

    const missing = await preview({});
    expectError(missing, 400, 'INVALID_REQUEST', ['proceduralStateId', 'actDate']);
    expect(missing.body.error.message).toBe('Parámetros de query inválidos.');
    expectError(
      await preview({ proceduralStateId: 'abc', actDate: '15/09/2026', notificationDate: 'mañana' }),
      400,
      'INVALID_REQUEST',
      ['proceduralStateId', 'actDate', 'notificationDate'],
    );
    // El pipe global rechaza lo que el contrato no define.
    expectError(await preview({ ...valid, manualDueDate: '2026-10-20' }), 400, 'VALIDATION_ERROR', ['manualDueDate']);
    expectError(await preview(valid, s.responsible, 'abc'), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
  });

  // CA-26.8, CA-26.11
  it('rechaza un destino que no se ofrece y una fecha del acto posterior a hoy', async () => {
    for (const [name, stateId] of notOffered()) {
      const res = await preview({ proceduralStateId: stateId, actDate: '2026-10-05' });
      expect({ name, status: res.status }).toEqual({ name, status: 400 });
      expectError(res, 400, 'INVALID_REQUEST', ['proceduralStateId']);
    }
    expectError(
      await preview({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-07' }),
      400,
      'INVALID_REQUEST',
      ['actDate'],
    );
  });

  // CA-26.2. Un acto previo en la causa no cambia quién puede previsualizar.
  it('sólo previsualiza el abogado responsable, aunque la causa ya tenga actos', async () => {
    await createProceduralAct({
      caseId: s.caseRow.id,
      registeredByUserId: s.user.id,
      registeredByLawyerId: s.lawyer.id,
      proceduralStateId: s.states.fiveBusinessDays.stateId,
      asCurrent: true,
    });
    const query = { proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' };

    for (const actor of notResponsibleActors()) {
      expectError(await preview(query, actor), 403, 'FORBIDDEN');
    }
  });

  // Bien formados pero inválidos: los de formato los rechaza antes el mapper de la query.
  it('resuelve 404 y 403 antes que las reglas de los datos', async () => {
    const invalid = { proceduralStateId: 999999, actDate: '2026-12-01' };

    expectError(await preview(invalid, s.responsible, 999999), 404, 'CASE_NOT_FOUND');
    expectError(await preview(invalid, s.notResponsible), 403, 'FORBIDDEN');
  });
});
