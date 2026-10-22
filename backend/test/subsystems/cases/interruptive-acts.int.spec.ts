import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { createCase } from '../../shared/factories/case.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import { createUser } from '../../shared/factories/user.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU31 Registrar actos interruptivos (contrato V4 §3.9):
 *   POST /cases/{caseId}/interruptive-acts
 *   GET  /cases/{caseId}/interruptive-acts
 * y su efecto sobre la prescripción, que se ve en GET /cases/{caseId}.
 *
 * "Hoy" es el martes 6/10/2026 (reloj fijo).
 */

const civil = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/**
 * Nombres propios de este spec. El factory numera desde 1 en cada archivo
 * ("Robo calificado 1…"), y el nombre es único entre las vigentes: si otro spec
 * deja las suyas en la base, el primero que repite un número choca con el
 * índice `legal_qualifications_name_active_key` según el orden de la suite.
 */
let qualificationSeq = 0;

/** Cuelga de la causa una calificación con su fecha del hecho, como la deja el alta (HU18). */
async function addOffense(caseId: number, offenseDate: string, prescriptionMonths: number) {
  qualificationSeq += 1;
  const qualification = await createLegalQualification({
    prescriptionMonths,
    name: `HU31 calificación ${qualificationSeq} — art. ${qualificationSeq} CP`,
  });
  await getPrisma().offense.create({
    data: {
      caseId,
      legalQualificationId: qualification.id,
      offenseDate: civil(offenseDate),
      // Lo que guarda el alta: hecho + meses. La lectura ya no lo usa (HU31).
      prescriptionDate: civil(offenseDate),
    },
  });
  return qualification;
}

