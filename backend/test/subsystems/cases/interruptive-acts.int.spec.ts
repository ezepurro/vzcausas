import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { TestRole } from '../../shared/auth/login-as';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import { createUser } from '../../shared/factories/user.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU31 Registrar actos interruptivos (`API_CONTRACT_V5.md` §3.9):
 *   POST /cases/{caseId}/interruptive-acts
 *   GET  /cases/{caseId}/interruptive-acts
 * y su efecto sobre la prescripción, que se ve en GET /cases/{caseId}.
 *
 * El cómputo fino de la prescripción (bordes, meses, la que prescribe primero) está en
 * los specs de `prescription.ts`; acá, el efecto de punta a punta. El 401 sin token
 * (CA-31.15) está en `test/smoke/app.int.spec.ts`.
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

let app: INestApplication;
let s: ProceduralActScenario;

const url = (caseId: number | string = s.caseRow.id) => `/api/v1/cases/${caseId}/interruptive-acts`;
const server = () => request(app.getHttpServer());
const register = (
  body: Record<string, unknown>,
  actor: { Authorization: string } = s.responsible,
  caseId: number | string = s.caseRow.id,
) => server().post(url(caseId)).set(actor).send(body);
const list = (caseId: number | string = s.caseRow.id) => server().get(url(caseId)).set(s.notResponsible);
const detail = async (caseId: number = s.caseRow.id) =>
  expectData<Record<string, any>>(await server().get(`/api/v1/cases/${caseId}`).set(s.notResponsible), 200);
const qualificationOf = (caseBody: Record<string, any>, id: number) =>
  caseBody.legalQualifications.find((q: { id: number }) => q.id === id);
const anAdministrativeCase = () =>
  createCase({
    clientId: s.client.id,
    responsibleLawyerId: s.lawyer.id,
    createdByUserId: s.user.id,
    jurisdiction: 'ADMINISTRATIVE',
  });

/** Las calificaciones que crea este spec; las causas y los hechos los borra `resetProceduralActData`. */
const deleteOwnQualifications = () =>
  getPrisma().legalQualification.deleteMany({ where: { name: { startsWith: 'HU31 calificación' } } });

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
});

