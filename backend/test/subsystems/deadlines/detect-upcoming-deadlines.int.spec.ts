import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { civil } from '../../shared/harness/fixed-clock';
import { expectData } from '../../shared/contract/envelopes';
import { createCase } from '../../shared/factories/case.factory';
import { createProceduralState } from '../../shared/factories/procedural-state.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';
import { InMemoryEmailSender } from '../../shared/fakes/email-sender.fake';
import { CLOCK, ClockPort } from '../../../src/shared/domain/clock.port';
import { EMAIL_SENDER } from '../../../src/subsystems/deadlines/core/domain/ports/email-sender.port';
import { DetectUpcomingDeadlinesUseCase } from '../../../src/subsystems/deadlines/core/application/use-cases/detect-upcoming-deadlines.use-case';
import { UpcomingDeadlineNotice } from '../../../src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice';

/*
 * HU51 — Verificar vencimiento de plazo de presentación (IMPLEMENTACION_DETECCION.md,
 * paso A9). Solo los vencimientos de actos procesales: el del acto lesivo es la
 * fase B.
 *
 * Como el spec de HU52, ejercita la detección REAL: no se reemplaza
 * `DEADLINE_DETECTION`. Se reemplazan solo el correo (en memoria) y el reloj.
 *
 * El reloj es propio y se puede mover (`setToday`), a diferencia de
 * `fixed-clock.ts`: CA-51.8 y la ventana de preaviso (V-12) se prueban corriendo
 * el proceso en días distintos. Arranca el martes 6/10/2026, como el reloj fijo
 * del harness, y vuelve a esa fecha antes de cada test.
 *
 * Los vencimientos se fijan con el ajuste manual del registro de actos, para
 * que cada uno caiga en la fecha exacta que el test necesita. El preaviso es el
 * de por defecto: 3 días hábiles (D-79).
 *
 *   martes 6/10 → viernes 9/10:  3 días hábiles  (preaviso)
 *   martes 6/10 → martes  6/10:  0               (vence hoy)
 *   martes 6/10 → viernes 2/10: -2               (vencido)
 *   martes 6/10 → miércoles 14/10: 6             (todavía nada)
 *
 * Limpieza (TV-02): borra `sent_notifications` antes que las causas, en cada
 * `beforeEach` y al terminar.
 */
const DAILY_RUN = '/api/v1/internal/deadlines/daily-run';
const SECRET_HEADER = 'x-internal-trigger-secret';
// Mismos valores que `TEST_ENV` en `global-setup.ts`.
const TRIGGER_SECRET = 'test-internal-trigger-secret';
const MANAGEMENT_MAILBOX = 'gestion@test.vzcausas.local';
const START = civil('2026-10-06');

type Body = Record<string, any>;

/** Reloj que el spec mueve entre corridas. `now()` es las 12:30 de Córdoba del día fijado. */
let today = START;
const movableClock: ClockPort = {
  now: () => new Date(today.getTime() + 15.5 * 60 * 60 * 1000),
  today: () => today,
};
const setToday = (isoDate: string) => {
  today = civil(isoDate);
};

