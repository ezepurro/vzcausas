import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { loginAs } from '../../shared/auth/login-as';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';
import { createInitialState } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { civil, withFixedClock } from '../../shared/harness/fixed-clock';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

/*
 * HU33 Registrar prescripción — `POST /api/v1/cases/{caseId}/prescription`.
 *
 * Escrito desde `.claude/plans/tests-hu33-registrar-prescripcion.md` y el
 * contrato (`API_CONTRACT_V4.md:4358-4616`), no desde la implementación: cada
 * expectativa es lo que el contrato promete. Reloj fijo: hoy es el 06/10/2026,
 * ahora es 12:30 en Córdoba.
 */

/** Las 30 claves del recurso causa (V4 §3.7). */
const CASE_KEYS = [
  'active',
  'administrativeRemedyExhaustedOn',
  'caption',
  'client',
  'clientDetained',
  'counterparty',
  'court',
  'courtFeePaid',
  'currentState',
  'folder',
  'harmfulActDate',
  'harmfulActDeadline',
  'harmfulActRenewalDays',
  'harmfulActRenews',
  'harmfulActTermDayType',
  'harmfulActTermDays',
  'id',
  'injunctionGranted',
  'instructorExtension',
  'instructorName',
  'jurisdiction',
  'legalQualifications',
  'prescription',
  'prescriptionDeclaration',
  'proceduralRole',
  'responsibleLawyer',
  'sacNumber',
  'startDate',
  'subjectMatter',
  'tribunalPhone',
].sort();

const VALID_BODY = {
  prescriptionDate: '2026-09-15',
  resolution: 'Sentencia N° 214 del Juzgado de Control N° 3',
  grounds: 'Transcurrió el plazo del art. 62 inc. 2 CP sin actos interruptivos.',
};

/** El instante del reloj fijo, como lo muestra el contrato (`registeredAt`). */
const REGISTERED_AT = '2026-10-06T12:30:00-03:00';

const MESSAGES = {
  forbidden: 'Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.',
  notResponsible: 'Solo el abogado responsable de la causa puede marcarla como prescripta.',
  notFound: 'No se encontró la causa solicitada.',
  notCriminal: 'La prescripción solo aplica a las causas del fuero penal.',
  withoutQualifications: 'La causa no tiene calificaciones legales: no puede prescribir.',
  terminal: 'La causa se encuentra en un estado terminal y no admite esta operación.',
};

let qualificationSeq = 0;

