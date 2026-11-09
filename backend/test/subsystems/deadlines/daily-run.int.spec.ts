import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { startTestApp, stopTestApp, getPrisma } from '../../shared/harness/test-app';
import { expectError } from '../../shared/contract/envelopes';
import { createCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createUser } from '../../shared/factories/user.factory';
import { InMemoryEmailSender } from '../../shared/fakes/email-sender.fake';
import {
  FakeDeadlineDetection,
  FakePrescriptionDetection,
} from '../../shared/fakes/deadline-detection.fake';
import { DEV_TOOLS_ENABLED } from '../../../src/subsystems/deadlines/core/domain/ports/daily-digest-config.port';
import { EMAIL_SENDER } from '../../../src/subsystems/deadlines/core/domain/ports/email-sender.port';
import { DEADLINE_DETECTION } from '../../../src/subsystems/deadlines/core/domain/ports/deadline-detection.port';
import { PRESCRIPTION_DETECTION } from '../../../src/subsystems/deadlines/core/domain/ports/prescription-detection.port';
import { UpcomingDeadlineNotice } from '../../../src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice';
import { JurisdictionCode } from '../../../src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code';

/*
 * HU30/HU32 — POST /internal/deadlines/daily-run. No es un endpoint del
 * contrato público (confirmado contra `API_CONTRACT_V4.md:7515`): no lleva
 * prefijo `/cases`, `/users`, etc. de un recurso del dominio, y su respuesta
 * NO usa el sobre `{ data: ... }` — `daily-run.controller.ts` devuelve
 * `SendDailyNotificationDigestResult` tal cual.
 *
 * `EMAIL_SENDER` se reemplaza por `InMemoryEmailSender` (único adaptador
 * externo de este endpoint) y `DEADLINE_DETECTION`/`PRESCRIPTION_DETECTION`
 * por fakes controlables — son el seam temporal de TN-03, nunca
 * implementados de verdad (HU51/HU52 son de otro integrante). La base,
 * como el resto de la suite, es real: lo que se persiste en
 * `sent_notifications` se verifica contra PostgreSQL, no contra un fake.
 */
