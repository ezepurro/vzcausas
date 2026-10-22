import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { startTestApp, stopTestApp, getPrisma } from '../../shared/harness/test-app';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { loginAs } from '../../shared/auth/login-as';
import { aCaseBody, createCase } from '../../shared/factories/case.factory';
import { clearCloudFolders, createCloudStructure } from '../../shared/factories/cloud-structure.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import { createInitialState } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';

const URL = '/api/v1/cases';

/*
 * HU18 Registrar Causa. Contrato: API_CONTRACT_V4.md §3.7 (POST /cases).
 *
 * Con el reloj fijo (hoy es el 06/10/2026, `fixed-clock.ts`): `prescription`
 * depende de la fecha de hoy y el test fija sus valores exactos.
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
  let storage: InMemoryDocumentStorage;

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
    storage = app.get(DOCUMENT_STORAGE);
  });

  afterAll(async () => {
    await clearCloudFolders();
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
    await clearCloudFolders();
    // HU39: la estructura base del estudio, sin la cual la carpeta de una causa no se puede crear.
    await createCloudStructure(storage);
    await prisma.user.deleteMany(); // referencia a lawyers
    await prisma.lawyer.deleteMany();
    await prisma.client.deleteMany();
    await prisma.legalQualification.deleteMany();

    // Los fueros y sus estados iniciales los siembra el seed, pero otros specs los borran.
    await createInitialState('CRIMINAL');
    await createInitialState('AMPARO');
    await createInitialState('ADMINISTRATIVE');

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
      // D-67: un penal sin enviar nada. `clientDetained` vale false; los datos de los otros fueros, null.
      clientDetained: false,
      injunctionGranted: null,
      harmfulActDate: null,
      harmfulActRenews: null,
      harmfulActRenewalDays: null,
      harmfulActTermDays: null,
      harmfulActTermDayType: null,
      harmfulActDeadline: null,
      administrativeRemedyExhaustedOn: null,
      courtFeePaid: false,
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
      // V4 §3.7: calculada desde el alta. Al 06/10/2026 transcurrieron 2047 de
      // 2922 días (70,05 %): la alerta se evalúa sobre el valor exacto, y acá
      // ya está encendida aunque el redondeado sea 70.
      prescription: {
        legalQualificationId: qualification.id,
        legalQualificationName: qualification.name,
        startsOn: '2021-02-27',
        expiresOn: '2029-02-27',
        elapsedPercentage: 70,
        alert: true,
        expired: false,
        lastInterruptiveActDate: null,
      },
      prescriptionDeclaration: null,
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
      // HU39: el almacenamiento en memoria responde enseguida, así que la carpeta llega creada.
      folder: {
        status: 'CREATED',
        url: expect.stringMatching(/^https:\/\/storage\.invalid\/folders\//),
        path: `/VZ Causas/Causas/${lawyer.lastName}, ${lawyer.firstName}/Penal/${body.caption}`,
        templatesCopied: 0,
        templatesPending: 0,
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
      // Los amparos no prescriben (V4 §4, Prescripción).
      prescription: null,
      prescriptionDeclaration: null,
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

  // D-67: datos propios de cada fuero. Se cargan solo al registrar la causa y salen en el mismo recurso.
  describe('datos propios de cada fuero (D-67)', () => {
    it('penal: guarda si el cliente está preso y la tasa de justicia, y el resto de los datos sale null', async () => {
      const body = aCaseBody({ clientId, responsibleLawyerId: lawyerId }, { clientDetained: true, courtFeePaid: true });

      const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

      const data = expectData<{ id: number }>(res, 201);
      expect(data).toMatchObject({
        clientDetained: true,
        injunctionGranted: null,
        harmfulActDate: null,
        harmfulActRenews: null,
        harmfulActRenewalDays: null,
        harmfulActTermDays: null,
        harmfulActTermDayType: null,
        harmfulActDeadline: null,
        administrativeRemedyExhaustedOn: null,
        courtFeePaid: true,
      });
      const row = await getPrisma().case.findUniqueOrThrow({ where: { id: data.id } });
      expect(row).toMatchObject({ clientDetained: true, courtFeePaid: true, injunctionGranted: null, harmfulActRenews: null });
    });

    it('administrativo: guarda la fecha de agotamiento de la vía administrativa', async () => {
      const body = aCaseBody(
        { clientId, responsibleLawyerId: lawyerId },
        {
          jurisdiction: 'ADMINISTRATIVE',
          proceduralRole: 'RECURRENTE',
          subjectMatter: 'Descargo frente a la imputación de falta grave.',
          administrativeRemedyExhaustedOn: '2026-08-10',
          courtFeePaid: true,
        },
      );

      const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

      const data = expectData<{ id: number }>(res, 201);
      expect(data).toMatchObject({
        clientDetained: null,
        injunctionGranted: null,
        harmfulActDeadline: null,
        administrativeRemedyExhaustedOn: '2026-08-10',
        courtFeePaid: true,
        prescription: null,
        prescriptionDeclaration: null,
      });
      const row = await getPrisma().case.findUniqueOrThrow({ where: { id: data.id } });
      expect(row.administrativeRemedyExhaustedOn).toEqual(new Date('2026-08-10T00:00:00.000Z'));
      expect(row.clientDetained).toBeNull();
    });

    it('amparo: guarda la medida cautelar y el acto lesivo, y devuelve su plazo calculado', async () => {
      // Fechas fijas en el pasado: el plazo ya venció, pero sigue abierto (el amparo está en "Iniciada").
      const body = aCaseBody(
        { clientId, responsibleLawyerId: lawyerId },
        {
          jurisdiction: 'AMPARO',
          proceduralRole: 'ACTORA',
          subjectMatter: 'Que se ordene la cobertura integral del tratamiento.',
          injunctionGranted: true,
          harmfulActDate: '2026-01-05',
          harmfulActRenews: false,
          harmfulActTermDays: 30,
          harmfulActTermDayType: 'CONSECUTIVE',
          courtFeePaid: true,
        },
      );

      const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

      const data = expectData<{ id: number; harmfulActDeadline: { businessDaysRemaining: number } }>(res, 201);
      expect(data).toMatchObject({
        clientDetained: null,
        injunctionGranted: true,
        harmfulActDate: '2026-01-05',
        harmfulActRenews: false,
        harmfulActRenewalDays: null,
        harmfulActTermDays: 30,
        harmfulActTermDayType: 'CONSECUTIVE',
        harmfulActDeadline: { actDate: '2026-01-05', renewed: false, dueDate: '2026-02-04' },
        administrativeRemedyExhaustedOn: null,
        courtFeePaid: true,
      });
      expect(data.harmfulActDeadline.businessDaysRemaining).toBeLessThan(0);
      const row = await getPrisma().case.findUniqueOrThrow({ where: { id: data.id } });
      expect(row).toMatchObject({
        injunctionGranted: true,
        harmfulActDate: new Date('2026-01-05T00:00:00.000Z'),
        harmfulActRenews: false,
        harmfulActRenewalDays: null,
        harmfulActTermDays: 30,
        harmfulActTermDayType: 'CONSECUTIVE',
      });
    });

    it('amparo con renovación: el plazo corre desde la última renovación y se guardan los días de renovación', async () => {
      const body = aCaseBody(
        { clientId, responsibleLawyerId: lawyerId },
        {
          jurisdiction: 'AMPARO',
          proceduralRole: 'ACTORA',
          subjectMatter: 'Que se ordene la cobertura integral del tratamiento.',
          harmfulActDate: '2026-01-05',
          harmfulActRenews: true,
          harmfulActRenewalDays: 30,
          harmfulActTermDays: 15,
          harmfulActTermDayType: 'BUSINESS',
        },
      );

      const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

      const data = expectData<{ id: number; harmfulActDeadline: { actDate: string; renewed: boolean } }>(res, 201);
      expect(data).toMatchObject({ harmfulActRenews: true, harmfulActRenewalDays: 30 });
      // La fecha cargada no cambia; la renovación vigente es posterior a ella.
      expect(data).toMatchObject({ harmfulActDate: '2026-01-05' });
      expect(data.harmfulActDeadline.renewed).toBe(true);
      expect(data.harmfulActDeadline.actDate > '2026-01-05').toBe(true);
      const row = await getPrisma().case.findUniqueOrThrow({ where: { id: data.id } });
      expect(row).toMatchObject({ harmfulActRenews: true, harmfulActRenewalDays: 30 });
    });

    it('amparo sin acto lesivo: la medida cautelar y la renovación valen false y no hay plazo', async () => {
      const body = aCaseBody(
        { clientId, responsibleLawyerId: lawyerId },
        {
          jurisdiction: 'AMPARO',
          proceduralRole: 'ACTORA',
          subjectMatter: 'Que se ordene la cobertura integral del tratamiento.',
        },
      );

      const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

      expect(expectData(res, 201)).toMatchObject({
        injunctionGranted: false,
        harmfulActDate: null,
        harmfulActRenews: false,
        harmfulActRenewalDays: null,
        harmfulActTermDays: null,
        harmfulActTermDayType: null,
        harmfulActDeadline: null,
        courtFeePaid: false,
      });
    });

    it('un dato de otro fuero responde 400 por campo y no guarda nada', async () => {
      const body = aCaseBody(
        { clientId, responsibleLawyerId: lawyerId },
        {
          jurisdiction: 'AMPARO',
          proceduralRole: 'ACTORA',
          subjectMatter: 'Que se ordene la cobertura integral del tratamiento.',
          clientDetained: true,
          administrativeRemedyExhaustedOn: '2026-08-10',
        },
      );

      const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

      expectError(res, 400, 'VALIDATION_ERROR', ['clientDetained', 'administrativeRemedyExhaustedOn']);
      expect(res.body.error.details).toEqual({
        clientDetained: 'Solo corresponde al fuero penal.',
        administrativeRemedyExhaustedOn: 'Solo corresponde al fuero administrativo.',
      });
      expect(await getPrisma().case.count()).toBe(0);
    });

    it('el acto lesivo incompleto informa los campos que faltan (el ejemplo del contrato)', async () => {
      const body = aCaseBody(
        { clientId, responsibleLawyerId: lawyerId },
        {
          jurisdiction: 'AMPARO',
          proceduralRole: 'ACTORA',
          subjectMatter: 'Que se ordene la cobertura integral del tratamiento.',
          clientDetained: true,
          harmfulActDate: '2026-08-28',
          harmfulActRenews: true,
          harmfulActTermDayType: 'BUSINESS',
        },
      );

      const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

      expectError(res, 400, 'VALIDATION_ERROR', ['harmfulActRenewalDays', 'harmfulActTermDays', 'clientDetained']);
      expect(res.body.error.details).toEqual({
        harmfulActRenewalDays: 'Indicá cada cuántos días se renueva el acto lesivo.',
        harmfulActTermDays: 'Indicá el plazo para presentar el amparo.',
        clientDetained: 'Solo corresponde al fuero penal.',
      });
      expect(await getPrisma().case.count()).toBe(0);
    });

    // El `message` y los `details` son para el usuario final: en castellano, nunca
    // el texto por defecto de `class-validator` ("clientDetained must be a boolean value").
    it.each([
      ['clientDetained', 'si', 'Debe ser true o false.'],
      ['courtFeePaid', 'si', 'Debe ser true o false.'],
      ['harmfulActTermDays', 'quince', 'Debe ser un número entero.'],
      ['harmfulActDate', 'no-es-fecha', 'Debe ser una fecha válida (AAAA-MM-DD).'],
      ['harmfulActTermDayType', 'HABILES', 'Debe ser BUSINESS o CONSECUTIVE.'],
      ['proceduralRole', 'DEFENSOR', 'No es un rol procesal válido.'],
      ['caption', 42, 'Debe ser un texto.'],
    ])('%s con un tipo inválido responde 400 sobre ese campo, en castellano', async (field, value, message) => {
      const body = aCaseBody({ clientId, responsibleLawyerId: lawyerId }, { [field]: value });

      const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

      expectError(res, 400, 'VALIDATION_ERROR', [field]);
      expect(res.body.error.message).toBe('Los datos enviados no son válidos.');
      expect(res.body.error.details).toEqual({ [field]: message });
      expect(await getPrisma().case.count()).toBe(0);
    });

    it('un campo que el contrato no define se rechaza en castellano', async () => {
      const body = { ...aCaseBody({ clientId, responsibleLawyerId: lawyerId }), caratula: 'GÓMEZ' };

      const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

      expectError(res, 400, 'VALIDATION_ERROR', ['caratula']);
      expect(res.body.error.details).toEqual({ caratula: 'No es un campo admitido.' });
    });

    // V4 §3.7: "Los errores de una calificación se informan sobre `legalQualifications`",
    // no sobre `legalQualifications.0.legalQualificationId`.
    it.each([
      ['no es un objeto', ['robo'], 'Cada calificación legal debe ser un objeto.'],
      [
        'tiene un identificador que no es entero',
        [{ legalQualificationId: 'uno', offenseDate: '2021-02-27' }],
        'Cada calificación legal requiere un identificador entero.',
      ],
      [
        'tiene una fecha del hecho inválida',
        [{ legalQualificationId: 1, offenseDate: 'no-es-fecha' }],
        'La fecha del hecho debe ser una fecha válida (AAAA-MM-DD).',
      ],
      [
        'trae un campo que el contrato no define',
        [{ legalQualificationId: 1, offenseDate: '2021-02-27', fecha: '2021-02-27' }],
        'Cada calificación legal solo admite legalQualificationId y offenseDate.',
      ],
    ])('una calificación que %s se informa sobre legalQualifications', async (_caso, legalQualifications, message) => {
      const body = { ...aCaseBody({ clientId, responsibleLawyerId: lawyerId }), legalQualifications };

      const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

      expectError(res, 400, 'VALIDATION_ERROR', ['legalQualifications']);
      expect(res.body.error.details).toEqual({ legalQualifications: message });
      expect(await getPrisma().case.count()).toBe(0);
    });

    it('una calificación sin fecha del hecho responde el texto del contrato', async () => {
      const qualification = await createLegalQualification();
      const body = aCaseBody(
        { clientId, responsibleLawyerId: lawyerId },
        { legalQualifications: [{ legalQualificationId: qualification.id }] },
      );

      const res = await request(app.getHttpServer()).post(URL).set(actor).send(body);

      expectError(res, 400, 'VALIDATION_ERROR', ['legalQualifications']);
      expect(res.body.error.details).toEqual({
        legalQualifications: 'Cada calificación legal requiere la fecha del hecho.',
      });
      expect(await getPrisma().case.count()).toBe(0);
    });
  });

  it('responde 401 sin token', async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .send(aCaseBody({ clientId, responsibleLawyerId: lawyerId }));

    expectError(res, 401, 'UNAUTHENTICATED');
    expect(res.body.error.message).toBe('La autenticación es requerida.');
    expect(await getPrisma().case.count()).toBe(0);
  });
});