describe('POST /api/v1/cases/:caseId/prescription', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;
  let administrator: { Authorization: string };
  let administratorUser: { id: number; lastName: string; firstName: string };
  let secretary: { Authorization: string };

  const server = () => request(app.getHttpServer());
  const mark = (caseId: number, actor: { Authorization: string } | null, body: object = VALID_BODY) => {
    const req = server().post(`/api/v1/cases/${caseId}/prescription`);
    return (actor ? req.set(actor) : req).send(body);
  };
  const detail = async (caseId: number) =>
    expectData<Record<string, any>>(await server().get(`/api/v1/cases/${caseId}`).set(s.notResponsible), 200);
  const row = (caseId: number) => getPrisma().case.findUniqueOrThrow({ where: { id: caseId } });

  /** Una calificación de 96 meses con hecho del 27/02/2021: vence el 27/02/2029, al 70 % hoy. */
  async function addRobbery(caseId: number) {
    qualificationSeq += 1;
    const qualification = await createLegalQualification({
      prescriptionMonths: 96,
      name: `HU33 calificación ${qualificationSeq} — art. 167 CP`,
    });
    await getPrisma().offense.create({
      data: {
        caseId,
        legalQualificationId: qualification.id,
        offenseDate: civil('2021-02-27'),
        prescriptionDate: civil('2029-02-27'),
      },
    });
    return qualification;
  }

  /** El estado de la causa y la declaración en la base: lo que una marca rechazada no puede tocar. */
  async function persisted(caseId: number) {
    const kase = await row(caseId);
    return {
      currentStateId: kase.currentStateId,
      currentProceduralActId: kase.currentProceduralActId,
      prescriptionDate: kase.prescriptionDate,
      prescriptionResolution: kase.prescriptionResolution,
    };
  }

  const deleteOwnQualifications = () =>
    getPrisma().legalQualification.deleteMany({ where: { name: { startsWith: 'HU33 calificación' } } });

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
  });

  afterAll(async () => {
    await resetProceduralActData();
    await deleteOwnQualifications();
    await stopTestApp();
  });

  beforeEach(async () => {
    s = await setUpProceduralActScenario();
    await deleteOwnQualifications();
    const admin = await createUser({ roles: ['ADMINISTRATOR'] });
    administratorUser = admin;
    administrator = loginAs({ userId: admin.id, roles: ['ADMINISTRATOR'] });
    const secretaryUser = await createUser({ roles: ['SECRETARY'] });
    secretary = loginAs({ userId: secretaryUser.id, roles: ['SECRETARY'] });
  });

  // ── D1: marca exitosa ────────────────────────────────────────────────

  describe('marca exitosa', () => {
    // CA-33.1, CA-33.4, CA-33.5
    it('un administrador que no es el responsable la marca: 200 con la causa entera y la constancia en la base', async () => {
      const robo = await addRobbery(s.caseRow.id);

      const data = expectData<Record<string, any>>(await mark(s.caseRow.id, administrator), 200);

      expect(Object.keys(data).sort()).toEqual(CASE_KEYS);
      expect(data.id).toBe(s.caseRow.id);
      expect(data.active).toBe(true);
      expect(data.currentState).toEqual({
        proceduralStateId: s.states.prescribed.stateId,
        name: 'Prescripta',
        custom: false,
        initial: false,
        proceduralActId: null,
        dueDate: null,
        businessDaysRemaining: null,
        manuallyAdjusted: false,
      });
      expect(data.prescriptionDeclaration).toEqual({
        prescriptionDate: '2026-09-15',
        resolution: VALID_BODY.resolution,
        grounds: VALID_BODY.grounds,
        registeredBy: {
          id: administratorUser.id,
          lastName: administratorUser.lastName,
          firstName: administratorUser.firstName,
        },
        registeredAt: REGISTERED_AT,
      });
      // `prescription` se sigue devolviendo, como dato histórico (V4 §3.7).
      expect(data.prescription).toMatchObject({ legalQualificationId: robo.id, expiresOn: '2029-02-27' });

      expect(await row(s.caseRow.id)).toMatchObject({
        currentStateId: s.states.prescribed.stateId,
        currentCustomState: null,
        currentProceduralActId: null,
        prescriptionDate: civil('2026-09-15'),
        prescriptionResolution: VALID_BODY.resolution,
        prescriptionGrounds: VALID_BODY.grounds,
        prescriptionRegisteredByUserId: administratorUser.id,
        prescriptionRegisteredAt: new Date('2026-10-06T15:30:00.000Z'),
        active: true,
      });
    });

    // CA-33.1, CA-33.3, CA-33.10
    it('el abogado responsable la marca sin fundamento, aunque el plazo no esté cumplido', async () => {
      await addRobbery(s.caseRow.id);
      expect((await detail(s.caseRow.id)).prescription).toMatchObject({ expired: false });

      const { grounds: _omitted, ...withoutGrounds } = VALID_BODY;
      const data = expectData<Record<string, any>>(await mark(s.caseRow.id, s.responsible, withoutGrounds), 200);

      expect(data.prescriptionDeclaration).toMatchObject({ grounds: null });
      expect((await row(s.caseRow.id)).prescriptionGrounds).toBeNull();
    });

    // CA-33.4
    it('se cierran los plazos abiertos de la causa; el acto que los abrió queda en la historia', async () => {
      await addRobbery(s.caseRow.id);
      await server()
        .post(`/api/v1/cases/${s.caseRow.id}/procedural-acts`)
        .set(s.responsible)
        .send({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-01' })
        .expect(201);
      expect((await detail(s.caseRow.id)).currentState.dueDate).not.toBeNull();

      const data = expectData<Record<string, any>>(await mark(s.caseRow.id, s.responsible), 200);

      expect(data.currentState).toMatchObject({ proceduralActId: null, dueDate: null, businessDaysRemaining: null });
      expect(await getPrisma().proceduralAct.count({ where: { caseId: s.caseRow.id } })).toBe(1);
    });
  });

  // ── D2: quién puede y qué datos ──────────────────────────────────────

  describe('quién puede y qué datos', () => {
    // CA-33.2. El 401 sin token está en `test/smoke/app.int.spec.ts`.
    it('la secretaría no puede marcarla y no se escribe nada', async () => {
      await addRobbery(s.caseRow.id);
      const before = await persisted(s.caseRow.id);

      const res = await mark(s.caseRow.id, secretary);

      expectError(res, 403, 'FORBIDDEN');
      expect(res.body.error.message).toBe(MESSAGES.forbidden);
      expect(await persisted(s.caseRow.id)).toEqual(before);
    });

    // D-110
    it('un abogado que no es el responsable no puede marcarla y no se escribe nada', async () => {
      await addRobbery(s.caseRow.id);
      const before = await persisted(s.caseRow.id);

      const res = await mark(s.caseRow.id, s.notResponsible);

      expectError(res, 403, 'FORBIDDEN');
      expect(res.body.error.message).toBe(MESSAGES.notResponsible);
      expect(res.body.error.details).toBeNull();
      expect(await persisted(s.caseRow.id)).toEqual(before);
    });

    // D-110: primero 404, después 403
    it('una causa inexistente es 404 aunque pida la secretaría o un abogado ajeno', async () => {
      for (const actor of [secretary, s.notResponsible]) {
        expectError(await mark(999999, actor), 404, 'CASE_NOT_FOUND');
      }
    });

    // CA-33.3
    it('una fecha posterior a hoy y una resolución vacía se informan juntas y no se escribe nada', async () => {
      await addRobbery(s.caseRow.id);
      const before = await persisted(s.caseRow.id);

      const res = await mark(s.caseRow.id, administrator, { prescriptionDate: '2026-10-07', resolution: '' });

      expectError(res, 400, 'VALIDATION_ERROR', ['prescriptionDate', 'resolution']);
      expect(res.body.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos.',
        details: {
          prescriptionDate: 'No puede ser posterior a hoy.',
          resolution: 'La resolución que declara la prescripción es obligatoria.',
        },
      });
      expect(await persisted(s.caseRow.id)).toEqual(before);
    });

    // CA-33.11
    it('una causa que no existe o fue dada de baja responde 404 CASE_NOT_FOUND', async () => {
      await addRobbery(s.caseRow.id);
      await deactivateCase(s.caseRow.id);

      for (const caseId of [999999, s.caseRow.id]) {
        const res = await mark(caseId, administrator);

        expectError(res, 404, 'CASE_NOT_FOUND');
        expect(res.body.error.message).toBe(MESSAGES.notFound);
      }
    });
  });

  // ── D3: reglas de negocio (422) ──────────────────────────────────────

  describe('reglas de negocio', () => {
    // CA-33.9, D-74: el amparo por el fuero; la causa penal sin calificaciones, por no tener qué prescribir.
    it('un amparo o una causa penal sin calificaciones no prescriben: PRESCRIPTION_NOT_APPLICABLE', async () => {
      await createInitialState('AMPARO');
      const amparo = await createCase({
        clientId: s.client.id,
        responsibleLawyerId: s.lawyer.id,
        createdByUserId: s.user.id,
        jurisdiction: 'AMPARO',
      });
      const cases: [caseId: number, message: string][] = [
        [amparo.id, MESSAGES.notCriminal],
        [s.caseRow.id, MESSAGES.withoutQualifications],
      ];

      for (const [caseId, message] of cases) {
        const before = await persisted(caseId);

        const res = await mark(caseId, administrator);

        expectError(res, 422, 'PRESCRIPTION_NOT_APPLICABLE');
        expect(res.body.error.message).toBe(message);
        expect(await persisted(caseId)).toEqual(before);
      }
    });

    // CA-33.8, CA-33.12
    it('una causa ya prescripta o archivada no se puede marcar: CASE_IN_TERMINAL_STATE, y su constancia no cambia', async () => {
      const prescribed = await createCase({
        clientId: s.client.id,
        responsibleLawyerId: s.lawyer.id,
        createdByUserId: s.user.id,
        currentStateId: s.states.prescribed.stateId,
        prescriptionDeclaration: {
          prescriptionDate: '2026-08-01',
          resolution: 'Auto N° 99, la resolución original',
          registeredByUserId: s.user.id,
          registeredAt: new Date('2026-08-01T15:00:00.000Z'),
        },
      });
      const archived = await createCase({
        clientId: s.client.id,
        responsibleLawyerId: s.lawyer.id,
        createdByUserId: s.user.id,
        currentStateId: s.states.terminal.stateId,
      });

      for (const closed of [prescribed, archived]) {
        await addRobbery(closed.id);
        const before = await persisted(closed.id);

        const res = await mark(closed.id, administrator);

        expectError(res, 422, 'CASE_IN_TERMINAL_STATE');
        expect(res.body.error.message).toBe(MESSAGES.terminal);
        expect(await persisted(closed.id)).toEqual(before);
      }
    });
  });

  // ── D4: efectos en el resto del sistema ──────────────────────────────

  describe('efectos en el resto del sistema', () => {
    // CA-33.7, CA-33.16
    it('sigue consultable, se encuentra filtrando por "Prescripta" y el pase se ve en su historia', async () => {
      await addRobbery(s.caseRow.id);
      const marked = expectData<Record<string, any>>(await mark(s.caseRow.id, administrator), 200);

      const listed = expectPaginated<{ id: number }>(
        await server().get('/api/v1/cases').query({ proceduralStateId: s.states.prescribed.stateId }).set(secretary),
      );
      expect(listed.map((item) => item.id)).toEqual([s.caseRow.id]);
      expect(await detail(s.caseRow.id)).toEqual(marked);

      const timeline = await server().get(`/api/v1/cases/${s.caseRow.id}/timeline`).set(secretary).expect(200);
      expect(timeline.body.data).toContainEqual(
        expect.objectContaining({ type: 'PRESCRIPTION_DECLARATION', date: '2026-09-15' }),
      );
    });

    // CA-33.6
    it('sale de las alertas de prescripción y deja de contar en la carga de su abogado', async () => {
      await addRobbery(s.caseRow.id);
      const lawyerDashboard = async () =>
        expectData<{ prescriptionAlerts: { caseId: number }[] }>(
          await server().get('/api/v1/dashboards/lawyer').set(s.responsible),
          200,
        );
      const activeCasesOfLawyer = async () => {
        const lawyers = expectPaginated<{ id: number; activeCases: number }>(
          await server().get('/api/v1/lawyers').set(loginAs({ roles: ['ADMINISTRATOR'], permissions: ['lawyer:read'] })),
        );
        return lawyers.find((lawyer) => lawyer.id === s.lawyer.id)!.activeCases;
      };
      // Al 70 %, la causa está en las alertas y cuenta para su abogado.
      expect((await lawyerDashboard()).prescriptionAlerts.map((alert) => alert.caseId)).toContain(s.caseRow.id);
      expect(await activeCasesOfLawyer()).toBe(1);

      await mark(s.caseRow.id, administrator).expect(200);

      expect((await lawyerDashboard()).prescriptionAlerts.map((alert) => alert.caseId)).not.toContain(s.caseRow.id);
      expect(await activeCasesOfLawyer()).toBe(0);
    });

    // CA-33.8
    it('no admite actos procesales ni interruptivos nuevos', async () => {
      await addRobbery(s.caseRow.id);
      await mark(s.caseRow.id, administrator).expect(200);

      const procedural = await server()
        .post(`/api/v1/cases/${s.caseRow.id}/procedural-acts`)
        .set(s.responsible)
        .send({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-01' });
      const interruptive = await server()
        .post(`/api/v1/cases/${s.caseRow.id}/interruptive-acts`)
        .set(s.responsible)
        .send({ name: 'Citación a juicio', actDate: '2026-10-01' });

      expectError(procedural, 422, 'CASE_IN_TERMINAL_STATE');
      expectError(interruptive, 422, 'CASE_IN_TERMINAL_STATE');
      expect(await getPrisma().proceduralAct.count({ where: { caseId: s.caseRow.id } })).toBe(0);
      expect(await getPrisma().interruptiveAct.count({ where: { caseId: s.caseRow.id } })).toBe(0);
    });
  });

  // ── D-113: declarar la prescripción de una calificación ─────────────────
  // Plan: .claude/plans/tests-d113-prescripcion-por-delito.md. Causa con A (24 meses) y
  // C (72 meses), hecho del 10/01/2024. Al 06/10/2026: A al 100 % y vencida; C al 46 %.
  describe('POST /api/v1/cases/:caseId/legal-qualifications/:legalQualificationId/prescription (D-113)', () => {
    const declareOne = (
      caseId: number,
      qualificationId: number,
      actor: { Authorization: string },
      body: object = { prescriptionDate: '2026-09-15', resolution: 'Auto N° 88' },
    ) =>
      server().post(`/api/v1/cases/${caseId}/legal-qualifications/${qualificationId}/prescription`).set(actor).send(body);

    async function addOffense(caseId: number, months: number) {
      qualificationSeq += 1;
      const qualification = await createLegalQualification({
        prescriptionMonths: months,
        name: `HU33 calificación ${qualificationSeq} — art. ${qualificationSeq} CP`,
      });
      await getPrisma().offense.create({
        data: { caseId, legalQualificationId: qualification.id, offenseDate: civil('2024-01-10'), prescriptionDate: civil('2024-01-10') },
      });
      return qualification;
    }

    const byId = (data: Record<string, any>) =>
      [...data.legalQualifications].sort((x: { id: number }, y: { id: number }) => x.id - y.id);

    // CA-33.1, CA-33.4, CA-33.5, CA-33.19
    it('declara una calificación y la causa sigue abierta; al declarar la última, pasa a "Prescripta"', async () => {
      const a = await addOffense(s.caseRow.id, 24);
      const c = await addOffense(s.caseRow.id, 72);
      const stateBefore = (await detail(s.caseRow.id)).currentState;

      const first = expectData<Record<string, any>>(await declareOne(s.caseRow.id, a.id, s.responsible), 200);

      expect(Object.keys(first).sort()).toEqual(CASE_KEYS);
      const [declaredA, pendingC] = byId(first);
      expect(declaredA.prescriptionDeclaration).toEqual({
        prescriptionDate: '2026-09-15',
        resolution: 'Auto N° 88',
        grounds: null,
        registeredBy: { id: s.user.id, lastName: s.user.lastName, firstName: s.user.firstName },
        registeredAt: REGISTERED_AT,
      });
      expect(pendingC.prescriptionDeclaration).toBeNull();
      // La que rige pasa a C: A ya no cuenta.
      expect(first.prescription).toMatchObject({ legalQualificationId: c.id, elapsedPercentage: 46, expired: false });
      expect(first.currentState).toEqual(stateBefore);
      expect(first.prescriptionDeclaration).toBeNull();

      const second = expectData<Record<string, any>>(
        await declareOne(s.caseRow.id, c.id, administrator, { prescriptionDate: '2026-10-01', resolution: 'Auto N° 91' }),
        200,
      );

      expect(second.currentState).toMatchObject({ proceduralStateId: s.states.prescribed.stateId, name: 'Prescripta', dueDate: null });
      expect(second.prescriptionDeclaration).toMatchObject({ prescriptionDate: '2026-10-01', resolution: 'Auto N° 91' });
      expect(await getPrisma().offense.findMany({ where: { caseId: s.caseRow.id }, orderBy: { legalQualificationId: 'asc' } })).toEqual([
        expect.objectContaining({ prescriptionDeclaredOn: civil('2026-09-15'), prescriptionResolution: 'Auto N° 88' }),
        expect.objectContaining({ prescriptionDeclaredOn: civil('2026-10-01'), prescriptionResolution: 'Auto N° 91' }),
      ]);
    });

    // CA-33.1 (D-110), CA-33.8, CA-33.9: cada rechazo con el texto del contrato, y la base sin cambios.
    it('rechaza un abogado ajeno, una calificación que la causa no registra y una ya declarada, sin escribir', async () => {
      const a = await addOffense(s.caseRow.id, 24);
      await addOffense(s.caseRow.id, 72); // sigue abierta después de declarar A
      const foreign = await createLegalQualification({ prescriptionMonths: 24, name: 'HU33 calificación ajena — art. 1 CP' });

      const notResponsible = await declareOne(s.caseRow.id, a.id, s.notResponsible);
      expectError(notResponsible, 403, 'FORBIDDEN');
      expect(notResponsible.body.error.message).toBe(
        'Solo el abogado responsable de la causa puede declarar la prescripción de sus calificaciones legales.',
      );

      const notInCase = await declareOne(s.caseRow.id, foreign.id, s.responsible);
      expectError(notInCase, 404, 'LEGAL_QUALIFICATION_NOT_FOUND');
      expect(notInCase.body.error.message).toBe('La causa no registra esa calificación legal.');
      expect(await getPrisma().offense.count({ where: { caseId: s.caseRow.id, prescriptionDeclaredOn: { not: null } } })).toBe(0);

      await declareOne(s.caseRow.id, a.id, s.responsible).expect(200);
      const again = await declareOne(s.caseRow.id, a.id, s.responsible, { prescriptionDate: '2026-10-01', resolution: 'Otra' });
      expectError(again, 422, 'LEGAL_QUALIFICATION_ALREADY_PRESCRIBED');
      expect(again.body.error.message).toBe('La calificación legal ya fue declarada prescripta.');
      expect(await getPrisma().offense.findUniqueOrThrow({
        where: { caseId_legalQualificationId: { caseId: s.caseRow.id, legalQualificationId: a.id } },
      })).toMatchObject({ prescriptionResolution: 'Auto N° 88' });
    });

    // CA-33.17
    it('"Marcar toda la causa" declara las que faltan y la ya declarada conserva su declaración', async () => {
      const a = await addOffense(s.caseRow.id, 24);
      const c = await addOffense(s.caseRow.id, 72);
      await declareOne(s.caseRow.id, a.id, s.responsible).expect(200);

      const data = expectData<Record<string, any>>(await mark(s.caseRow.id, administrator), 200);

      const [declaredA, declaredC] = byId(data);
      expect(declaredA.id).toBe(a.id);
      expect(declaredA.prescriptionDeclaration).toMatchObject({ resolution: 'Auto N° 88' });
      expect(declaredC.id).toBe(c.id);
      expect(declaredC.prescriptionDeclaration).toMatchObject({ resolution: VALID_BODY.resolution });
      expect(data.currentState.name).toBe('Prescripta');
    });
  });
});