describe('POST /api/v1/cases/:caseId/interruptive-acts', () => {
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

  /** CA-31.2. El listado de causas usa la misma lectura: tiene que mostrar lo mismo que el detalle. */
  it('reinicia la prescripción desde la fecha del acto, en el detalle y en el listado', async () => {
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
    // Es la causa del ejemplo del contrato (§3.7). Al 06/10/2026: 824 de 2922 días, 28 %.
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

    const listing = expectPaginated<Record<string, any>>(
      await server().get('/api/v1/cases').query({ clientId: s.client.id }).set(s.notResponsible),
    );
    const listed = listing.find((c) => c.id === s.caseRow.id)!;
    expect(qualificationOf(listed, robo.id).prescriptionStartsOn).toBe('2024-07-04');
    expect(listed.prescription).toEqual(body.prescription);
  });

  // CA-31.3. Las dos siguen corriendo a la fecha del acto: Amenazas vence el 31/01/2025
  // (D-113: una ya vencida no se reiniciaría, ver el test de CA-31.14).
  it('alcanza a todas las calificaciones de la causa', async () => {
    const robo = await addOffense(s.caseRow.id, '2021-02-27', 96);
    const amenazas = await addOffense(s.caseRow.id, '2023-01-31', 24);

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

  /**
   * CA-31.4: un acto registrado después pero con fecha anterior no cambia el cómputo.
   * CA-31.5: una calificación con el hecho posterior al acto sigue contando desde su hecho.
   */
  it('un acto con fecha anterior a otro no cambia el cómputo, y un hecho posterior al acto cuenta desde el hecho', async () => {
    const robo = await addOffense(s.caseRow.id, '2021-02-27', 96);
    const posterior = await addOffense(s.caseRow.id, '2025-03-10', 24);
    await register({ name: 'Indagatoria', actDate: '2024-07-04' }).expect(201);
    await register({ name: 'Citación a juicio', actDate: '2023-03-01' }).expect(201);

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

  /**
   * D-113, CA-31.14: un acto posterior al vencimiento de una calificación no la reinicia.
   * Plan: .claude/plans/tests-d113-prescripcion-por-delito.md. A (24 meses) vence el 10/01/2026;
   * C (72 meses) el 10/01/2030. El acto del 01/03/2026 sólo reinicia C: vence el 01/03/2032 y al
   * 06/10/2026 lleva 219 de 2192 días (10 %). A, vencida y sin declarar, sigue rigiendo (D-52).
   */
  it('un acto posterior al vencimiento de una calificación no la reinicia; las que corren, sí', async () => {
    const a = await addOffense(s.caseRow.id, '2024-01-10', 24);
    const c = await addOffense(s.caseRow.id, '2024-01-10', 72);

    await register({ name: 'Citación a juicio', actDate: '2026-03-01' }).expect(201);

    const body = await detail();
    expect(qualificationOf(body, a.id)).toMatchObject({
      prescriptionStartsOn: '2024-01-10',
      prescriptionExpiresOn: '2026-01-10',
      elapsedPercentage: 100,
      expired: true,
    });
    expect(qualificationOf(body, c.id)).toMatchObject({
      prescriptionStartsOn: '2026-03-01',
      prescriptionExpiresOn: '2032-03-01',
      elapsedPercentage: 10,
      alert: false,
      expired: false,
    });
    expect(body.prescription).toMatchObject({ legalQualificationId: a.id, lastInterruptiveActDate: null });

    // El acto no fija el cómputo de `prescription`: en la línea de vida no rige.
    const timelineRes = await server().get(`/api/v1/cases/${s.caseRow.id}/timeline`).set(s.notResponsible).expect(200);
    const timeline = timelineRes.body.data as Record<string, any>[];
    expect(timeline.find((entry) => entry.type === 'INTERRUPTIVE_ACT')).toMatchObject({ governsPrescription: false });
  });

  // CA-31.6 y CA-31.7
  it('se registra en una causa penal sin calificaciones y no mueve su estado ni su vencimiento', async () => {
    const before = await detail();
    expect(before.legalQualifications).toEqual([]);

    await register({ name: 'Indagatoria', actDate: '2026-09-01' }).expect(201);

    expect((await detail()).currentState).toEqual(before.currentState);
  });

  // ── Validación (CA-31.8) ──────────────────────────────────────────

  it('rechaza un alta inválida nombrando el campo, sin guardar nada; admite los bordes', async () => {
    const invalid: [body: Record<string, unknown>, field: string][] = [
      [{ actDate: '2026-09-01' }, 'name'],
      [{ name: '   ', actDate: '2026-09-01' }, 'name'],
      [{ name: 'A'.repeat(256), actDate: '2026-09-01' }, 'name'],
      [{ name: 'Indagatoria' }, 'actDate'],
      [{ name: 'Indagatoria', actDate: '2026-10-07' }, 'actDate'],
      [{ name: 'Indagatoria', actDate: '2026-09-01', notes: 'x'.repeat(2001) }, 'notes'],
    ];

    for (const [body, field] of invalid) {
      expectError(await register(body), 400, 'VALIDATION_ERROR', [field]);
    }
    expect(await getPrisma().interruptiveAct.count()).toBe(0);

    // Un nombre de 255 caracteres y un acto de hoy.
    await register({ name: 'A'.repeat(255), actDate: '2026-10-06' }).expect(201);
  });

  // ── Reglas de la causa ────────────────────────────────────────────

  // CA-31.9
  it('rechaza una causa que no es penal', async () => {
    const administrative = await anAdministrativeCase();

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

  // CA-31.11: ni otro abogado ni un administrador con la ficha del responsable.
  it('responde 403 a quien no es el abogado responsable y no guarda nada', async () => {
    for (const actor of [s.notResponsible, s.administrator]) {
      const res = await register({ name: 'Indagatoria', actDate: '2026-09-01' }, actor);

      expectError(res, 403, 'FORBIDDEN');
      expect(res.body.error.message).toBe('Solo el abogado responsable de la causa puede registrar actos interruptivos.');
    }
    expect(await getPrisma().interruptiveAct.count()).toBe(0);
  });

  /** CA-31.14. `CaseRepository.findById` no filtra `active`: el caso de uso lo verifica. */
  it('responde 404 para una causa inexistente o dada de baja, y 400 para un caseId no entero', async () => {
    const body = { name: 'Indagatoria', actDate: '2026-09-01' };
    expectError(await register(body, s.responsible, 999999), 404, 'CASE_NOT_FOUND');
    expectError(await register(body, s.responsible, 'abc'), 400, 'INVALID_PATH_PARAMETER', ['caseId']);

    await deactivateCase(s.caseRow.id);

    expectError(await register(body), 404, 'CASE_NOT_FOUND');
    expect(await getPrisma().interruptiveAct.count()).toBe(0);
  });
});

describe('GET /api/v1/cases/:caseId/interruptive-acts', () => {
  const PASSWORD = 'password1';
  const registerNamed = (name: string, actDate: string) => register({ name, actDate }).expect(201);

  // CA-31.12
  it('lista del más reciente al más antiguo; en la misma fecha, el último registrado primero', async () => {
    await registerNamed('Indagatoria', '2024-07-04');
    await registerNamed('Citación a juicio', '2025-01-10');
    await registerNamed('Primero del día', '2024-12-01');
    await registerNamed('Segundo del día', '2024-12-01');

    const data = expectPaginated<{ name: string }>(await list(), { totalItems: 4 });

    expect(data.map((a) => a.name)).toEqual(['Citación a juicio', 'Segundo del día', 'Primero del día', 'Indagatoria']);
  });

  it('sin actos, o en una causa que no es penal, la colección vacía; con actos, pagina contra la base', async () => {
    expect(expectPaginated(await list(), { totalItems: 0 })).toEqual([]);
    expect(expectPaginated(await list((await anAdministrativeCase()).id))).toEqual([]);

    await registerNamed('A', '2024-01-01');
    await registerNamed('B', '2024-02-01');
    await registerNamed('C', '2024-03-01');

    const res = await server().get(url()).query({ page: 2, limit: 2 }).set(s.notResponsible);
    const data = expectPaginated<{ name: string }>(res, { page: 2, limit: 2, totalItems: 3, totalPages: 2 });

    expect(data.map((a) => a.name)).toEqual(['A']);
  });

  it('rechaza una paginación fuera de rango con INVALID_PAGINATION', async () => {
    for (const query of [{ page: 0 }, { limit: 500 }]) {
      expectError(await server().get(url()).query(query).set(s.notResponsible), 400, 'INVALID_PAGINATION', ['page', 'limit']);
    }
  });

  // CA-31.14
  it('responde 404 para una causa inexistente o dada de baja', async () => {
    expectError(await list(999999), 404, 'CASE_NOT_FOUND');

    await deactivateCase(s.caseRow.id);
    expectError(await list(), 404, 'CASE_NOT_FOUND');
  });

  // CA-31.12, con login real: el que consulta no tiene por qué ser el responsable.
  it('cada rol puede consultar, aunque no sea el responsable', async () => {
    await registerNamed('Indagatoria', '2024-07-04');

    for (const role of ['ADMINISTRATOR', 'LAWYER', 'SECRETARY'] as TestRole[]) {
      const lawyerId = role === 'LAWYER' ? (await createLawyer()).id : null;
      const user = await createUser({ roles: [role], lawyerId, passwordHash: await bcrypt.hash(PASSWORD, 4) });
      const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: PASSWORD });
      const res = await server().get(url()).set({ Authorization: `Bearer ${login.body.data.accessToken}` });

      expect({ role, status: res.status, items: res.body.data?.length }).toEqual({ role, status: 200, items: 1 });
    }
  });
});
