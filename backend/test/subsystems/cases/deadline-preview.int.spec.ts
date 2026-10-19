import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { startTestApp, stopTestApp, getPrisma } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { expectDeadlinePreview } from '../../shared/contract/procedural-acts';
import { loginAs } from '../../shared/auth/login-as';
import { createCase } from '../../shared/factories/case.factory';
import { createProceduralAct } from '../../shared/factories/procedural-act.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU26 — GET /cases/{caseId}/procedural-acts/deadline-preview.
 * Contrato: openapi `paths/cases@{caseId}@procedural-acts@deadline-preview.yaml`
 * y `components/schemas/DeadlinePreview.yaml`.
 *
 * "Hoy" es el martes 6/10/2026 (reloj fijo): los vencimientos y los días hábiles
 * que restan no dependen del día en que se corre la suite.
 */
describe('GET /api/v1/cases/:caseId/procedural-acts/deadline-preview', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;

  const previewUrl = (caseId: number | string = s.caseRow.id) =>
    `/api/v1/cases/${caseId}/procedural-acts/deadline-preview`;

  const preview = (query: Record<string, string | number>, actor: { Authorization: string } = s.responsible) =>
    request(app.getHttpServer()).get(previewUrl()).set(actor).query(query);

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

  // ── Contrato ──────────────────────────────────────────────────────

  describe('vencimiento que tendría el acto (CA-26.3)', () => {
    it('días hábiles: cuenta desde el día siguiente al acto', async () => {
      // Acto del lunes 5/10 + 5 días hábiles = lunes 12/10. Desde hoy (martes 6): miércoles, jueves, viernes y lunes.
      const res = await preview({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });

      const data = expectData(res, 200);
      expectDeadlinePreview(data, {
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        timeLimitDays: 5,
        dayType: 'BUSINESS',
        countsFrom: '2026-10-05',
        dueDate: '2026-10-12',
        businessDaysRemaining: 4,
      });
    });

    it('días corridos: cuenta de corrido, fines de semana incluidos', async () => {
      const res = await preview({ proceduralStateId: s.states.tenConsecutiveDays.stateId, actDate: '2026-10-05' });

      const data = expectData(res, 200);
      expectDeadlinePreview(data, {
        timeLimitDays: 10,
        dayType: 'CONSECUTIVE',
        countsFrom: '2026-10-05',
        dueDate: '2026-10-15',
        businessDaysRemaining: 7,
      });
    });

    it('un acto de hoy deja todo el plazo por delante', async () => {
      const res = await preview({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-06' });

      expectDeadlinePreview(expectData(res, 200), { dueDate: '2026-10-13', businessDaysRemaining: 5 });
    });

    it('un plazo que ya venció informa los días hábiles que restan en negativo', async () => {
      // Acto del lunes 14/9 + 5 días hábiles = lunes 21/9: 11 días hábiles antes de hoy.
      const res = await preview({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-09-14' });

      expectDeadlinePreview(expectData(res, 200), { dueDate: '2026-09-21', businessDaysRemaining: -11 });
    });

    it('un estado que no abre plazo no tiene vencimiento ni días que restan (CA-26.12)', async () => {
      const res = await preview({ proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-10-05' });

      expectDeadlinePreview(expectData(res, 200), {
        proceduralStateId: s.states.withoutTerm.stateId,
        timeLimitDays: 0,
        dayType: 'NONE',
        countsFrom: '2026-10-05',
        dueDate: null,
        businessDaysRemaining: null,
      });
    });

    it('no registra nada: ni el acto ni el estado de la causa cambian', async () => {
      const before = await getPrisma().case.findUniqueOrThrow({ where: { id: s.caseRow.id } });

      await preview({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });
      await preview({ proceduralStateId: s.states.tenConsecutiveDays.stateId, actDate: '2026-10-05' });

      expect(await getPrisma().proceduralAct.count()).toBe(0);
      const after = await getPrisma().case.findUniqueOrThrow({ where: { id: s.caseRow.id } });
      expect(after).toEqual(before);
    });

    it('responde igual sobre una causa en estado terminal: el 422 lo da el registro', async () => {
      const closed = await createCase({
        clientId: s.client.id,
        responsibleLawyerId: s.lawyer.id,
        createdByUserId: s.user.id,
        currentStateId: s.states.terminal.stateId,
      });

      const res = await request(app.getHttpServer())
        .get(previewUrl(closed.id))
        .set(s.responsible)
        .query({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });

      expectDeadlinePreview(expectData(res, 200), { dueDate: '2026-10-12' });
    });
  });

  describe('coincide con lo que después registra el acto (D-20)', () => {
    it('previsualizar y registrar con los mismos datos da el mismo vencimiento', async () => {
      const query = { proceduralStateId: s.states.tenConsecutiveDays.stateId, actDate: '2026-10-05' };

      const previewed = expectData<Record<string, unknown>>(await preview(query), 200);
      const registered = expectData<{ deadline: Record<string, unknown> }>(
        await request(app.getHttpServer())
          .post(`/api/v1/cases/${s.caseRow.id}/procedural-acts`)
          .set(s.responsible)
          .send(query),
        201,
      );

      expect(registered.deadline).toMatchObject({
        timeLimitDays: previewed.timeLimitDays,
        dayType: previewed.dayType,
        countsFrom: previewed.countsFrom,
        dueDate: previewed.dueDate,
      });
    });
  });

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

    const previewAdministrative = (query: Record<string, string | number>) =>
      request(app.getHttpServer()).get(previewUrl(administrativeCaseId)).set(s.responsible).query(query);

    it('el plazo corre desde la notificación y no desde la fecha del acto', async () => {
      // Notificación del lunes 5/10 + 10 días hábiles = lunes 19/10.
      const res = await previewAdministrative({
        proceduralStateId: s.states.administrative.stateId,
        actDate: '2026-10-02',
        notificationDate: '2026-10-05',
      });

      expectDeadlinePreview(expectData(res, 200), {
        timeLimitDays: 10,
        dayType: 'BUSINESS',
        countsFrom: '2026-10-05',
        dueDate: '2026-10-19',
        businessDaysRemaining: 9,
      });
    });

    it('la notificación es obligatoria si el estado abre plazo', async () => {
      const res = await previewAdministrative({
        proceduralStateId: s.states.administrative.stateId,
        actDate: '2026-10-02',
      });

      expectError(res, 400, 'INVALID_REQUEST', ['notificationDate']);
      expect(res.body.error.message).toBe('Parámetros de query inválidos.');
    });

    it('si el estado no abre plazo no hace falta notificación', async () => {
      const res = await previewAdministrative({
        proceduralStateId: s.states.administrativeWithoutTerm.stateId,
        actDate: '2026-10-02',
      });

      expectDeadlinePreview(expectData(res, 200), { countsFrom: '2026-10-02', dueDate: null });
    });

    it('en los otros fueros la notificación no se informa', async () => {
      const res = await preview({
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        actDate: '2026-10-05',
        notificationDate: '2026-10-05',
      });

      expectError(res, 400, 'INVALID_REQUEST', ['notificationDate']);
    });
  });

  // ── Parámetros inválidos ──────────────────────────────────────────

  describe('parámetros inválidos (INVALID_REQUEST)', () => {
    it('faltan el estado y la fecha del acto', async () => {
      const res = await preview({});

      expectError(res, 400, 'INVALID_REQUEST', ['proceduralStateId', 'actDate']);
      expect(res.body.error.message).toBe('Parámetros de query inválidos.');
    });

    it('el identificador del estado y las fechas tienen que ser válidos', async () => {
      const res = await preview({ proceduralStateId: 'abc', actDate: '15/09/2026', notificationDate: 'mañana' });

      expectError(res, 400, 'INVALID_REQUEST', ['proceduralStateId', 'actDate', 'notificationDate']);
    });

    it('la fecha del acto no puede ser posterior a hoy (CA-26.11)', async () => {
      const res = await preview({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-07' });

      expectError(res, 400, 'INVALID_REQUEST', ['actDate']);
    });

    it.each([
      ['el estado Prescripta (D-69)', () => s.states.prescribed.stateId],
      ['el estado inicial', () => s.states.initial.stateId],
      ['un estado de otro fuero', () => s.states.administrative.stateId],
      ['un estado dado de baja', () => s.states.deactivated.stateId],
      ['un estado que no existe', () => 999999],
    ])('no se ofrece %s como destino', async (_name, stateId) => {
      const res = await preview({ proceduralStateId: stateId(), actDate: '2026-10-05' });

      expectError(res, 400, 'INVALID_REQUEST', ['proceduralStateId']);
    });

    it('un parámetro que el contrato no define lo rechaza el pipe global', async () => {
      const res = await preview({
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        actDate: '2026-10-05',
        manualDueDate: '2026-10-20',
      });

      expectError(res, 400, 'VALIDATION_ERROR', ['manualDueDate']);
    });

    it('el identificador de la causa tiene que ser un entero', async () => {
      const res = await request(app.getHttpServer())
        .get(previewUrl('abc'))
        .set(s.responsible)
        .query({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });

      expectError(res, 400, 'INVALID_PATH_PARAMETER', ['caseId']);
    });
  });

  // ── Acceso ────────────────────────────────────────────────────────

  describe('quién puede previsualizar (CA-26.2)', () => {
    const validQuery = () => ({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-05' });

    it('responde 401 sin token', async () => {
      const res = await request(app.getHttpServer()).get(previewUrl()).query(validQuery());

      expectError(res, 401, 'UNAUTHENTICATED');
    });

    it('responde 403 a otro abogado', async () => {
      const res = await preview(validQuery(), s.notResponsible);

      expectError(res, 403, 'FORBIDDEN');
    });

    it('responde 403 a un administrador que no tiene el rol de abogado, aunque su ficha sea la del responsable', async () => {
      const res = await preview(validQuery(), s.administrator);

      expectError(res, 403, 'FORBIDDEN');
    });

    it('responde 403 a un usuario sin ficha de abogado', async () => {
      const res = await preview(validQuery(), loginAs({ roles: ['LAWYER'], lawyerId: null }));

      expectError(res, 403, 'FORBIDDEN');
    });

    it('responde 404 si la causa no existe', async () => {
      const res = await request(app.getHttpServer())
        .get(previewUrl(999999))
        .set(s.responsible)
        .query(validQuery());

      expectError(res, 404, 'CASE_NOT_FOUND');
    });

    it('la causa y el responsable se controlan antes que las reglas de los datos', async () => {
      // Bien formados pero inválidos (estado inexistente, fecha futura). Los de formato,
      // como `abc`, los rechaza antes el mapper de la query, igual que el pipe con el cuerpo del POST.
      const invalid = { proceduralStateId: 999999, actDate: '2026-12-01' };

      const notFound = await request(app.getHttpServer()).get(previewUrl(999999)).set(s.responsible).query(invalid);
      const forbidden = await preview(invalid, s.notResponsible);

      expectError(notFound, 404, 'CASE_NOT_FOUND');
      expectError(forbidden, 403, 'FORBIDDEN');
    });

    it('un acto previo en la causa no cambia quién puede previsualizar', async () => {
      await createProceduralAct({
        caseId: s.caseRow.id,
        registeredByUserId: s.user.id,
        registeredByLawyerId: s.lawyer.id,
        proceduralStateId: s.states.fiveBusinessDays.stateId,
        asCurrent: true,
      });

      const res = await preview(validQuery(), s.notResponsible);

      expectError(res, 403, 'FORBIDDEN');
    });
  });
});
