import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { civil, withFixedClock } from '../../shared/harness/fixed-clock';
import { expectData } from '../../shared/contract/envelopes';
import { createCase } from '../../shared/factories/case.factory';
import { createInitialState } from '../../shared/factories/procedural-state.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';
import { InMemoryEmailSender } from '../../shared/fakes/email-sender.fake';
import { EMAIL_SENDER } from '../../../src/subsystems/deadlines/core/domain/ports/email-sender.port';
import { DetectUpcomingPrescriptionsUseCase } from '../../../src/subsystems/deadlines/core/application/use-cases/detect-upcoming-prescriptions.use-case';
import { PrescriptionNotice } from '../../../src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice';

/*
 * HU52 — Verificar plazo de prescripción (IMPLEMENTACION_DETECCION.md, paso 8).
 *
 * Es el primer spec que ejercita la detección REAL: a diferencia de
 * `daily-run.int.spec.ts`, acá no se reemplaza `PRESCRIPTION_DETECTION` por un
 * fake. El recorrido completo es el de producción: caso de uso de `deadlines` →
 * adaptador ACL de `cases` → `ListActivePrescriptions` → consulta Prisma →
 * PostgreSQL. Solo se reemplazan el reloj (fijo) y el correo (en memoria).
 *
 * "Hoy" es el martes 6/10/2026 (`fixed-clock.ts`). Las fechas del hecho y los
 * meses de cada calificación se eligen para que el porcentaje caiga donde el
 * test lo necesita:
 *
 *   hecho 6/10/2018 + 120 meses → vence 6/10/2028 → 80 %   (en alerta)
 *   hecho 6/10/2018 + 240 meses → vence 6/10/2038 → 40 %   (no)
 *   hecho 6/10/2016 + 120 meses → vence 6/10/2026 → HOY    (cumplida)
 *
 * Limpieza (TV-02): este spec escribe en `sent_notifications`, así que la
 * borra antes que las causas en cada `beforeEach` y también al terminar, para
 * no dejarle filas a otro spec.
 */
const DAILY_RUN = '/api/v1/internal/deadlines/daily-run';
const SECRET_HEADER = 'x-internal-trigger-secret';
// Mismos valores que `TEST_ENV` en `global-setup.ts`.
const TRIGGER_SECRET = 'test-internal-trigger-secret';
const MANAGEMENT_MAILBOX = 'gestion@test.vzcausas.local';
const QUALIFICATION_PREFIX = 'HU52 calificación';

type Body = Record<string, any>;

