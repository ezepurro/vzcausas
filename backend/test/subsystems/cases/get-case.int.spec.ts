import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { loginAs } from '../../shared/auth/login-as';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import {
  createInitialState,
  createProceduralState,
} from '../../shared/factories/procedural-state.factory';
import { createCase } from '../../shared/factories/case.factory';
import { createUser } from '../../shared/factories/user.factory';
import { civil, withFixedClock } from '../../shared/harness/fixed-clock';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

const URL = '/api/v1/cases';

/*
 * HU22 Consultar detalle de causa. Contrato: API_CONTRACT_V4.md §3.7
 * (GET /cases/{caseId}).
 *
 * Lo que este spec tiene que fijar, por encima de todo: que el detalle
 * devuelva **el mismo recurso que el listado**. Si divergen, es un bug, y es
 * un bug silencioso porque los dos endpoints "funcionan" por separado.
 *
 * Pero que sean iguales entre sí no prueba que cumplan el contrato: dos salidas
 * igual de incompletas también son iguales. Por eso el juego de claves y los
 * campos calculados (`prescription`) se fijan acá contra el contrato.
 *
 * Reloj fijo: hoy es el 06/10/2026 (`fixed-clock.ts`).
 */
describe('GET /api/v1/cases/{caseId}', () => {
  let app: INestApplication;
  let actor: { Authorization: string };
  let userId: number;
  let lawyerId: number;
  let clientId: number;

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.offense.deleteMany();
    await prisma.case.updateMany({ data: { currentProceduralActId: null } });
    await prisma.proceduralAct.deleteMany();
    await prisma.case.deleteMany();
    await prisma.user.deleteMany();
    await prisma.lawyer.deleteMany();
    await prisma.client.deleteMany();
    await prisma.proceduralState.deleteMany();

    await createInitialState('CRIMINAL');

    const lawyer = await createLawyer();
    const user = await createUser({ roles: ['SECRETARY'] });
    const client = await createClient({ lastName: 'GÓMEZ', firstName: 'Ariel Fernando' });
    lawyerId = lawyer.id;
    userId = user.id;
    clientId = client.id;
    actor = loginAs({ userId, roles: ['SECRETARY'] });
  });

  async function aCase(caption = 'CAUSA') {
    const initial = await createInitialState('CRIMINAL');
    return getPrisma().case.create({
      data: {
        sacNumber: '13284571',
        caption,
        court: 'Juzgado de Control N° 3 · Córdoba',
        jurisdictionId: initial.jurisdictionId,
        proceduralRole: 'DEFENSA',
        instructorName: 'Dra. Verónica Ledesma',
        instructorPhone: '0351 448-1200',
        instructorExtension: '214',
        clientId,
        responsibleLawyerId: lawyerId,
        startDate: new Date('2021-03-12T00:00:00.000Z'),
        currentStateId: initial.stateId,
        createdByUserId: userId,
      },
    });
  }

  it('devuelve el recurso en el sobre `{ data }`, no paginado', async () => {
    const created = await aCase();

    const res = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);
    const item = expectData<Record<string, unknown>>(res, 200);

    expect(item).toMatchObject({
      id: created.id,
      sacNumber: '13284571',
      caption: 'CAUSA',
      court: 'Juzgado de Control N° 3 · Córdoba',
      jurisdiction: 'CRIMINAL',
      instructorName: 'Dra. Verónica Ledesma',
      // La columna es `instructor_phone`; el contrato lo llama `tribunalPhone`.
      tribunalPhone: '0351 448-1200',
      instructorExtension: '214',
      counterparty: null,
      subjectMatter: null,
      client: { id: clientId, lastName: 'GÓMEZ', firstName: 'Ariel Fernando' },
      responsibleLawyer: { id: lawyerId },
      legalQualifications: [],
      startDate: '2021-03-12',
      active: true,
    });
  });

  it('tiene exactamente las 30 claves del recurso (V4 §3.7)', async () => {
    const created = await aCase();

    const item = expectData<Record<string, unknown>>(
      await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor),
      200,
    );

    expect(Object.keys(item).sort()).toEqual(
      [
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
      ].sort(),
    );
  });

  it('devuelve EXACTAMENTE el mismo objeto que el listado', async () => {
    // Es la razón de ser del mapper compartido. Si alguien agrega un campo en
    // un endpoint y se olvida del otro, este test lo atrapa.
    const created = await aCase();
    const state = await createProceduralState({ name: 'Alegato' });
    const act = await getPrisma().proceduralAct.create({
      data: {
        caseId: created.id,
        proceduralStateId: state.stateId,
        actDate: new Date('2026-09-01T00:00:00.000Z'),
        deadlineTimeLimitDays: 5,
        deadlineDayType: 'BUSINESS',
        deadlineCountsFrom: new Date('2026-09-01T00:00:00.000Z'),
        deadlineComputedDueDate: new Date('2026-09-16T00:00:00.000Z'),
        registeredByUserId: userId,
        registeredByLawyerId: lawyerId,
      },
    });
    await getPrisma().case.update({
      where: { id: created.id },
      data: { currentStateId: state.stateId, currentProceduralActId: act.id },
    });

    const detalle = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);
    const listado = await request(app.getHttpServer()).get(URL).set(actor);

    const [delListado] = expectPaginated(listado);
    expect(expectData(detalle, 200)).toEqual(delListado);
  });

  it('en el estado inicial manda proceduralStateId en null y sin vencimiento', async () => {
    const created = await aCase();

    const res = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);
    const item = expectData<{ currentState: Record<string, unknown> }>(res, 200);

    expect(item.currentState).toEqual({
      proceduralStateId: null,
      name: 'Iniciada',
      custom: false,
      initial: true,
      proceduralActId: null,
      dueDate: null,
      businessDaysRemaining: null,
      manuallyAdjusted: false,
    });
  });

  it('muestra un estado escrito a mano con su texto y sin id', async () => {
    const created = await aCase();
    const act = await getPrisma().proceduralAct.create({
      data: {
        caseId: created.id,
        customState: 'Con acusación, pero con oposición',
        actDate: new Date('2026-09-01T00:00:00.000Z'),
        deadlineTimeLimitDays: 5,
        deadlineDayType: 'BUSINESS',
        deadlineCountsFrom: new Date('2026-09-01T00:00:00.000Z'),
        registeredByUserId: userId,
        registeredByLawyerId: lawyerId,
      },
    });
    await getPrisma().case.update({
      where: { id: created.id },
      data: {
        currentStateId: null,
        currentCustomState: 'Con acusación, pero con oposición',
        currentProceduralActId: act.id,
      },
    });

    const res = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);
    const item = expectData<{ currentState: Record<string, unknown> }>(res, 200);

    expect(item.currentState).toMatchObject({
      proceduralStateId: null,
      name: 'Con acusación, pero con oposición',
      custom: true,
      initial: false,
    });
  });

  // D-67 y D-78: los datos por fuero y el plazo del acto lesivo salen en el mismo recurso del listado y del detalle.
  describe('datos propios de cada fuero y harmfulActDeadline', () => {
    async function anAmparo(options: { leaveInitialState?: boolean } = {}) {
      await createInitialState('AMPARO');
      const created = await createCase({
        clientId,
        responsibleLawyerId: lawyerId,
        createdByUserId: userId,
        caption: 'MOYANO, Daniela c/ APROSS — Amparo de salud',
        jurisdiction: 'AMPARO',
        harmfulAct: { date: '2026-01-05', termDays: 30, termDayType: 'CONSECUTIVE' },
      });
      if (options.leaveInitialState) {
        const state = await createProceduralState({ name: 'Pedido de informe' });
        const act = await getPrisma().proceduralAct.create({
          data: {
            caseId: created.id,
            proceduralStateId: state.stateId,
            actDate: new Date('2026-09-01T00:00:00.000Z'),
            deadlineTimeLimitDays: 5,
            deadlineDayType: 'BUSINESS',
            deadlineCountsFrom: new Date('2026-09-01T00:00:00.000Z'),
            deadlineComputedDueDate: new Date('2026-09-08T00:00:00.000Z'),
            registeredByUserId: userId,
            registeredByLawyerId: lawyerId,
          },
        });
        await getPrisma().case.update({
          where: { id: created.id },
          data: { currentStateId: state.stateId, currentProceduralActId: act.id },
        });
      }
      return created;
    }

    it('un amparo en "Iniciada" muestra el acto lesivo y su plazo, igual en el detalle y en el listado', async () => {
      const created = await anAmparo();

      const detail = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);
      const list = await request(app.getHttpServer()).get(URL).set(actor);

      const item = expectData<{ harmfulActDeadline: { businessDaysRemaining: number } }>(detail, 200);
      expect(item).toMatchObject({
        clientDetained: null,
        injunctionGranted: false,
        harmfulActDate: '2026-01-05',
        harmfulActRenews: false,
        harmfulActRenewalDays: null,
        harmfulActTermDays: 30,
        harmfulActTermDayType: 'CONSECUTIVE',
        harmfulActDeadline: { actDate: '2026-01-05', renewed: false, dueDate: '2026-02-04' },
        administrativeRemedyExhaustedOn: null,
        courtFeePaid: false,
      });
      // Venció hace rato, y sigue abierto: negativo, no oculto.
      expect(item.harmfulActDeadline.businessDaysRemaining).toBeLessThan(0);
      expect(expectPaginated(list)[0]).toEqual(item);
    });

    it('en cuanto el amparo sale de "Iniciada" el plazo vale null, pero el acto lesivo cargado se conserva', async () => {
      const created = await anAmparo({ leaveInitialState: true });

      const res = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);

      expect(expectData(res, 200)).toMatchObject({
        harmfulActDate: '2026-01-05',
        harmfulActTermDays: 30,
        harmfulActDeadline: null,
      });
    });

    it('una causa penal anterior a D-67, con NULL en la base, sale con clientDetained en false', async () => {
      const created = await aCase();

      const res = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);

      expect(expectData(res, 200)).toMatchObject({
        clientDetained: false,
        injunctionGranted: null,
        harmfulActDeadline: null,
        courtFeePaid: false,
      });
    });
  });

  // V4 §3.7: la prescripción que rige la causa y la constancia de que se la marcó como prescripta.
  describe('prescription y prescriptionDeclaration', () => {
    let qualificationSeq = 0;

    /** Cuelga de la causa una calificación con su fecha del hecho, como la deja el alta (HU18). */
    async function addOffense(caseId: number, offenseDate: string, prescriptionMonths: number) {
      qualificationSeq += 1;
      const qualification = await createLegalQualification({
        prescriptionMonths,
        name: `HU22 calificación ${qualificationSeq} — art. ${qualificationSeq} CP`,
      });
      await getPrisma().offense.create({
        data: {
          caseId,
          legalQualificationId: qualification.id,
          offenseDate: civil(offenseDate),
          prescriptionDate: civil(offenseDate),
        },
      });
      return qualification;
    }

    const detail = async (caseId: number) =>
      expectData<Record<string, any>>(await request(app.getHttpServer()).get(`${URL}/${caseId}`).set(actor), 200);

    afterAll(async () => {
      await getPrisma().offense.deleteMany();
      await getPrisma().legalQualification.deleteMany({ where: { name: { startsWith: 'HU22 calificación' } } });
    });

    it('una causa penal con calificación devuelve la prescripción calculada', async () => {
      const created = await aCase();
      const robo = await addOffense(created.id, '2021-02-27', 96);

      const item = await detail(created.id);

      // Al 06/10/2026: 2047 de 2922 días (70,05 %). Sin actos interruptivos, corre desde el hecho.
      expect(item.prescription).toEqual({
        legalQualificationId: robo.id,
        legalQualificationName: robo.name,
        startsOn: '2021-02-27',
        expiresOn: '2029-02-27',
        elapsedPercentage: 70,
        alert: true,
        expired: false,
        lastInterruptiveActDate: null,
      });
      expect(item.prescriptionDeclaration).toBeNull();
    });

    it('rige la calificación que prescribe primero, aunque se haya cargado después', async () => {
      const created = await aCase();
      await addOffense(created.id, '2021-02-27', 180);
      const amenazas = await addOffense(created.id, '2025-01-10', 24);

      expect((await detail(created.id)).prescription).toMatchObject({
        legalQualificationId: amenazas.id,
        startsOn: '2025-01-10',
        expiresOn: '2027-01-10',
      });
    });

    it('una causa penal sin calificaciones devuelve prescription en null (D-74)', async () => {
      const created = await aCase();

      expect((await detail(created.id)).prescription).toBeNull();
    });

    it('una causa marcada como prescripta devuelve la constancia y conserva su prescripción', async () => {
      const created = await aCase();
      const robo = await addOffense(created.id, '2021-02-27', 96);
      // HU33 todavía no tiene endpoint: las columnas se cargan como las dejaría.
      await getPrisma().case.update({
        where: { id: created.id },
        data: {
          prescriptionDate: civil('2026-09-15'),
          prescriptionResolution: 'Sentencia N° 214 del Juzgado de Control N° 3',
          prescriptionGrounds: null,
          prescriptionRegisteredByUserId: userId,
          prescriptionRegisteredAt: new Date('2026-09-15T15:20:00.000Z'),
        },
      });
      const user = await getPrisma().user.findUniqueOrThrow({ where: { id: userId } });

      const item = await detail(created.id);

      expect(item.prescriptionDeclaration).toEqual({
        prescriptionDate: '2026-09-15',
        resolution: 'Sentencia N° 214 del Juzgado de Control N° 3',
        grounds: null,
        registeredBy: { id: userId, lastName: user.lastName, firstName: user.firstName },
        registeredAt: '2026-09-15T12:20:00-03:00',
      });
      // V4 §3.7: `prescription` se sigue devolviendo en una causa prescripta, como dato histórico.
      expect(item.prescription).toMatchObject({ legalQualificationId: robo.id, expiresOn: '2029-02-27' });
    });

    it('un amparo devuelve prescription en null', async () => {
      await createInitialState('AMPARO');
      const created = await createCase({
        clientId,
        responsibleLawyerId: lawyerId,
        createdByUserId: userId,
        jurisdiction: 'AMPARO',
      });

      expect(await detail(created.id)).toMatchObject({ prescription: null, prescriptionDeclaration: null });
    });
  });

  describe('errores', () => {
    it('responde 404 CASE_NOT_FOUND para una causa inexistente', async () => {
      const res = await request(app.getHttpServer()).get(`${URL}/999999`).set(actor);

      expectError(res, 404, 'CASE_NOT_FOUND');
      expect(res.body.error.message).toBe('No se encontró la causa solicitada.');
    });

    it('responde 404 para una causa dada de baja: no se distingue de una inexistente', async () => {
      const created = await aCase();
      await getPrisma().case.update({ where: { id: created.id }, data: { active: false } });

      const res = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);

      expectError(res, 404, 'CASE_NOT_FOUND');
    });

    it.each([['abc'], ['0'], ['-3'], ['1.5']])(
      'responde 400 INVALID_PATH_PARAMETER ante un caseId "%s"',
      async (raw) => {
        const res = await request(app.getHttpServer()).get(`${URL}/${raw}`).set(actor);

        expectError(res, 400, 'INVALID_PATH_PARAMETER', ['caseId']);
      },
    );

    it('responde 401 sin token', async () => {
      const created = await aCase();

      const res = await request(app.getHttpServer()).get(`${URL}/${created.id}`);

      expectError(res, 401, 'UNAUTHENTICATED');
    });
  });
});