describe('POST /api/v1/cases/:caseId/interruptive-acts', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;

  const url = (caseId: number | string = s.caseRow.id) => `/api/v1/cases/${caseId}/interruptive-acts`;
  const server = () => request(app.getHttpServer());
  const register = (
    body: Record<string, unknown>,
    actor: { Authorization: string } = s.responsible,
    caseId: number | string = s.caseRow.id,
  ) => server().post(url(caseId)).set(actor).send(body);
  const detail = async (caseId: number = s.caseRow.id) =>
    expectData<Record<string, any>>(await server().get(`/api/v1/cases/${caseId}`).set(s.notResponsible), 200);
  const qualificationOf = (caseBody: Record<string, any>, id: number) =>
    caseBody.legalQualifications.find((q: { id: number }) => q.id === id);

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
  });

  /** Las calificaciones que crea este spec; las causas y los hechos los borra `resetProceduralActData`. */
  const deleteOwnQualifications = () =>
    getPrisma().legalQualification.deleteMany({ where: { name: { startsWith: 'HU31 calificación' } } });

  afterAll(async () => {
    await resetProceduralActData();
    await deleteOwnQualifications();
    await stopTestApp();
  });

  beforeEach(async () => {
    s = await setUpProceduralActScenario();
    await deleteOwnQualifications();
  });

  // ── Alta ──────────────────────────────────────────────────────────

  // CA-31.1
  it('registra el acto y lo devuelve en la forma del contrato', async () => {
    const res = await register({ name: 'Citación a juicio', actDate: '2026-09-15', notes: 'Decreto de fs. 212.' });

    const data = expectData<Record<string, unknown>>(res, 201);
    expect(data).toEqual({
      id: expect.any(Number),
      caseId: s.caseRow.id,
      name: 'Citación a juicio',
      actDate: '2026-09-15',
      notes: 'Decreto de fs. 212.',
      registeredBy: { id: s.user.id, lastName: s.lawyer.lastName, firstName: s.lawyer.firstName },
      registeredAt: '2026-10-06T12:30:00-03:00',
    });

    const row = await getPrisma().interruptiveAct.findUniqueOrThrow({ where: { id: data.id as number } });
    expect(row).toMatchObject({
      caseId: s.caseRow.id,
      name: 'Citación a juicio',
      registeredByUserId: s.user.id,
      registeredByLawyerId: s.lawyer.id,
    });
  });

  // ── Efecto sobre la prescripción ──────────────────────────────────

  // CA-31.2
  it('reinicia la prescripción desde la fecha del acto y recalcula el vencimiento', async () => {
    const robo = await addOffense(s.caseRow.id, '2021-02-27', 96);
    expect(qualificationOf(await detail(), robo.id)).toMatchObject({
      prescriptionStartsOn: '2021-02-27',
      prescriptionExpiresOn: '2029-02-27',
    });

    expect((await detail()).prescription).toMatchObject({ startsOn: '2021-02-27', lastInterruptiveActDate: null });

    await register({ name: 'Indagatoria', actDate: '2024-07-04' }).expect(201);

    const body = await detail();
    expect(qualificationOf(body, robo.id)).toMatchObject({
      offenseDate: '2021-02-27',
      prescriptionStartsOn: '2024-07-04',
      prescriptionExpiresOn: '2032-07-04',
    });
    // Es la causa del ejemplo del contrato (V4 §3.7). Al 06/10/2026: 824 de 2922 días, 28 %.
    expect(body.prescription).toEqual({
      legalQualificationId: robo.id,
      legalQualificationName: robo.name,
      startsOn: '2024-07-04',
      expiresOn: '2032-07-04',
      elapsedPercentage: 28,
      alert: false,
      expired: false,
      lastInterruptiveActDate: '2024-07-04',
    });
  });

  // CA-31.3
  it('alcanza a todas las calificaciones de la causa', async () => {
    const robo = await addOffense(s.caseRow.id, '2021-02-27', 96);
    const amenazas = await addOffense(s.caseRow.id, '2022-01-31', 24);

    await register({ name: 'Indagatoria', actDate: '2024-07-04' }).expect(201);

    const body = await detail();
    expect(qualificationOf(body, robo.id).prescriptionExpiresOn).toBe('2032-07-04');
    expect(qualificationOf(body, amenazas.id)).toMatchObject({
      prescriptionStartsOn: '2024-07-04',
      prescriptionExpiresOn: '2026-07-04',
    });
    // Rige la que prescribe primero. Al 06/10/2026 su plazo ya se cumplió: sigue
    // mostrándose, con `expired`, hasta que alguien marque la causa (HU33).
    expect(body.prescription).toEqual({
      legalQualificationId: amenazas.id,
      legalQualificationName: amenazas.name,
      startsOn: '2024-07-04',
      expiresOn: '2026-07-04',
      elapsedPercentage: 100,
      alert: true,
      expired: true,
      lastInterruptiveActDate: '2024-07-04',
    });
  });

  // CA-31.4
  it('un acto con fecha anterior a otro ya registrado no cambia el cómputo', async () => {
    const robo = await addOffense(s.caseRow.id, '2021-02-27', 96);
    await register({ name: 'Indagatoria', actDate: '2024-07-04' }).expect(201);

    // Registrado después, pero con fecha anterior.
    await register({ name: 'Citación a juicio', actDate: '2023-03-01' }).expect(201);

    const body = await detail();
    expect(qualificationOf(body, robo.id).prescriptionStartsOn).toBe('2024-07-04');
    expect(body.prescription).toMatchObject({ startsOn: '2024-07-04', lastInterruptiveActDate: '2024-07-04' });
  });

  // CA-31.5
  it('una calificación con el hecho posterior al acto sigue contando desde su hecho', async () => {
    const robo = await addOffense(s.caseRow.id, '2021-02-27', 96);
    const posterior = await addOffense(s.caseRow.id, '2025-03-10', 24);

    await register({ name: 'Indagatoria', actDate: '2024-07-04' }).expect(201);

    const body = await detail();
    expect(qualificationOf(body, robo.id).prescriptionStartsOn).toBe('2024-07-04');
    expect(qualificationOf(body, posterior.id)).toMatchObject({
      offenseDate: '2025-03-10',
      prescriptionStartsOn: '2025-03-10',
      prescriptionExpiresOn: '2027-03-10',
    });
    // Vence antes (10/03/2027) y corre desde su hecho, no desde el acto: no hay acto que lo reinicie.
    expect(body.prescription).toMatchObject({
      legalQualificationId: posterior.id,
      startsOn: '2025-03-10',
      expiresOn: '2027-03-10',
      lastInterruptiveActDate: null,
    });
  });

  /** El listado de causas usa la misma lectura: tiene que mostrar lo mismo que el detalle. */
  it('el listado de causas muestra la prescripción reiniciada igual que el detalle', async () => {
    const robo = await addOffense(s.caseRow.id, '2021-02-27', 96);
    await register({ name: 'Indagatoria', actDate: '2024-07-04' }).expect(201);

    const listing = expectPaginated<Record<string, any>>(
      await server().get('/api/v1/cases').query({ clientId: s.client.id }).set(s.notResponsible),
    );
    const listed = listing.find((c) => c.id === s.caseRow.id)!;

    expect(qualificationOf(listed, robo.id).prescriptionStartsOn).toBe('2024-07-04');
    expect(listed.prescription).toEqual((await detail()).prescription);
    expect(listed.prescription).toMatchObject({ startsOn: '2024-07-04', lastInterruptiveActDate: '2024-07-04' });
  });

  // CA-31.6
  it('no mueve el estado ni el vencimiento de la causa', async () => {
    const before = (await detail()).currentState;

    await register({ name: 'Indagatoria', actDate: '2026-09-01' }).expect(201);

    expect((await detail()).currentState).toEqual(before);
  });

  // CA-31.7
  it('se registra en una causa penal sin calificaciones', async () => {
    expect((await detail()).legalQualifications).toEqual([]);

    await register({ name: 'Indagatoria', actDate: '2026-09-01' }).expect(201);
  });

  // ── Validación (CA-31.8) ──────────────────────────────────────────

  it.each([
    ['sin nombre', { actDate: '2026-09-01' }, 'name'],
    ['con nombre en blanco', { name: '   ', actDate: '2026-09-01' }, 'name'],
    ['con nombre de 256 caracteres', { name: 'A'.repeat(256), actDate: '2026-09-01' }, 'name'],
    ['sin fecha', { name: 'Indagatoria' }, 'actDate'],
    ['con fecha posterior a hoy', { name: 'Indagatoria', actDate: '2026-10-07' }, 'actDate'],
    ['con observaciones de 2001 caracteres', { name: 'Indagatoria', actDate: '2026-09-01', notes: 'x'.repeat(2001) }, 'notes'],
  ])('rechaza el alta %s nombrando el campo', async (_caso, body, campo) => {
    const res = await register(body);

    expectError(res, 400, 'VALIDATION_ERROR', [campo]);
    expect(await getPrisma().interruptiveAct.count()).toBe(0);
  });

  it('admite un nombre de 255 caracteres y un acto de hoy', async () => {
    await register({ name: 'A'.repeat(255), actDate: '2026-10-06' }).expect(201);
  });

  // ── Reglas de la causa ────────────────────────────────────────────

  // CA-31.9
  it('rechaza una causa que no es penal', async () => {
    const administrative = await createCase({
      clientId: s.client.id,
      responsibleLawyerId: s.lawyer.id,
      createdByUserId: s.user.id,
      jurisdiction: 'ADMINISTRATIVE',
    });

    const res = await register({ name: 'Indagatoria', actDate: '2026-09-01' }, s.responsible, administrative.id);

    expectError(res, 422, 'PRESCRIPTION_NOT_APPLICABLE');
    expect(await getPrisma().interruptiveAct.count()).toBe(0);
  });

  // CA-31.10
  it('rechaza una causa en estado terminal', async () => {
    const archived = await createCase({
      clientId: s.client.id,
      responsibleLawyerId: s.lawyer.id,
      createdByUserId: s.user.id,
      currentStateId: s.states.terminal.stateId,
    });

    const res = await register({ name: 'Indagatoria', actDate: '2026-09-01' }, s.responsible, archived.id);

    expectError(res, 422, 'CASE_IN_TERMINAL_STATE');
    expect(res.body.error.message).toBe('La causa se encuentra en un estado terminal y no admite esta operación.');
  });

  // CA-31.11
  it.each([
    ['otro abogado', () => s.notResponsible],
    ['un administrador con la ficha del responsable', () => s.administrator],
  ])('responde 403 a %s y no guarda nada', async (_caso, actor) => {
    const res = await register({ name: 'Indagatoria', actDate: '2026-09-01' }, actor());

    expectError(res, 403, 'FORBIDDEN');
    expect(res.body.error.message).toBe('Solo el abogado responsable de la causa puede registrar actos interruptivos.');
    expect(await getPrisma().interruptiveAct.count()).toBe(0);
  });

  // CA-31.14
  it('responde 404 para una causa inexistente', async () => {
    expectError(await register({ name: 'Indagatoria', actDate: '2026-09-01' }, s.responsible, 999999), 404, 'CASE_NOT_FOUND');
  });

  /** `CaseRepository.findById` no filtra `active`: el caso de uso lo verifica. */
  it('responde 404 para una causa dada de baja', async () => {
    await getPrisma().case.update({ where: { id: s.caseRow.id }, data: { active: false } });

    expectError(await register({ name: 'Indagatoria', actDate: '2026-09-01' }), 404, 'CASE_NOT_FOUND');
    expect(await getPrisma().interruptiveAct.count()).toBe(0);
  });

  it('rechaza un caseId que no es un entero', async () => {
    expectError(await register({ name: 'Indagatoria', actDate: '2026-09-01' }, s.responsible, 'abc'), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
  });

  // CA-31.15
  it('exige autenticación', async () => {
    await server().post(url()).send({ name: 'Indagatoria', actDate: '2026-09-01' }).expect(401);
  });
});