describe('POST /api/v1/internal/deadlines/daily-run', () => {
  const PATH = '/api/v1/internal/deadlines/daily-run';
  const SECRET_HEADER = 'x-internal-trigger-secret';
  // Mismo valor que `INTERNAL_TRIGGER_SECRET` en `global-setup.ts`.
  const TRIGGER_SECRET = 'test-internal-trigger-secret';
  const MANAGEMENT_MAILBOX = 'gestion@test.vzcausas.local'; // ídem, `MANAGEMENT_MAILBOX`

  let app: INestApplication;
  let emailSender: InMemoryEmailSender;
  let deadlineDetection: FakeDeadlineDetection;
  let prescriptionDetection: FakePrescriptionDetection;

  beforeAll(async () => {
    emailSender = new InMemoryEmailSender();
    deadlineDetection = new FakeDeadlineDetection();
    prescriptionDetection = new FakePrescriptionDetection();

    app = await startTestApp((b) =>
      b
        .overrideProvider(EMAIL_SENDER)
        .useValue(emailSender)
        .overrideProvider(DEADLINE_DETECTION)
        .useValue(deadlineDetection)
        .overrideProvider(PRESCRIPTION_DETECTION)
        .useValue(prescriptionDetection)
        // La suite corre con NODE_ENV=test; `?dev=true` solo anda en development.
        .overrideProvider(DEV_TOOLS_ENABLED)
        .useValue(true),
    );
  });

  afterAll(async () => {
    await getPrisma().sentNotification.deleteMany(); // hija de cases: no dejarle filas a otro spec
    await stopTestApp();
  });

  beforeEach(async () => {
    emailSender.reset();
    deadlineDetection.notices = [];
    prescriptionDetection.notices = [];

    const prisma = getPrisma();
    await prisma.sentNotification.deleteMany();
    await prisma.case.deleteMany();
    await prisma.user.deleteMany(); // referencia a lawyers
    await prisma.lawyer.deleteMany();
    await prisma.client.deleteMany();
  });

  /** `secret: null` omite el header por completo — distinto de "no pasar nada", que usaría el default. */
  function run(secret: string | null = TRIGGER_SECRET) {
    const req = request(app.getHttpServer()).post(PATH);
    if (secret !== null) req.set(SECRET_HEADER, secret);
    return req.send();
  }

  function aDeadlineNotice(
    overrides: Partial<UpcomingDeadlineNotice> & Pick<UpcomingDeadlineNotice, 'caseId' | 'responsibleLawyerId'>,
  ): UpcomingDeadlineNotice {
    return {
      caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
      sacNumber: null,
      jurisdiction: JurisdictionCode.CRIMINAL,
      kind: 'DEADLINE_WARNING',
      origin: 'PROCEDURAL_ACT',
      dueDate: '2026-10-21',
      proceduralActId: null,
      businessDaysRemaining: 3,
      ...overrides,
    };
  }

  async function aCaseWithLawyer(createdByUserId: number) {
    const client = await createClient();
    const lawyer = await createLawyer();
    const createdCase = await createCase({
      clientId: client.id,
      responsibleLawyerId: lawyer.id,
      createdByUserId,
    });
    return { client, lawyer, case: createdCase };
  }

  // ── Guard: secreto interno ──────────────────────────────────────────

  it('rechaza sin el header del secreto interno', async () => {
    const res = await run(null);
    expectError(res, 401, 'UNAUTHENTICATED');
  });

  it('rechaza con un secreto incorrecto', async () => {
    const res = await run('secreto-equivocado');
    expectError(res, 401, 'UNAUTHENTICATED');
  });

  // ── Sin avisos ───────────────────────────────────────────────────────

  it('sin avisos pendientes no manda nada y no registra nada (CA-30.6)', async () => {
    const res = await run();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mailboxSent: false, mailboxNoticeCount: 0, lawyerSends: [] });
    expect(emailSender.sent).toHaveLength(0);
    expect(await getPrisma().sentNotification.count()).toBe(0);
  });

  // ── Con avisos ───────────────────────────────────────────────────────

  describe('con un aviso pendiente', () => {
    it('manda a la casilla con todo y copia al abogado responsable con solo sus causas (CA-30.4, CA-30.5, N-07)', async () => {
      const admin = await createUser({ roles: ['ADMINISTRATOR'] });
      const { lawyer, case: createdCase } = await aCaseWithLawyer(admin.id);
      await createUser({ lawyerId: lawyer.id, email: 'responsable@test.local', roles: ['LAWYER'] });

      deadlineDetection.notices = [
        aDeadlineNotice({ caseId: createdCase.id, responsibleLawyerId: lawyer.id }),
      ];

      const res = await run();

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        mailboxSent: true,
        mailboxNoticeCount: 1,
        lawyerSends: [{ lawyerId: lawyer.id, sent: true, noticeCount: 1 }],
      });

      expect(emailSender.sent).toHaveLength(2);
      expect(emailSender.sent[0].to).toEqual([MANAGEMENT_MAILBOX]);
      expect(emailSender.sent[1].to).toEqual(['responsable@test.local']);

      const rows = await getPrisma().sentNotification.findMany({ where: { caseId: createdCase.id } });
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.recipientLawyerId).sort()).toEqual([null, lawyer.id].sort());
    });

    it('un abogado sin usuario vinculado no recibe copia, sin error (CA-30.5)', async () => {
      const admin = await createUser({ roles: ['ADMINISTRATOR'] });
      const { lawyer, case: createdCase } = await aCaseWithLawyer(admin.id); // lawyer sin usuario vinculado

      deadlineDetection.notices = [
        aDeadlineNotice({ caseId: createdCase.id, responsibleLawyerId: lawyer.id }),
      ];

      const res = await run();

      expect(res.body.mailboxSent).toBe(true);
      expect(res.body.lawyerSends).toEqual([{ lawyerId: lawyer.id, sent: false, noticeCount: 0 }]);
      expect(emailSender.sent).toHaveLength(1); // solo la casilla

      const rows = await getPrisma().sentNotification.findMany({ where: { caseId: createdCase.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].recipientLawyerId).toBeNull();
    });

    it('no reenvía lo ya avisado en una invocación posterior el mismo día (CA-30.7, N-04)', async () => {
      const admin = await createUser({ roles: ['ADMINISTRATOR'] });
      const { lawyer, case: createdCase } = await aCaseWithLawyer(admin.id);
      await createUser({ lawyerId: lawyer.id, email: 'responsable@test.local', roles: ['LAWYER'] });
      deadlineDetection.notices = [
        aDeadlineNotice({ caseId: createdCase.id, responsibleLawyerId: lawyer.id }),
      ];

      await run(); // primera corrida del día
      emailSender.reset();

      // Mismos notices: simula la invocación de reintento que GitHub Actions
      // dispara de nuevo horas después (N-04), sin que nada haya cambiado.
      const res = await run();

      expect(res.body).toEqual({ mailboxSent: false, mailboxNoticeCount: 0, lawyerSends: [{ lawyerId: lawyer.id, sent: false, noticeCount: 0 }] });
      expect(emailSender.sent).toHaveLength(0);
      expect(await getPrisma().sentNotification.count()).toBe(2); // sigue habiendo exactamente las 2 de la primera corrida
    });

    it('si falla el envío a un abogado, la casilla y los demás no se ven afectados y queda sin registrar para reintentar (N-07)', async () => {
      const admin = await createUser({ roles: ['ADMINISTRATOR'] });
      const { lawyer, case: createdCase } = await aCaseWithLawyer(admin.id);
      await createUser({ lawyerId: lawyer.id, email: 'falla@test.local', roles: ['LAWYER'] });
      deadlineDetection.notices = [
        aDeadlineNotice({ caseId: createdCase.id, responsibleLawyerId: lawyer.id }),
      ];
      emailSender.failFor.add('falla@test.local');

      const res = await run();

      expect(res.body.mailboxSent).toBe(true); // la casilla no se ve afectada por la falla del abogado
      expect(res.body.lawyerSends).toEqual([{ lawyerId: lawyer.id, sent: false, noticeCount: 0 }]);

      const rows = await getPrisma().sentNotification.findMany({ where: { caseId: createdCase.id } });
      expect(rows).toHaveLength(1); // solo la casilla; el abogado queda pendiente para el próximo reintento
      expect(rows[0].recipientLawyerId).toBeNull();
    });
  });

  // ── Atajo de desarrollo: ?dev=true (la campanita del frontend) ───────

  describe('con ?dev=true', () => {
    /** `DEV_TOOLS_ENABLED` vale `true` en esta app (ver `beforeAll`); fuera de desarrollo lo rechaza el controller. */
    const runDev = (dev: string) =>
      request(app.getHttpServer()).post(PATH).query({ dev }).set(SECRET_HEADER, TRIGGER_SECRET).send();

    it('permite repetir la corrida: borra el historial y manda de nuevo lo que ya se había avisado', async () => {
      const admin = await createUser({ roles: ['ADMINISTRATOR'] });
      const { lawyer, case: createdCase } = await aCaseWithLawyer(admin.id);
      deadlineDetection.notices = [
        aDeadlineNotice({ caseId: createdCase.id, responsibleLawyerId: lawyer.id }),
      ];

      const first = await runDev('true');
      const second = await runDev('true');

      expect(first.body.mailboxSent).toBe(true);
      expect(second.body.mailboxSent).toBe(true); // sin dev, la segunda no reenvía (CA-30.7)
      expect(emailSender.sent).toHaveLength(2);
      // Quedó registrado de nuevo: el historial se vacía antes de enviar, no después.
      expect(await getPrisma().sentNotification.count({ where: { caseId: createdCase.id } })).toBe(1);
    });

    it('con dev=false se comporta como siempre y no toca el historial', async () => {
      const admin = await createUser({ roles: ['ADMINISTRATOR'] });
      const { lawyer, case: createdCase } = await aCaseWithLawyer(admin.id);
      deadlineDetection.notices = [
        aDeadlineNotice({ caseId: createdCase.id, responsibleLawyerId: lawyer.id }),
      ];

      await runDev('false');
      const second = await runDev('false');

      expect(second.body.mailboxSent).toBe(false);
      expect(emailSender.sent).toHaveLength(1);
    });

    it('un valor que no es true ni false es 400 sobre dev y no borra nada', async () => {
      const admin = await createUser({ roles: ['ADMINISTRATOR'] });
      const { lawyer, case: createdCase } = await aCaseWithLawyer(admin.id);
      deadlineDetection.notices = [
        aDeadlineNotice({ caseId: createdCase.id, responsibleLawyerId: lawyer.id }),
      ];
      await run();

      const res = await runDev('quizás');

      expectError(res, 400, 'VALIDATION_ERROR', ['dev']);
      expect(await getPrisma().sentNotification.count({ where: { caseId: createdCase.id } })).toBe(1);
    });
  });
});
