import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { startTestApp, stopTestApp, getPrisma } from '../../shared/harness/test-app';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { loginAs } from '../../shared/auth/login-as';
import { aCaseBody, createCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import { createInitialState } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';

const URL = '/api/v1/cases';

/*
 * HU18 Registrar Causa. Contrato: openapi `paths/cases.yaml` (POST /cases).
 *
 * Cliente, abogado, calificación legal y estado inicial se leen de la base real a
 * través de los adaptadores de `people` y `legal-parameters`, así que estos tests
 * crean esas filas con las factories.
 */
describe('POST /api/v1/cases', () => {
  let app: INestApplication;
  let actor: { Authorization: string };
  let userId: number;
  let lawyerId: number;
  let clientId: number;

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.offense.deleteMany(); // hijas de cases
    // La causa apunta a su acto vigente con `Restrict`: hay que soltar la FK
    // antes de borrar los actos, o el DELETE viola
    // `cases_current_procedural_act_id_fkey`. Sin esta línea el spec falla
    // **según el orden en que Jest corra las suites** —intermitente— y sólo
    // cuando una suite vecina dejó una causa con acto vigente, que es lo que
    // hace `register-procedural-act.int.spec.ts`. Mismo orden que
    // `case-query.int.spec.ts:53`.
    await prisma.case.updateMany({ data: { currentProceduralActId: null } });
    await prisma.proceduralAct.deleteMany();
    await prisma.case.deleteMany();
    await prisma.user.deleteMany(); // referencia a lawyers
    await prisma.lawyer.deleteMany();
    await prisma.client.deleteMany();
    await prisma.legalQualification.deleteMany();

    // Los fueros y sus estados iniciales los siembra el seed, pero otros specs los borran.
    await createInitialState('CRIMINAL');
    await createInitialState('AMPARO');

    // La causa guarda quién la creó (FK a users) y el abogado responsable (FK a lawyers).
    const lawyer = await createLawyer();
    const user = await createUser({ roles: ['SECRETARY'] });
    const client = await createClient();
    lawyerId = lawyer.id;
    userId = user.id;
    clientId = client.id;
    actor = loginAs({ userId, roles: ['SECRETARY'] });
  });

  it('registra una causa penal con su calificación legal en el estado inicial', async () => {
    const qualification = await createLegalQualification({ prescriptionMonths: 96 });
    const body = aCaseBody(
      { clientId, responsibleLawyerId: lawyerId },
      {
        sacNumber: '13284571',
        court: 'Juzgado de Control N° 3 · Córdoba',
        instructorName: 'Dra. Verónica Ledesma',
        tribunalPhone: '0351 448-1200',
        instructorExtension: '214',
        legalQualifications: [{ legalQualificationId: qualification.id, offenseDate: '2021-02-27' }],
        startDate: '2021-03-12',
      },
    );

    const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

    // Contrato (Case.yaml): los datos de cliente y abogado vienen de sus subsistemas.
    const data = expectData(res, 201);
    const saved = await getPrisma().client.findUniqueOrThrow({ where: { id: clientId } });
    const lawyer = await getPrisma().lawyer.findUniqueOrThrow({ where: { id: lawyerId } });
    expect(data).toEqual({
      id: expect.any(Number),
      sacNumber: '13284571',
      caption: body.caption,
      court: 'Juzgado de Control N° 3 · Córdoba',
      jurisdiction: 'CRIMINAL',
      proceduralRole: 'DEFENSA',
      instructorName: 'Dra. Verónica Ledesma',
      tribunalPhone: '0351 448-1200',
      instructorExtension: '214',
      counterparty: null,
      subjectMatter: null,
      client: {
        id: clientId,
        lastName: saved.lastName,
        firstName: saved.firstName,
        dni: saved.dni,
        phone: saved.phone,
        email: saved.email,
        clientSince: '2021-03-12',
      },
      responsibleLawyer: {
        id: lawyerId,
        lastName: lawyer.lastName,
        firstName: lawyer.firstName,
        registrationNumber: lawyer.registrationNumber,
      },
      legalQualifications: [
        {
          id: qualification.id,
          name: qualification.name,
          prescriptionMonths: 96,
          offenseDate: '2021-02-27',
          prescriptionStartsOn: '2021-02-27',
          prescriptionExpiresOn: '2029-02-27',
        },
      ],
      startDate: '2021-03-12',
      currentState: {
        proceduralStateId: null,
        name: 'Iniciada',
        custom: false,
        initial: true,
        proceduralActId: null,
        dueDate: null,
        businessDaysRemaining: null,
        manuallyAdjusted: false,
      },
      active: true,
    });

    // Base: la causa nace en el estado inicial de su fuero, a nombre del usuario, con su hecho.
    const initialState = await createInitialState('CRIMINAL');
    const row = await getPrisma().case.findUniqueOrThrow({
      where: { id: (data as { id: number }).id },
      include: { offenses: true },
    });
    expect(row).toMatchObject({
      sacNumber: '13284571',
      clientId,
      responsibleLawyerId: lawyerId,
      createdByUserId: userId,
      jurisdictionId: initialState.jurisdictionId,
      currentStateId: initialState.stateId,
      active: true,
    });
    expect(row.offenses).toHaveLength(1);
    expect(row.offenses[0].legalQualificationId).toBe(qualification.id);
    expect(row.offenses[0].prescriptionDate).toEqual(new Date('2029-02-27T00:00:00.000Z'));
  });

  it('registra un amparo con contraparte y objeto, sin calificaciones legales', async () => {
    const body = aCaseBody(
      { clientId, responsibleLawyerId: lawyerId },
      {
        jurisdiction: 'AMPARO',
        proceduralRole: 'ACTORA',
        caption: 'MOYANO, Daniela c/ APROSS — Amparo de salud',
        counterparty: 'APROSS',
        subjectMatter: 'Que se ordene a APROSS la cobertura integral del tratamiento prescripto.',
      },
    );

    const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

    const data = expectData<Record<string, unknown>>(res, 201);
    expect(data).toMatchObject({
      jurisdiction: 'AMPARO',
      proceduralRole: 'ACTORA',
      counterparty: 'APROSS',
      subjectMatter: body.subjectMatter,
      legalQualifications: [],
      currentState: { name: 'Iniciada', initial: true },
    });

    expect(await getPrisma().case.count()).toBe(1);
    expect(await getPrisma().offense.count()).toBe(0);
  });

  it('informa por campo un cliente, un abogado y una calificación inexistentes y no guarda nada', async () => {
    const body = aCaseBody(
      { clientId: clientId + 1000, responsibleLawyerId: lawyerId + 1000 },
      { legalQualifications: [{ legalQualificationId: 999999, offenseDate: '2021-02-27' }] },
    );

    const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

    expectError(res, 400, 'VALIDATION_ERROR', ['clientId', 'responsibleLawyerId', 'legalQualifications']);
    expect(await getPrisma().case.count()).toBe(0);
    expect(await getPrisma().offense.count()).toBe(0);
  });

  // Un dato dado de baja (active = false) cuenta como inexistente (RN12, CA-18.9):
  // 400 VALIDATION_ERROR solo sobre su campo y nada guardado.
  it('rechaza un abogado responsable dado de baja', async () => {
    const inactiveLawyer = await createLawyer({ active: false });
    const body = aCaseBody({ clientId, responsibleLawyerId: inactiveLawyer.id });

    const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

    expectError(res, 400, 'VALIDATION_ERROR', ['responsibleLawyerId']);
    expect(Object.keys(res.body.error.details)).toEqual(['responsibleLawyerId']);
    expect(await getPrisma().case.count()).toBe(0);
  });

  it('rechaza un cliente dado de baja', async () => {
    const inactiveClient = await createClient({ active: false });
    const body = aCaseBody({ clientId: inactiveClient.id, responsibleLawyerId: lawyerId });

    const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

    expectError(res, 400, 'VALIDATION_ERROR', ['clientId']);
    expect(Object.keys(res.body.error.details)).toEqual(['clientId']);
    expect(await getPrisma().case.count()).toBe(0);
  });

  it('rechaza una calificación legal dada de baja', async () => {
    const inactiveQualification = await createLegalQualification({ active: false });
    const body = aCaseBody(
      { clientId, responsibleLawyerId: lawyerId },
      { legalQualifications: [{ legalQualificationId: inactiveQualification.id, offenseDate: '2021-02-27' }] },
    );

    const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

    expectError(res, 400, 'VALIDATION_ERROR', ['legalQualifications']);
    expect(Object.keys(res.body.error.details)).toEqual(['legalQualifications']);
    expect(await getPrisma().case.count()).toBe(0);
    expect(await getPrisma().offense.count()).toBe(0);
  });

  it('registra una causa sin SAC y sin fecha de inicio: la fecha queda en null', async () => {
    // Case.yaml: `startDate` viaja siempre, y vale null mientras la causa no tiene SAC.
    const body = aCaseBody({ clientId, responsibleLawyerId: lawyerId });
    expect(body).not.toHaveProperty('sacNumber');
    expect(body).not.toHaveProperty('startDate');

    const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

    const data = expectData<{ id: number }>(res, 201);
    expect(data).toMatchObject({ sacNumber: null, startDate: null, active: true });
    expect(data).toHaveProperty('startDate', null);

    // Base: la columna admite NULL; no se guarda una fecha inventada.
    const row = await getPrisma().case.findUniqueOrThrow({ where: { id: data.id } });
    expect(row.sacNumber).toBeNull();
    expect(row.startDate).toBeNull();
  });

  it('rechaza un número de SAC ya registrado y no guarda otra causa', async () => {
    await createCase({ clientId, responsibleLawyerId: lawyerId, createdByUserId: userId, sacNumber: '13284571' });
    const body = aCaseBody({ clientId, responsibleLawyerId: lawyerId }, { sacNumber: '13284571', startDate: '2021-03-12' });

    const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

    expectError(res, 409, 'CASE_SAC_ALREADY_EXISTS');
    expect(await getPrisma().case.count()).toBe(1); // solo la que ya existía
  });

  it('responde 401 sin token', async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .send(aCaseBody({ clientId, responsibleLawyerId: lawyerId }));

    expectError(res, 401, 'UNAUTHENTICATED');
    expect(await getPrisma().case.count()).toBe(0);
  });
});