describe('GET /api/v1/cases/:caseId/interruptive-acts', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;
  const PASSWORD = 'password1';

  const url = (caseId: number | string = s.caseRow.id) => `/api/v1/cases/${caseId}/interruptive-acts`;
  const server = () => request(app.getHttpServer());
  const register = (name: string, actDate: string) =>
    server().post(url()).set(s.responsible).send({ name, actDate }).expect(201);

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
  });

  // `resetProceduralActData` ya borra los actos interruptivos (HU31).
  afterAll(async () => {
    await resetProceduralActData();
    await stopTestApp();
  });

  beforeEach(async () => {
    s = await setUpProceduralActScenario();
  });

  // CA-31.12
  it('lista del más reciente al más antiguo; en la misma fecha, el último registrado primero', async () => {
    await register('Indagatoria', '2024-07-04');
    await register('Citación a juicio', '2025-01-10');
    await register('Primero del día', '2024-12-01');
    await register('Segundo del día', '2024-12-01');

    const data = expectPaginated<{ name: string }>(await server().get(url()).set(s.notResponsible), { totalItems: 4 });

    expect(data.map((a) => a.name)).toEqual(['Citación a juicio', 'Segundo del día', 'Primero del día', 'Indagatoria']);
  });

  it('pagina contra la base', async () => {
    await register('A', '2024-01-01');
    await register('B', '2024-02-01');
    await register('C', '2024-03-01');

    const res = await server().get(url()).query({ page: 2, limit: 2 }).set(s.notResponsible);
    const data = expectPaginated<{ name: string }>(res, { page: 2, limit: 2, totalItems: 3, totalPages: 2 });

    expect(data.map((a) => a.name)).toEqual(['A']);
  });

  it('una causa sin actos interruptivos devuelve la colección vacía', async () => {
    expect(expectPaginated(await server().get(url()).set(s.notResponsible), { totalItems: 0 })).toEqual([]);
  });

  it('una causa que no es penal devuelve la colección vacía, sin error', async () => {
    const administrative = await createCase({
      clientId: s.client.id,
      responsibleLawyerId: s.lawyer.id,
      createdByUserId: s.user.id,
      jurisdiction: 'ADMINISTRATIVE',
    });

    expect(expectPaginated(await server().get(url(administrative.id)).set(s.notResponsible))).toEqual([]);
  });

  it.each([
    ['page', { page: 0 }],
    ['limit', { limit: 500 }],
  ])('rechaza %s fuera de rango con INVALID_PAGINATION', async (_campo, query) => {
    expectError(await server().get(url()).query(query).set(s.notResponsible), 400, 'INVALID_PAGINATION', ['page', 'limit']);
  });

  // CA-31.14
  it('responde 404 para una causa inexistente o dada de baja', async () => {
    expectError(await server().get(url(999999)).set(s.notResponsible), 404, 'CASE_NOT_FOUND');

    await getPrisma().case.update({ where: { id: s.caseRow.id }, data: { active: false } });
    expectError(await server().get(url()).set(s.notResponsible), 404, 'CASE_NOT_FOUND');
  });

  // CA-31.15
  it('exige autenticación', async () => {
    await server().get(url()).expect(401);
  });

  // CA-31.12, con login real: el que consulta no tiene por qué ser el responsable.
  it.each<TestRole>(['ADMINISTRATOR', 'LAWYER', 'SECRETARY'])('%s puede consultar', async (role) => {
    await register('Indagatoria', '2024-07-04');
    const lawyerId = role === 'LAWYER' ? (await createLawyer()).id : null;
    const user = await createUser({ roles: [role], lawyerId, passwordHash: await bcrypt.hash(PASSWORD, 4) });
    const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: PASSWORD });
    const auth = { Authorization: `Bearer ${login.body.data.accessToken}` };

    const res = await server().get(url()).set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('un token sin rol de abogado igual puede consultar', async () => {
    expect((await server().get(url()).set(loginAs({ roles: ['SECRETARY'] }))).status).toBe(200);
  });
});