describe('HU52 — verificación diaria de la prescripción', () => {
  let app: INestApplication;
  let emailSender: InMemoryEmailSender;
  let s: ProceduralActScenario;

  const server = () => request(app.getHttpServer());
  const detect = (): Promise<PrescriptionNotice[]> => app.get(DetectUpcomingPrescriptionsUseCase).execute();
  const dailyRun = () => server().post(DAILY_RUN).set(SECRET_HEADER, TRIGGER_SECRET).send();

  /** Nombres propios: el contador del factory se reinicia en cada archivo y chocaría con otros specs. */
  let qualificationSequence = 0;
  const qualification = (prescriptionMonths: number, overrides: { active?: boolean } = {}) =>
    createLegalQualification({
      name: `${QUALIFICATION_PREFIX} ${++qualificationSequence}`,
      prescriptionMonths,
      ...overrides,
    });

  /** Una causa del abogado responsable del escenario. Por defecto, penal en "Iniciada". */
  const newCase = (overrides: Record<string, unknown> = {}) =>
    createCase({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id, ...overrides });

  /**
   * Le carga a la causa un hecho con esa calificación. `prescriptionDate` es la
   * columna denormalizada que guarda el alta; la detección no la lee (calcula
   * en cada corrida, D-08), así que acá solo tiene que ser coherente.
   */
  const withOffense = (caseId: number, legalQualificationId: number, offenseDate = '2018-10-06') =>
    getPrisma().offense.create({
      data: {
        caseId,
        legalQualificationId,
        offenseDate: civil(offenseDate),
        prescriptionDate: civil('2028-10-06'),
      },
    });

  /** Registra un acto interruptivo por la API, como lo haría el abogado responsable (HU31). */
  const interruptiveAct = async (caseId: number, actDate: string) => {
    const res = await server()
      .post(`/api/v1/cases/${caseId}/interruptive-acts`)
      .set(s.responsible)
      .send({ name: 'Indagatoria', actDate });
    if (res.status !== 201) throw new Error(`acto interruptivo: ${res.status} ${JSON.stringify(res.body)}`);
  };

  /**
   * Un amparo persistido directo: `createCase` solo arma causas penales y
   * administrativas, y la API de alta no acepta calificaciones fuera del fuero
   * penal. Sirve para probar que el filtro de fuero no depende de eso.
   */
  const newAmparo = async () => {
    const initial = await createInitialState('AMPARO');
    return getPrisma().case.create({
      data: {
        caption: 'PÉREZ, Juan c/ APROSS s/ Amparo',
        jurisdictionId: initial.jurisdictionId,
        proceduralRole: 'ACTORA',
        subjectMatter: 'Cobertura de un tratamiento.',
        clientId: s.client.id,
        responsibleLawyerId: s.lawyer.id,
        currentStateId: initial.stateId,
        createdByUserId: s.user.id,
      },
    });
  };

  const cleanUp = async () => {
    await getPrisma().sentNotification.deleteMany(); // hija de cases: primero (TV-02)
    await resetProceduralActData();
    await getPrisma().legalQualification.deleteMany({ where: { name: { startsWith: QUALIFICATION_PREFIX } } });
  };

  beforeAll(async () => {
    emailSender = new InMemoryEmailSender();
    app = await startTestApp((b) => withFixedClock(b).overrideProvider(EMAIL_SENDER).useValue(emailSender));
  });

  afterAll(async () => {
    await cleanUp();
    await stopTestApp();
  });

  beforeEach(async () => {
    emailSender.reset();
    await getPrisma().sentNotification.deleteMany();
    s = await setUpProceduralActScenario();
  });

  // ── Qué detecta ──────────────────────────────────────────────────────

  describe('qué causas detecta', () => {
    // CA-52.1, CA-52.2
    it('detecta las penales activas al 70 % o más y las de plazo cumplido, y nada más', async () => {
      const tenYears = await qualification(120);
      const twentyYears = await qualification(240);
      const inAlert = await newCase({ caption: 'ACOSTA, Jonathan p.s.a. Infracción Ley 23.737' });
      const met = await newCase({ caption: 'BRAVO, Lucía p.s.a. Hurto' });
      const below = await newCase();
      await withOffense(inAlert.id, tenYears.id);
      await withOffense(met.id, tenYears.id, '2016-10-06');
      await withOffense(below.id, twentyYears.id);
      // + la causa del escenario, penal y sin calificaciones (D-74).

      const notices = await detect();

      expect(notices).toEqual([
        {
          caseId: inAlert.id,
          caption: 'ACOSTA, Jonathan p.s.a. Infracción Ley 23.737',
          sacNumber: null,
          responsibleLawyerId: s.lawyer.id,
          kind: 'PRESCRIPTION_ALERT',
          referenceDate: '2028-10-06',
          legalQualificationName: tenYears.name,
          daysRemaining: 731,
        },
        {
          caseId: met.id,
          caption: 'BRAVO, Lucía p.s.a. Hurto',
          sacNumber: null,
          responsibleLawyerId: s.lawyer.id,
          // V-02: vence hoy, y por eso solo "cumplida", nunca también la alerta.
          kind: 'PRESCRIPTION_EXPIRED',
          referenceDate: '2026-10-06',
          legalQualificationName: tenYears.name,
          daysRemaining: 0,
        },
      ]);
    });

    // CA-52.4. Por la API no se les puede cargar un hecho: se carga directo
    // para probar que el filtro de fuero no depende de eso.
    it('no revisa causas administrativas ni amparos, aunque tengan un hecho cargado', async () => {
      const tenYears = await qualification(120);
      const administrative = await newCase({ jurisdiction: 'ADMINISTRATIVE' });
      const amparo = await newAmparo();
      await withOffense(administrative.id, tenYears.id);
      await withOffense(amparo.id, tenYears.id);

      await expect(detect()).resolves.toEqual([]);
    });

    // CA-52.4
    it('no revisa causas archivadas, prescriptas ni dadas de baja', async () => {
      const tenYears = await qualification(120);
      const archived = await newCase({ currentStateId: s.states.terminal.stateId });
      const prescribed = await newCase({ currentStateId: s.states.prescribed.stateId });
      const deactivated = await newCase();
      await getPrisma().case.update({ where: { id: deactivated.id }, data: { active: false } });
      for (const caseRow of [archived, prescribed, deactivated]) {
        await withOffense(caseRow.id, tenYears.id);
      }

      await expect(detect()).resolves.toEqual([]);
    });

    // Causa activa (§4): un estado escrito a mano no es terminal. RN12: una
    // calificación dada de baja sigue rigiendo las causas que la registran.
    it('sí revisa una causa en un estado escrito a mano y una con la calificación dada de baja', async () => {
      const handWritten = await newCase({ currentCustomState: 'Con acusación, pero con oposición' });
      const withDeactivatedQualification = await newCase();
      await withOffense(handWritten.id, (await qualification(120)).id);
      await withOffense(withDeactivatedQualification.id, (await qualification(120, { active: false })).id);

      const notices = await detect();

      expect(notices.map((n) => n.caseId)).toEqual([handWritten.id, withDeactivatedQualification.id]);
    });

    // CA-52.3
    it('usa la calificación que prescribe primero', async () => {
      const tenYears = await qualification(120);
      const twentyYears = await qualification(240);
      const caseRow = await newCase();
      await withOffense(caseRow.id, twentyYears.id);
      await withOffense(caseRow.id, tenYears.id);

      const [notice] = await detect();

      expect(notice).toMatchObject({ legalQualificationName: tenYears.name, referenceDate: '2028-10-06' });
    });

    // CA-52.6, CA-52.8: nada se guarda calculado; el acto se ve en la corrida siguiente.
    it('un acto interruptivo registrado por la API reinicia el cómputo y la saca de alerta', async () => {
      await withOffense(s.caseRow.id, (await qualification(120)).id);
      expect(await detect()).toHaveLength(1);

      await interruptiveAct(s.caseRow.id, '2026-09-06');

      await expect(detect()).resolves.toEqual([]);
    });
  });

  // ── Coherencia con el tablero ────────────────────────────────────────

  // D-72: el tablero, el detalle y el correo dicen lo mismo. Es el equivalente
  // de CA-51.9 para la prescripción.
  it('detecta exactamente las mismas causas, calificación y vencimiento que muestra el tablero del abogado', async () => {
    const tenYears = await qualification(120);
    const twentyYears = await qualification(240);
    const inAlert = await newCase();
    const met = await newCase();
    const below = await newCase();
    await withOffense(inAlert.id, tenYears.id);
    await withOffense(met.id, tenYears.id, '2016-10-06');
    await withOffense(below.id, twentyYears.id);

    const notices = await detect();
    const { prescriptionAlerts } = await expectData<Body>(
      await server().get('/api/v1/dashboards/lawyer').set(s.responsible),
      200,
    );

    const fromDetection = notices.map((n) => [n.caseId, n.legalQualificationName, n.referenceDate]);
    const fromDashboard = prescriptionAlerts.map((a: Body) => [a.caseId, a.legalQualificationName, a.expiresOn]);
    expect(fromDetection.sort()).toEqual(fromDashboard.sort());
    expect(fromDetection).toHaveLength(2);
  });

  // ── De punta a punta, con el aviso diario ────────────────────────────

  describe(`POST ${DAILY_RUN}`, () => {
    /** El usuario del abogado responsable recibe la copia; hoy es su email. */
    const lawyerEmail = async () =>
      (await getPrisma().user.findUniqueOrThrow({ where: { id: s.user.id } })).email;

    // CA-52.2 + HU32: lo detectado llega al correo y queda registrado.
    it('manda la alerta a la casilla y al responsable, y registra cada envío en sent_notifications', async () => {
      const caseRow = await newCase({ caption: 'ACOSTA, Jonathan p.s.a. Infracción Ley 23.737' });
      await withOffense(caseRow.id, (await qualification(120)).id);

      const res = await dailyRun();

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        mailboxSent: true,
        mailboxNoticeCount: 1,
        lawyerSends: [{ lawyerId: s.lawyer.id, sent: true, noticeCount: 1 }],
      });
      expect(emailSender.sent.map((m) => m.to)).toEqual([[MANAGEMENT_MAILBOX], [await lawyerEmail()]]);
      expect(emailSender.sent[0].html).toContain('ACOSTA, Jonathan p.s.a. Infracción Ley 23.737');

      const rows = await getPrisma().sentNotification.findMany({ where: { caseId: caseRow.id } });
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row).toMatchObject({
          kind: 'PRESCRIPTION_ALERT',
          deadlineKind: null,
          proceduralActId: null,
          referenceDate: civil('2028-10-06'),
        });
      }
      expect(rows.map((r) => r.recipientLawyerId).sort()).toEqual([null, s.lawyer.id].sort());
    });

    // CA-52.7, y CA-51.8 en su versión de prescripción: dos corridas el mismo día.
    it('una segunda corrida el mismo día la detecta de nuevo pero no la vuelve a avisar', async () => {
      const caseRow = await newCase();
      await withOffense(caseRow.id, (await qualification(120)).id);

      await dailyRun();
      emailSender.reset();
      const res = await dailyRun();

      expect(await detect()).toHaveLength(1); // sigue en alerta
      expect(res.body).toEqual({
        mailboxSent: false,
        mailboxNoticeCount: 0,
        lawyerSends: [{ lawyerId: s.lawyer.id, sent: false, noticeCount: 0 }],
      });
      expect(emailSender.sent).toHaveLength(0);
      expect(await getPrisma().sentNotification.count({ where: { caseId: caseRow.id } })).toBe(2);
    });

    // CA-52.6: el acto interruptivo cambia `expiresOn`, que es parte de la clave
    // de `sent_notifications`, y por eso se vuelve a avisar.
    it('después de un acto interruptivo que reinicia el plazo, vuelve a avisar con la fecha nueva', async () => {
      // Hecho del 1/1/2000 + 120 meses: prescripta desde el 1/1/2010.
      await withOffense(s.caseRow.id, (await qualification(120)).id, '2000-01-01');
      await dailyRun();

      // El acto del 6/10/2018 reinicia el cómputo: vence el 6/10/2028, al 80 %.
      await interruptiveAct(s.caseRow.id, '2018-10-06');
      emailSender.reset();
      const res = await dailyRun();

      expect(res.body.mailboxNoticeCount).toBe(1);
      const mailboxRows = await getPrisma().sentNotification.findMany({
        where: { caseId: s.caseRow.id, recipientLawyerId: null },
        orderBy: { id: 'asc' },
      });
      expect(mailboxRows.map((r) => [r.kind, r.referenceDate])).toEqual([
        ['PRESCRIPTION_EXPIRED', civil('2010-01-01')],
        ['PRESCRIPTION_ALERT', civil('2028-10-06')],
      ]);
    });

    // CA-52.5: la verificación no cambia nada de la causa ni la marca como prescripta.
    it('no cambia el estado de la causa ni la marca como prescripta, aunque el plazo esté cumplido', async () => {
      await withOffense(s.caseRow.id, (await qualification(120)).id, '2016-10-06');
      const before = await getPrisma().case.findUniqueOrThrow({ where: { id: s.caseRow.id } });

      const res = await dailyRun();

      expect(res.body.mailboxNoticeCount).toBe(1);
      const after = await getPrisma().case.findUniqueOrThrow({ where: { id: s.caseRow.id } });
      expect(after).toEqual(before);
      expect(after.prescriptionDate).toBeNull();
      expect(after.currentStateId).toBe(s.states.initial.stateId);
    });
  });
});