describe('HU51 — verificación diaria de los vencimientos de actos procesales', () => {
  let app: INestApplication;
  let emailSender: InMemoryEmailSender;
  let s: ProceduralActScenario;

  const server = () => request(app.getHttpServer());
  const detect = (): Promise<UpcomingDeadlineNotice[]> => app.get(DetectUpcomingDeadlinesUseCase).execute();
  const dailyRun = () => server().post(DAILY_RUN).set(SECRET_HEADER, TRIGGER_SECRET).send();

  /** Una causa penal del abogado responsable del escenario, en "Iniciada". */
  const newCase = (overrides: Record<string, unknown> = {}) =>
    createCase({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id, ...overrides });

  /**
   * Registra un acto por la API, como el abogado responsable (HU26), y devuelve
   * el id del acto que quedó vigente. Por defecto, el estado penal que abre 5
   * días hábiles, con fecha de acto el jueves 1/10.
   */
  const registerAct = async (caseId: number, body: Record<string, unknown>): Promise<number> => {
    const res = await server()
      .post(`/api/v1/cases/${caseId}/procedural-acts`)
      .set(s.responsible)
      .send({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-01', ...body });
    if (res.status !== 201) throw new Error(`acto: ${res.status} ${JSON.stringify(res.body)}`);
    const caseRow = await getPrisma().case.findUniqueOrThrow({ where: { id: caseId } });
    return caseRow.currentProceduralActId!;
  };

  /** Una causa penal con un acto vigente que vence en la fecha pedida (ajuste manual). */
  const caseDueOn = async (manualDueDate: string, overrides: Record<string, unknown> = {}) => {
    const caseRow = await newCase(overrides);
    const actId = await registerAct(caseRow.id, { manualDueDate });
    return { caseRow, actId };
  };

  const cleanUp = async () => {
    await getPrisma().sentNotification.deleteMany(); // hija de cases: primero (TV-02)
    await resetProceduralActData();
  };

  beforeAll(async () => {
    emailSender = new InMemoryEmailSender();
    app = await startTestApp((b) =>
      b.overrideProvider(CLOCK).useValue(movableClock).overrideProvider(EMAIL_SENDER).useValue(emailSender),
    );
  });

  afterAll(async () => {
    await cleanUp();
    await stopTestApp();
  });

  beforeEach(async () => {
    today = START;
    emailSender.reset();
    await getPrisma().sentNotification.deleteMany();
    s = await setUpProceduralActScenario();
  });

  // ── Qué detecta ──────────────────────────────────────────────────────

  describe('qué vencimientos detecta', () => {
    // CA-51.2, CA-51.3
    it('detecta el preaviso y el "vence hoy", y deja afuera el vencido y el lejano', async () => {
      const warning = await caseDueOn('2026-10-09', { caption: 'GÓMEZ, Ariel p.s.a. Robo calificado' });
      const dueToday = await caseDueOn('2026-10-06', { caption: 'BRAVO, Lucía p.s.a. Hurto' });
      await caseDueOn('2026-10-02'); // vencido: se detecta, pero no se avisa (D-64)
      await caseDueOn('2026-10-14'); // 6 días hábiles: fuera del preaviso
      // + la causa del escenario, en "Iniciada": sin acto, sin vencimiento.

      const notices = await detect();

      expect(notices).toEqual([
        {
          caseId: warning.caseRow.id,
          caption: 'GÓMEZ, Ariel p.s.a. Robo calificado',
          sacNumber: null,
          jurisdiction: 'CRIMINAL',
          responsibleLawyerId: s.lawyer.id,
          kind: 'DEADLINE_WARNING',
          origin: 'PROCEDURAL_ACT',
          dueDate: '2026-10-09',
          proceduralActId: warning.actId,
          businessDaysRemaining: 3,
        },
        {
          caseId: dueToday.caseRow.id,
          caption: 'BRAVO, Lucía p.s.a. Hurto',
          sacNumber: null,
          jurisdiction: 'CRIMINAL',
          responsibleLawyerId: s.lawyer.id,
          kind: 'DEADLINE_DUE_TODAY',
          origin: 'PROCEDURAL_ACT',
          dueDate: '2026-10-06',
          proceduralActId: dueToday.actId,
          businessDaysRemaining: 0,
        },
      ]);
    });

    // CA-51.4: el vencimiento calculado cuenta de lunes a viernes, y el ajuste manual manda.
    it('usa el vencimiento calculado en días hábiles y, si el abogado lo ajustó a mano, respeta el ajuste', async () => {
      // 5 días hábiles desde el jueves 1/10: vie 2, lun 5, mar 6, mié 7, jue 8.
      const computed = await newCase();
      await registerAct(computed.id, {});
      // El mismo plazo, corrido a mano al 20/10: queda fuera del preaviso.
      const postponed = await newCase();
      await registerAct(postponed.id, { manualDueDate: '2026-10-20' });
      // Y adelantado a mano a hoy: vence hoy, aunque el calculado sería el 8/10.
      const brought = await newCase();
      await registerAct(brought.id, { manualDueDate: '2026-10-06' });

      const notices = await detect();

      expect(notices.map((n) => [n.caseId, n.kind, n.dueDate])).toEqual([
        [computed.id, 'DEADLINE_WARNING', '2026-10-08'],
        [brought.id, 'DEADLINE_DUE_TODAY', '2026-10-06'],
      ]);
    });

    // CA-51.2: los plazos de presentación de todas las causas activas, no solo las penales.
    it('detecta también el vencimiento de una causa administrativa', async () => {
      const administrative = await newCase({ jurisdiction: 'ADMINISTRATIVE' });
      await registerAct(administrative.id, {
        proceduralStateId: s.states.administrative.stateId,
        notificationDate: '2026-10-01', // RN6: en el administrativo el plazo corre desde la notificación
        manualDueDate: '2026-10-07',
      });

      const [notice] = await detect();

      expect(notice).toMatchObject({
        caseId: administrative.id,
        jurisdiction: 'ADMINISTRATIVE',
        kind: 'DEADLINE_WARNING',
        dueDate: '2026-10-07',
      });
    });

    // Causa activa (§4): un estado escrito a mano no es terminal, y su plazo es el que se ajustó a mano (D-11).
    it('detecta el vencimiento ajustado a mano de un estado escrito a mano', async () => {
      const handWritten = await newCase();
      await registerAct(handWritten.id, {
        proceduralStateId: null,
        customState: 'Pedido de informes al Registro Nacional de Reincidencia',
        manualDueDate: '2026-10-07',
      });

      const [notice] = await detect();

      expect(notice).toMatchObject({ caseId: handWritten.id, kind: 'DEADLINE_WARNING', dueDate: '2026-10-07' });
    });

    // CA-51.6. Por la API no se llega a una causa terminal con un plazo abierto
    // (un acto hacia un terminal no abre plazo ni admite ajuste): se fuerza en la
    // base para probar que el filtro de causa activa no depende de eso.
    it('no revisa causas archivadas, prescriptas ni dadas de baja, aunque su último acto tenga un plazo abierto', async () => {
      const archived = await caseDueOn('2026-10-07');
      const prescribed = await caseDueOn('2026-10-07');
      const deactivated = await caseDueOn('2026-10-07');
      const prisma = getPrisma();
      await prisma.case.update({ where: { id: archived.caseRow.id }, data: { currentStateId: s.states.terminal.stateId } });
      await prisma.case.update({ where: { id: prescribed.caseRow.id }, data: { currentStateId: s.states.prescribed.stateId } });
      await prisma.case.update({ where: { id: deactivated.caseRow.id }, data: { active: false } });

      await expect(detect()).resolves.toEqual([]);
    });
  });

  // ── El acto lesivo del amparo (fase B, B6) ───────────────────────────

  // CA-51.2, CA-51.5, D-78
  describe('el plazo para presentar el amparo', () => {
    /**
     * Un amparo del responsable del escenario, en "Iniciada", con su acto
     * lesivo. Por defecto, del jueves 1/10 sin renovación y 5 días hábiles:
     * vence el jueves 8/10, a 2 días hábiles del martes 6.
     */
    const newAmparo = (harmfulAct: Record<string, unknown> = {}) =>
      newCase({
        jurisdiction: 'AMPARO',
        caption: 'MOYANO, Daniela c/ APROSS — Amparo de salud',
        harmfulAct: { date: '2026-10-01', termDays: 5, termDayType: 'BUSINESS', ...harmfulAct },
      });

    it('detecta el vencimiento del acto lesivo de un amparo en "Iniciada", sin acto procesal', async () => {
      const amparo = await newAmparo();

      const notices = await detect();

      expect(notices).toEqual([
        {
          caseId: amparo.id,
          caption: 'MOYANO, Daniela c/ APROSS — Amparo de salud',
          sacNumber: null,
          jurisdiction: 'AMPARO',
          responsibleLawyerId: s.lawyer.id,
          kind: 'DEADLINE_WARNING',
          origin: 'HARMFUL_ACT',
          dueDate: '2026-10-08',
          proceduralActId: null,
          businessDaysRemaining: 2,
        },
      ]);
    });

    // CA-51.9: la misma fecha y los mismos días que `harmfulActDeadline` del detalle.
    it('coincide con el harmfulActDeadline que muestra la causa', async () => {
      const amparo = await newAmparo();

      const [notice] = await detect();
      const caseBody = await expectData<Body>(await server().get(`/api/v1/cases/${amparo.id}`).set(s.responsible), 200);

      expect(caseBody.harmfulActDeadline).toMatchObject({ dueDate: notice.dueDate, businessDaysRemaining: 2 });
    });

    it('un amparo sin fecha del acto lesivo no tiene plazo que revisar', async () => {
      await newCase({ jurisdiction: 'AMPARO' });

      await expect(detect()).resolves.toEqual([]);
    });

    // CA-51.5 "solo mientras la causa está Iniciada": el primer acto dice que el amparo se presentó.
    it('con el primer acto procesal deja de revisar el acto lesivo y pasa al plazo del acto', async () => {
      const amparo = await newAmparo();
      const amparoState = await createProceduralState({
        jurisdiction: 'AMPARO',
        name: 'Informe del art. 8',
        timeLimitDays: 5,
        dayType: 'BUSINESS',
      });
      expect((await detect()).map((n) => n.origin)).toEqual(['HARMFUL_ACT']);

      const actId = await registerAct(amparo.id, { proceduralStateId: amparoState.stateId, manualDueDate: '2026-10-09' });

      const notices = await detect();
      expect(notices).toHaveLength(1);
      expect(notices[0]).toMatchObject({ origin: 'PROCEDURAL_ACT', proceduralActId: actId, dueDate: '2026-10-09' });
    });

    // CA-51.6
    it('no revisa un amparo dado de baja', async () => {
      const amparo = await newAmparo();
      await getPrisma().case.update({ where: { id: amparo.id }, data: { active: false } });

      await expect(detect()).resolves.toEqual([]);
    });

    // CA-51.5 "si el acto lesivo se renueva, toma la renovación vigente", y CA-30.8:
    // la renovación abre un vencimiento nuevo, que se avisa de nuevo.
    it('cuando el acto lesivo se renueva avisa el vencimiento nuevo, contado desde la renovación', async () => {
      // Acto del 8/9, se renueva cada 30 días, 3 días hábiles: el plazo del 8/9
      // venció el 11/9; la renovación del 8/10 abre uno que vence el 13/10.
      const amparo = await newAmparo({ date: '2026-09-08', renews: { everyDays: 30 }, termDays: 3 });

      await dailyRun(); // martes 6/10: rige el plazo del 8/9, vencido → nada
      expect(emailSender.sent).toHaveLength(0);

      setToday('2026-10-08'); // se renueva: faltan 3 días hábiles al 13/10
      const res = await dailyRun();

      expect(res.body.mailboxNoticeCount).toBe(1);
      const rows = await getPrisma().sentNotification.findMany({ where: { caseId: amparo.id, recipientLawyerId: null } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        kind: 'DEADLINE_WARNING',
        deadlineKind: 'HARMFUL_ACT',
        proceduralActId: null,
        referenceDate: civil('2026-10-13'),
      });
    });
  });

  // ── Coherencia con la causa y el tablero ─────────────────────────────

  // CA-51.9: lo que detecta coincide con lo que muestran la causa y los tableros.
  it('cada aviso coincide con el vencimiento de la causa y con los plazos del tablero del abogado', async () => {
    await caseDueOn('2026-10-09');
    await caseDueOn('2026-10-06');
    await caseDueOn('2026-10-02');
    await caseDueOn('2026-10-14');

    const notices = await detect();

    for (const notice of notices) {
      const caseBody = await expectData<Body>(await server().get(`/api/v1/cases/${notice.caseId}`).set(s.responsible), 200);
      expect(caseBody.currentState.dueDate).toBe(notice.dueDate);
      expect(caseBody.currentState.proceduralActId).toBe(notice.proceduralActId);
      const remaining = caseBody.currentState.businessDaysRemaining;
      expect(notice.kind).toBe(remaining === 0 ? 'DEADLINE_DUE_TODAY' : 'DEADLINE_WARNING');
    }

    // El tablero lista todos los plazos abiertos; los que están entre 0 y el
    // preaviso son exactamente los que detecta la verificación diaria.
    const { deadlines } = await expectData<Body>(await server().get('/api/v1/dashboards/lawyer').set(s.responsible), 200);
    const fromDashboard = deadlines
      .filter((d: Body) => d.businessDaysRemaining >= 0 && d.businessDaysRemaining <= 3)
      .map((d: Body) => [d.caseId, d.dueDate]);
    const fromDetection = notices.map((n) => [n.caseId, n.dueDate]);
    expect(fromDetection.sort()).toEqual(fromDashboard.sort());
    expect(fromDetection).toHaveLength(2);
  });

  // ── De punta a punta, con el aviso diario ────────────────────────────

  describe(`POST ${DAILY_RUN}`, () => {
    const lawyerEmail = async () => (await getPrisma().user.findUniqueOrThrow({ where: { id: s.user.id } })).email;
    const mailboxRows = (caseId: number) =>
      getPrisma().sentNotification.findMany({ where: { caseId, recipientLawyerId: null }, orderBy: { id: 'asc' } });

    // HU51 → HU30: lo detectado llega al correo y queda registrado con su origen y su acto.
    it('manda el preaviso a la casilla y al responsable, y registra cada envío con su acto procesal', async () => {
      const { caseRow, actId } = await caseDueOn('2026-10-09', { caption: 'GÓMEZ, Ariel p.s.a. Robo calificado' });

      const res = await dailyRun();

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        mailboxSent: true,
        mailboxNoticeCount: 1,
        lawyerSends: [{ lawyerId: s.lawyer.id, sent: true, noticeCount: 1 }],
      });
      expect(emailSender.sent.map((m) => m.to)).toEqual([[MANAGEMENT_MAILBOX], [await lawyerEmail()]]);
      expect(emailSender.sent[0].html).toContain('GÓMEZ, Ariel p.s.a. Robo calificado');

      const rows = await getPrisma().sentNotification.findMany({ where: { caseId: caseRow.id } });
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row).toMatchObject({
          kind: 'DEADLINE_WARNING',
          deadlineKind: 'PROCEDURAL_ACT',
          proceduralActId: actId,
          referenceDate: civil('2026-10-09'),
        });
      }
    });

    // CA-51.8, V-12: dos corridas el mismo día, y tres días seguidos dentro del
    // preaviso, mandan un solo preaviso; el día del vencimiento, un aviso aparte.
    it('avisa el preaviso una sola vez en toda la ventana y el día del vencimiento manda el "vence hoy"', async () => {
      const { caseRow } = await caseDueOn('2026-10-09'); // viernes

      await dailyRun(); // martes 6: faltan 3 → preaviso
      await dailyRun(); // martes 6 otra vez → nada
      setToday('2026-10-07');
      await dailyRun(); // miércoles: faltan 2 → nada
      setToday('2026-10-08');
      await dailyRun(); // jueves: falta 1 → nada
      expect((await mailboxRows(caseRow.id)).map((r) => r.kind)).toEqual(['DEADLINE_WARNING']);

      setToday('2026-10-09');
      emailSender.reset();
      const res = await dailyRun(); // viernes: vence hoy

      expect(res.body.mailboxNoticeCount).toBe(1);
      expect(emailSender.sent).toHaveLength(2);
      expect((await mailboxRows(caseRow.id)).map((r) => [r.kind, r.referenceDate])).toEqual([
        ['DEADLINE_WARNING', civil('2026-10-09')],
        ['DEADLINE_DUE_TODAY', civil('2026-10-09')],
      ]);

      // El lunes ya está vencido: no se avisa (D-64), aunque el plazo siga abierto.
      setToday('2026-10-12');
      emailSender.reset();
      await dailyRun();
      expect(emailSender.sent).toHaveLength(0);
    });

    // V-12: un plazo que se abre con menos días que el preaviso igual recibe su preaviso.
    it('un plazo que se abre con menos días que el preaviso igual recibe un preaviso', async () => {
      const { caseRow } = await caseDueOn('2026-10-08'); // faltan 2 desde el martes

      await dailyRun();

      expect((await mailboxRows(caseRow.id)).map((r) => r.kind)).toEqual(['DEADLINE_WARNING']);
    });

    // CA-51.7: la revisión no cambia nada de la causa ni del acto.
    it('no cambia la causa ni el acto procesal', async () => {
      const { caseRow, actId } = await caseDueOn('2026-10-06');
      const prisma = getPrisma();
      const caseBefore = await prisma.case.findUniqueOrThrow({ where: { id: caseRow.id } });
      const actBefore = await prisma.proceduralAct.findUniqueOrThrow({ where: { id: actId } });

      const res = await dailyRun();

      expect(res.body.mailboxNoticeCount).toBe(1);
      expect(await prisma.case.findUniqueOrThrow({ where: { id: caseRow.id } })).toEqual(caseBefore);
      expect(await prisma.proceduralAct.findUniqueOrThrow({ where: { id: actId } })).toEqual(actBefore);
    });
  });
});
