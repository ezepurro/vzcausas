import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { startTestApp, stopTestApp, getPrisma } from '../../shared/harness/test-app';
import { expectData, expectError, expectNoContent, expectPaginated } from '../../shared/contract/envelopes';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import {
  aProceduralStateBody,
  createInitialState,
  createJurisdiction,
  createProceduralState,
} from '../../shared/factories/procedural-state.factory';
import { createCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createUser } from '../../shared/factories/user.factory';

const URL = '/api/v1/procedural-states';

/** Forma de los `GET` (`ProceduralStateWithActiveCases`). */
interface ProceduralStateBody {
  id: number;
  name: string;
  jurisdiction: string;
  timeLimitDays: number;
  dayType: string;
  terminal: boolean;
  activeCases: number;
  active: boolean;
}

/** Forma de `POST` y `PATCH` (`ProceduralState`): sin `activeCases`. */
type SavedProceduralStateBody = Omit<ProceduralStateBody, 'activeCases'>;

const WRITE_PERMISSIONS = ['procedural-state:create', 'procedural-state:update', 'procedural-state:delete'];

// Consultar estados está abierto a cualquier usuario autenticado: sin
// permisos en el token alcanza. Se usa un abogado para que quede claro
// que no hace falta ser administrador.
const reader = () => loginAs({ roles: ['LAWYER'] });

// La escritura es del Administrador (HU45, HU17, HU46): el token lleva los
// permisos que el seed le da a ese rol. Que el seed efectivamente se los dé
// lo prueba el `describe` de login real, al final.
const writer = () => loginAs({ roles: ['ADMINISTRATOR'], permissions: WRITE_PERMISSIONS });

let app: INestApplication;

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await stopTestApp();
});

beforeEach(async () => {
  const prisma = getPrisma();
  // Causas y actos referencian estados y fueros con `Restrict`: van
  // primero por si un spec vecino los dejó. La causa apunta a su acto
  // vigente, así que ese vínculo se suelta antes de borrar los actos.
  await prisma.offense.deleteMany();
  await prisma.case.updateMany({ data: { currentProceduralActId: null } });
  await prisma.proceduralAct.deleteMany();
  await prisma.case.deleteMany();
  await prisma.proceduralState.deleteMany(); // hija: referencia a jurisdictions
  await prisma.jurisdiction.deleteMany(); // padre
});

/** Cliente, abogado y usuario para colgarles causas. */
async function aCaseOwner() {
  const client = await createClient();
  const lawyer = await createLawyer();
  const user = await createUser();
  return { clientId: client.id, responsibleLawyerId: lawyer.id, createdByUserId: user.id, lawyerId: lawyer.id };
}

/**
 * Estado actual de la causa del cliente, leído de la base: id y nombre del
 * estado (por la FK, así que un renombrado se ve) y el vencimiento vigente,
 * `COALESCE(manual, calculado)`, como fecha civil.
 *
 * Se lee de la base porque `cases` hoy no expone una consulta de causas.
 * Cuando exista, conviene volver a verificarlo por la API.
 */
async function currentStateOfCase(clientId: number) {
  const kase = await getPrisma().case.findFirstOrThrow({
    where: { clientId },
    include: { currentState: true, currentProceduralAct: true },
  });
  const act = kase.currentProceduralAct;
  const due = act?.deadlineManualDueDate ?? act?.deadlineComputedDueDate ?? null;
  return {
    proceduralStateId: kase.currentStateId,
    name: kase.currentState?.name ?? null,
    dueDate: due === null ? null : due.toISOString().slice(0, 10),
  };
}

// Helpers locales, a propósito: `case.factory.ts` es de `cases` y solo crea
// causas en el estado inicial. Para verificar qué les pasa a las causas
// cuando se modifica o se da de baja un estado (CA-17.2, CA-17.3, CA-46.3,
// CA-46.4), la causa se crea con esa factory y se la lleva al estado con
// Prisma. Si `cases` agrega estas opciones a su factory, reemplazarlos.

/** PERSISTE una causa penal y la deja en `stateId`. */
async function createCaseInState(owner: Awaited<ReturnType<typeof aCaseOwner>>, stateId: number) {
  const kase = await createCase(owner);
  return getPrisma().case.update({ where: { id: kase.id }, data: { currentStateId: stateId } });
}

/**
 * PERSISTE un acto procesal que llevó la causa a `stateId` y lo deja como su
 * acto vigente, con un vencimiento ya calculado (`dueDate`, `YYYY-MM-DD`).
 * Los valores del plazo se guardan tal cual: lo que se verifica es que nada
 * los recalcule después.
 */
async function registerAct(
  owner: Awaited<ReturnType<typeof aCaseOwner>>,
  caseId: number,
  stateId: number,
  dueDate: string,
) {
  const actDate = new Date('2026-09-01T00:00:00.000Z');
  const act = await getPrisma().proceduralAct.create({
    data: {
      caseId,
      proceduralStateId: stateId,
      actDate,
      deadlineTimeLimitDays: 5,
      deadlineDayType: 'BUSINESS',
      deadlineCountsFrom: actDate,
      deadlineComputedDueDate: new Date(`${dueDate}T00:00:00.000Z`),
      registeredByUserId: owner.createdByUserId,
      registeredByLawyerId: owner.lawyerId,
    },
  });
  await getPrisma().case.update({
    where: { id: caseId },
    data: { currentProceduralActId: act.id, currentStateId: stateId },
  });
  return act;
}

describe('GET /api/v1/procedural-states', () => {
  const get = (query = '') => request(app.getHttpServer()).get(`${URL}${query}`).set(reader());

  // ── Contrato ──────────────────────────────────────────────────────

  it('devuelve el sobre paginado con cada estado en la forma del contrato', async () => {
    const saved = await createProceduralState({
      jurisdiction: 'CRIMINAL',
      name: 'Oposición al requerimiento de elevación',
      timeLimitDays: 5,
      dayType: 'BUSINESS',
      terminal: false,
    });

    const res = await get();

    const data = expectPaginated<ProceduralStateBody>(res, { page: 1, limit: 20, totalItems: 1, totalPages: 1 });
    expect(data).toEqual([
      {
        id: saved.stateId,
        name: 'Oposición al requerimiento de elevación',
        jurisdiction: 'CRIMINAL',
        timeLimitDays: 5,
        dayType: 'BUSINESS',
        terminal: false,
        activeCases: 0,
        active: true,
      },
    ]);
  });

  it('devuelve una colección vacía cuando no hay estados cargados', async () => {
    const res = await get();

    const data = expectPaginated(res, { totalItems: 0, totalPages: 0 });
    expect(data).toEqual([]);
  });

  it('informa un estado sin plazo con 0 días y tipo NONE', async () => {
    await createProceduralState({ name: 'Archivada', timeLimitDays: 0, terminal: true });

    const res = await get();

    const [state] = expectPaginated<ProceduralStateBody>(res);
    expect(state).toMatchObject({ timeLimitDays: 0, dayType: 'NONE', terminal: true });
  });

  // ── Autenticación ─────────────────────────────────────────────────

  it('responde 401 sin token', async () => {
    const res = await request(app.getHttpServer()).get(URL);

    expectError(res, 401, 'UNAUTHENTICATED');
  });

  // ── Comunicación con la base ──────────────────────────────────────

  it('devuelve los estados tal como están guardados, con su fuero', async () => {
    const criminal = await createProceduralState({ jurisdiction: 'CRIMINAL' });
    const amparo = await createProceduralState({ jurisdiction: 'AMPARO' });

    const res = await get();

    const data = expectPaginated<ProceduralStateBody>(res, { totalItems: 2 });
    const byId = new Map(data.map((s) => [s.id, s]));
    expect(byId.get(criminal.stateId)).toMatchObject({ name: criminal.name, jurisdiction: 'CRIMINAL' });
    expect(byId.get(amparo.stateId)).toMatchObject({ name: amparo.name, jurisdiction: 'AMPARO' });
  });

  it('pagina contra la base', async () => {
    await createProceduralState();
    await createProceduralState();
    const third = await createProceduralState();

    const res = await get('?page=2&limit=2');

    const data = expectPaginated<ProceduralStateBody>(res, { page: 2, limit: 2, totalItems: 3, totalPages: 2 });
    expect(data.map((s) => s.id)).toEqual([third.stateId]);
  });

  it.each(['CRIMINAL', 'criminal'])('filtra por fuero (?jurisdiction=%s)', async (jurisdiction) => {
    const criminal = await createProceduralState({ jurisdiction: 'CRIMINAL' });
    await createProceduralState({ jurisdiction: 'ADMINISTRATIVE' });

    const res = await get(`?jurisdiction=${jurisdiction}`);

    const data = expectPaginated<ProceduralStateBody>(res, { totalItems: 1 });
    expect(data.map((s) => s.id)).toEqual([criminal.stateId]);
  });

  it('filtra por nombre sin distinguir mayúsculas', async () => {
    const match = await createProceduralState({ name: 'Notificación de OFICIO' });
    await createProceduralState({ name: 'Archivada' });

    const res = await get('?search=ofic');

    const data = expectPaginated<ProceduralStateBody>(res, { totalItems: 1 });
    expect(data.map((s) => s.id)).toEqual([match.stateId]);
  });

  it('no lista los estados dados de baja', async () => {
    const active = await createProceduralState();
    await createProceduralState({ isActive: false });

    const res = await get();

    const data = expectPaginated<ProceduralStateBody>(res, { totalItems: 1 });
    expect(data.map((s) => s.id)).toEqual([active.stateId]);
  });

  // El contrato: "El estado inicial 'Iniciada' no forma parte del listado".
  it('no lista el estado inicial "Iniciada"', async () => {
    await createInitialState('CRIMINAL');
    const regular = await createProceduralState({ jurisdiction: 'CRIMINAL' });

    const res = await get();

    const data = expectPaginated<ProceduralStateBody>(res, { totalItems: 1 });
    expect(data.map((s) => s.id)).toEqual([regular.stateId]);
  });

  // Los estados no tienen posición: se listan por fuero y, dentro de cada
  // fuero, en el orden en que se registraron (`id` ascendente).
  it('ordena por fuero y, dentro de cada fuero, por orden de registro', async () => {
    const criminalFirst = await createProceduralState({ jurisdiction: 'CRIMINAL' });
    const administrative = await createProceduralState({ jurisdiction: 'ADMINISTRATIVE' });
    const criminalSecond = await createProceduralState({ jurisdiction: 'CRIMINAL' });

    const res = await get();

    const data = expectPaginated<ProceduralStateBody>(res);
    expect(data.map((s) => s.id)).toEqual([administrative.stateId, criminalFirst.stateId, criminalSecond.stateId]);
  });

  // ── Errores ───────────────────────────────────────────────────────
  //
  // La paginación tiene su propio código, `INVALID_PAGINATION`, como pide el
  // contrato (§5.3). Lo resuelve el `exceptionFactory` global cuando **todo**
  // lo que falla es paginación (`app.setup.ts`), así que vale para los cuatro
  // listados del backend. Era la "decisión del equipo pendiente" que estaba
  // anotada acá; se tomó el 08/10/2026.
  //
  // El resto sigue siendo el `VALIDATION_ERROR` genérico del ValidationPipe,
  // con `details` indexado por campo.

  it.each([
    ['fuero inexistente', '?jurisdiction=FOO', 'jurisdiction'],
    ['parámetro desconocido', '?foo=1', 'foo'],
  ])('responde 400 VALIDATION_ERROR ante %s', async (_case, query, field) => {
    const res = await get(query);

    expectError(res, 400, 'VALIDATION_ERROR', [field]);
  });

  // `details` nombra los dos parámetros, como el ejemplo del contrato.
  it.each([
    ['página menor a 1', '?page=0'],
    ['límite mayor a 100', '?limit=101'],
  ])('responde 400 INVALID_PAGINATION ante %s', async (_case, query) => {
    const res = await get(query);

    expectError(res, 400, 'INVALID_PAGINATION', ['page', 'limit']);
  });
});

describe('POST /api/v1/procedural-states', () => {
  const post = (body: object, auth = writer()) => request(app.getHttpServer()).post(URL).set(auth).send(body);

  beforeEach(async () => {
    await createJurisdiction('CRIMINAL');
    await createJurisdiction('AMPARO');
  });

  // ── CA-45.1 · Alta exitosa ────────────────────────────────────────

  it('registra el estado y responde 201 con la forma del contrato, sin activeCases', async () => {
    const res = await post(aProceduralStateBody({ name: 'Oposición al requerimiento de elevación' }));

    const data = expectData<SavedProceduralStateBody>(res, 201);
    expect(data).toEqual({
      id: expect.any(Number),
      name: 'Oposición al requerimiento de elevación',
      jurisdiction: 'CRIMINAL',
      timeLimitDays: 5,
      dayType: 'BUSINESS',
      terminal: false,
      active: true,
    });
  });

  it('lo persiste en el fuero y queda disponible en su tabla', async () => {
    const res = await post(aProceduralStateBody({ name: 'Citación a juicio', terminal: true }));
    const { id } = expectData<SavedProceduralStateBody>(res, 201);

    const row = await getPrisma().proceduralState.findUnique({ where: { stateId: id }, include: { jurisdiction: true } });
    expect(row).toMatchObject({
      name: 'Citación a juicio',
      timeLimitDays: 5,
      dayType: 'BUSINESS',
      terminal: true,
      isActive: true,
      isInitial: false,
    });
    expect(row?.jurisdiction.name).toBe('CRIMINAL');

    const list = await request(app.getHttpServer()).get(`${URL}?jurisdiction=CRIMINAL`).set(reader());
    expect(expectPaginated<ProceduralStateBody>(list).map((s) => s.id)).toEqual([id]);
  });

  it('recorta los espacios de la denominación', async () => {
    const res = await post(aProceduralStateBody({ name: '  Archivada  ', timeLimitDays: 0, dayType: 'NONE' }));

    expect(expectData<SavedProceduralStateBody>(res, 201).name).toBe('Archivada');
  });

  // ── CA-45.5 · Estado sin plazo (y valores por defecto del contrato) ──

  it('sin plazo ni tipo de día ni terminal, aplica los valores por defecto: 0 días, NONE, no terminal', async () => {
    const res = await post({ name: 'Archivada', jurisdiction: 'CRIMINAL' });

    expect(expectData<SavedProceduralStateBody>(res, 201)).toMatchObject({
      timeLimitDays: 0,
      dayType: 'NONE',
      terminal: false,
    });
  });

  it('registra un estado con 0 días y tipo NONE', async () => {
    const res = await post(aProceduralStateBody({ name: 'Archivada', timeLimitDays: 0, dayType: 'NONE', terminal: true }));

    expect(expectData<SavedProceduralStateBody>(res, 201)).toMatchObject({ timeLimitDays: 0, dayType: 'NONE' });
  });

  // ── CA-45.2 · Denominación única por fuero ────────────────────────

  it('rechaza con 409 una denominación ya registrada en el fuero, sin distinguir mayúsculas, y no guarda otra', async () => {
    await createProceduralState({ jurisdiction: 'CRIMINAL', name: 'Archivada', timeLimitDays: 0 });

    const res = await post(aProceduralStateBody({ name: 'ARCHIVADA' }));

    expectError(res, 409, 'PROCEDURAL_STATE_ALREADY_EXISTS');
    expect(await getPrisma().proceduralState.count({ where: { name: { equals: 'archivada', mode: 'insensitive' } } })).toBe(1);
  });

  it('acepta la misma denominación en otro fuero', async () => {
    await createProceduralState({ jurisdiction: 'CRIMINAL', name: 'Archivada', timeLimitDays: 0 });

    const res = await post(aProceduralStateBody({ name: 'Archivada', jurisdiction: 'AMPARO', timeLimitDays: 0, dayType: 'NONE' }));

    expect(expectData<SavedProceduralStateBody>(res, 201).jurisdiction).toBe('AMPARO');
  });

  it('acepta la denominación de un estado dado de baja', async () => {
    await createProceduralState({ jurisdiction: 'CRIMINAL', name: 'Archivada', timeLimitDays: 0, isActive: false });

    const res = await post(aProceduralStateBody({ name: 'Archivada', timeLimitDays: 0, dayType: 'NONE' }));

    expectData(res, 201);
  });

  it('ante dos altas simultáneas con la misma denominación, registra una y rechaza la otra con 409', async () => {
    const body = aProceduralStateBody({ name: 'Concurrente' });

    const responses = await Promise.all([post(body), post(body)]);

    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await getPrisma().proceduralState.count({ where: { name: 'Concurrente' } })).toBe(1);
  });

  // ── CA-45.3 · Coherencia entre plazo y tipo de día ────────────────

  it.each([
    ['0 días con BUSINESS', 0, 'BUSINESS'],
    ['0 días con CONSECUTIVE', 0, 'CONSECUTIVE'],
    ['5 días con NONE', 5, 'NONE'],
  ] as const)('rechaza con 400 sobre dayType: %s', async (_case, timeLimitDays, dayType) => {
    const res = await post(aProceduralStateBody({ timeLimitDays, dayType }));

    expectError(res, 400, 'VALIDATION_ERROR', ['dayType']);
    expect(await getPrisma().proceduralState.count()).toBe(0);
  });

  it('con días mayores a 0 y sin tipo de día, rechaza con el mensaje del contrato', async () => {
    const res = await post({ name: 'Citación', jurisdiction: 'CRIMINAL', timeLimitDays: 5 });

    expectError(res, 400, 'VALIDATION_ERROR', ['dayType']);
    expect(res.body.error.details.dayType).toBe('Debe indicarse el tipo de día cuando el plazo es mayor a 0.');
  });

  // ── CA-45.4 · Denominación reservada ──────────────────────────────

  it.each(['CRIMINAL', 'AMPARO'] as const)('rechaza con 409 "Iniciada" en %s', async (jurisdiction) => {
    await createInitialState(jurisdiction);

    const res = await post(aProceduralStateBody({ name: 'iniciada', jurisdiction, timeLimitDays: 0, dayType: 'NONE' }));

    expectError(res, 409, 'PROCEDURAL_STATE_ALREADY_EXISTS');
  });

  // ── Datos inválidos ───────────────────────────────────────────────

  it.each([
    ['denominación vacía', { name: '' }, 'name'],
    ['denominación de puros espacios', { name: '   ' }, 'name'],
    ['sin denominación', { name: undefined }, 'name'],
    ['fuero inexistente', { jurisdiction: 'FOO' }, 'jurisdiction'],
    ['sin fuero', { jurisdiction: undefined }, 'jurisdiction'],
    ['plazo negativo', { timeLimitDays: -1 }, 'timeLimitDays'],
    ['plazo no entero', { timeLimitDays: 1.5 }, 'timeLimitDays'],
    ['plazo como texto', { timeLimitDays: '5' }, 'timeLimitDays'],
    ['tipo de día inexistente', { dayType: 'WEEKLY' }, 'dayType'],
    ['terminal no booleano', { terminal: 'si' }, 'terminal'],
    ['terminal en null', { terminal: null }, 'terminal'],
    ['un campo que el contrato no define', { position: 1 }, 'position'],
  ])('responde 400 ante %s', async (_case, overrides, field) => {
    const res = await post({ ...aProceduralStateBody(), ...overrides });

    expectError(res, 400, 'VALIDATION_ERROR', [field]);
  });

  it('responde 400 sobre jurisdiction si el fuero no está en el catálogo', async () => {
    const res = await post(aProceduralStateBody({ jurisdiction: 'ADMINISTRATIVE' }));

    expectError(res, 400, 'VALIDATION_ERROR', ['jurisdiction']);
  });

  // ── CA-45.6 · Perfil no habilitado ────────────────────────────────

  it('responde 401 sin token', async () => {
    const res = await request(app.getHttpServer()).post(URL).send(aProceduralStateBody());

    expectError(res, 401, 'UNAUTHENTICATED');
  });

  it.each<TestRole>(['LAWYER', 'SECRETARY'])('responde 403 a un %s y no registra nada', async (role) => {
    const res = await post(aProceduralStateBody(), loginAs({ roles: [role] }));

    expectError(res, 403, 'FORBIDDEN');
    expect(await getPrisma().proceduralState.count()).toBe(0);
  });
});

describe('GET /api/v1/procedural-states/:stateId', () => {
  const getById = (id: number | string, auth = reader()) =>
    request(app.getHttpServer()).get(`${URL}/${id}`).set(auth);

  it('responde 200 con el estado en la forma del contrato, con activeCases', async () => {
    const saved = await createProceduralState({ name: 'Citación a juicio', timeLimitDays: 5, dayType: 'CONSECUTIVE' });

    const res = await getById(saved.stateId);

    expect(expectData<ProceduralStateBody>(res, 200)).toEqual({
      id: saved.stateId,
      name: 'Citación a juicio',
      jurisdiction: 'CRIMINAL',
      timeLimitDays: 5,
      dayType: 'CONSECUTIVE',
      terminal: false,
      activeCases: 0,
      active: true,
    });
  });

  it.each<TestRole>(['ADMINISTRATOR', 'LAWYER', 'SECRETARY'])('lo puede consultar un %s', async (role) => {
    const saved = await createProceduralState();

    const res = await getById(saved.stateId, loginAs({ roles: [role] }));

    expectData(res, 200);
  });

  it('responde 404 si no existe', async () => {
    expectError(await getById(999999), 404, 'PROCEDURAL_STATE_NOT_FOUND');
  });

  it('responde 404 si fue dado de baja (CA-46.2)', async () => {
    const deactivated = await createProceduralState({ isActive: false });

    expectError(await getById(deactivated.stateId), 404, 'PROCEDURAL_STATE_NOT_FOUND');
  });

  it('responde 404 con el identificador del estado inicial "Iniciada"', async () => {
    const initial = await createInitialState('CRIMINAL');

    expectError(await getById(initial.stateId), 404, 'PROCEDURAL_STATE_NOT_FOUND');
  });

  it.each(['abc', '0', '-1', '1.5'])('responde 400 INVALID_PATH_PARAMETER con /%s', async (id) => {
    expectError(await getById(id), 400, 'INVALID_PATH_PARAMETER', ['stateId']);
  });

  it('responde 401 sin token', async () => {
    const saved = await createProceduralState();

    expectError(await request(app.getHttpServer()).get(`${URL}/${saved.stateId}`), 401, 'UNAUTHENTICATED');
  });
});

describe('PATCH /api/v1/procedural-states/:stateId', () => {
  const patch = (id: number | string, body: object, auth = writer()) =>
    request(app.getHttpServer()).patch(`${URL}/${id}`).set(auth).send(body);

  // ── CA-17.1 · Modificación exitosa ────────────────────────────────

  it('modifica todos los campos, responde 200 sin activeCases y lo persiste', async () => {
    const saved = await createProceduralState({ name: 'Citación', timeLimitDays: 5, dayType: 'BUSINESS' });

    const res = await patch(saved.stateId, { name: 'Citación a juicio', timeLimitDays: 10, dayType: 'CONSECUTIVE', terminal: true });

    expect(expectData<SavedProceduralStateBody>(res, 200)).toEqual({
      id: saved.stateId,
      name: 'Citación a juicio',
      jurisdiction: 'CRIMINAL',
      timeLimitDays: 10,
      dayType: 'CONSECUTIVE',
      terminal: true,
      active: true,
    });
    expect(await getPrisma().proceduralState.findUnique({ where: { stateId: saved.stateId } })).toMatchObject({
      name: 'Citación a juicio',
      timeLimitDays: 10,
      dayType: 'CONSECUTIVE',
      terminal: true,
    });
  });

  it('modifica un solo campo y deja los demás como estaban', async () => {
    const saved = await createProceduralState({ name: 'Citación', timeLimitDays: 5, dayType: 'BUSINESS' });

    const res = await patch(saved.stateId, { dayType: 'CONSECUTIVE' });

    expect(expectData<SavedProceduralStateBody>(res, 200)).toMatchObject({
      name: 'Citación',
      timeLimitDays: 5,
      dayType: 'CONSECUTIVE',
      terminal: false,
    });
  });

  it('pasa un estado a "sin plazo" enviando 0 días y NONE juntos', async () => {
    const saved = await createProceduralState({ timeLimitDays: 5, dayType: 'BUSINESS' });

    const res = await patch(saved.stateId, { timeLimitDays: 0, dayType: 'NONE' });

    expect(expectData<SavedProceduralStateBody>(res, 200)).toMatchObject({ timeLimitDays: 0, dayType: 'NONE' });
  });

  // ── CA-17.2 · Efecto del renombrado ───────────────────────────────

  it('el nombre nuevo se refleja en las causas que tienen el estado', async () => {
    const owner = await aCaseOwner();
    const saved = await createProceduralState({ name: 'Citación' });
    await createCaseInState(owner, saved.stateId);

    await patch(saved.stateId, { name: 'Citación a juicio' }).expect(200);

    expect(await currentStateOfCase(owner.clientId)).toMatchObject({
      proceduralStateId: saved.stateId,
      name: 'Citación a juicio',
    });
  });

  // ── CA-17.3 · Efecto del cambio de plazo ──────────────────────────

  it('no recalcula los vencimientos ya registrados', async () => {
    const owner = await aCaseOwner();
    const saved = await createProceduralState({ timeLimitDays: 5, dayType: 'BUSINESS' });
    const kase = await createCase(owner);
    const act = await registerAct(owner, kase.id, saved.stateId, '2026-09-08');

    await patch(saved.stateId, { timeLimitDays: 20, dayType: 'CONSECUTIVE' }).expect(200);

    expect(await getPrisma().proceduralAct.findUnique({ where: { id: act.id } })).toMatchObject({
      deadlineTimeLimitDays: 5,
      deadlineDayType: 'BUSINESS',
      deadlineComputedDueDate: new Date('2026-09-08T00:00:00.000Z'),
    });
    expect((await currentStateOfCase(owner.clientId)).dueDate).toBe('2026-09-08');
  });

  // ── CA-17.4 · Fuero no modificable (contrato V3, D-36) ────────────

  it.each(['AMPARO', 'CRIMINAL'])(
    'rechaza con 400 sobre jurisdiction aunque se envíe el mismo fuero (%s), y no modifica nada',
    async (jurisdiction) => {
      const saved = await createProceduralState({ jurisdiction: 'CRIMINAL', name: 'Citación' });

      const res = await patch(saved.stateId, { name: 'Otro nombre', jurisdiction });

      expectError(res, 400, 'VALIDATION_ERROR', ['jurisdiction']);
      expect(res.body.error.details.jurisdiction).toBe('El fuero de un estado procesal no se puede modificar.');
      expect(await getPrisma().proceduralState.findUnique({ where: { stateId: saved.stateId } })).toMatchObject({
        name: 'Citación',
        jurisdictionId: saved.jurisdictionId,
      });
    },
  );

  // ── CA-17.5 · Denominación única por fuero ────────────────────────

  it('rechaza con 409 una denominación de otro estado del fuero', async () => {
    await createProceduralState({ name: 'Archivada', timeLimitDays: 0 });
    const saved = await createProceduralState({ name: 'Citación' });

    const res = await patch(saved.stateId, { name: 'archivada' });

    expectError(res, 409, 'PROCEDURAL_STATE_ALREADY_EXISTS');
    expect((await getPrisma().proceduralState.findUnique({ where: { stateId: saved.stateId } }))?.name).toBe('Citación');
  });

  it('permite renombrar un estado a sí mismo con otras mayúsculas', async () => {
    const saved = await createProceduralState({ name: 'Archivada', timeLimitDays: 0 });

    const res = await patch(saved.stateId, { name: 'ARCHIVADA' });

    expect(expectData<SavedProceduralStateBody>(res, 200).name).toBe('ARCHIVADA');
  });

  it('acepta una denominación que existe en otro fuero', async () => {
    await createProceduralState({ jurisdiction: 'AMPARO', name: 'Archivada', timeLimitDays: 0 });
    const saved = await createProceduralState({ jurisdiction: 'CRIMINAL', name: 'Citación' });

    expectData(await patch(saved.stateId, { name: 'Archivada' }), 200);
  });

  it('rechaza con 409 renombrar a "Iniciada"', async () => {
    await createInitialState('CRIMINAL');
    const saved = await createProceduralState({ name: 'Citación' });

    expectError(await patch(saved.stateId, { name: 'Iniciada' }), 409, 'PROCEDURAL_STATE_ALREADY_EXISTS');
  });

  // ── CA-17.6 · Coherencia entre plazo y tipo de día ────────────────

  it.each([
    ['0 días sobre un estado BUSINESS', { timeLimitDays: 0 }, 'Debe ser NONE cuando el plazo es 0.'],
    ['NONE sobre un estado de 5 días', { dayType: 'NONE' }, 'Debe indicarse el tipo de día cuando el plazo es mayor a 0.'],
    ['0 días con CONSECUTIVE', { timeLimitDays: 0, dayType: 'CONSECUTIVE' }, 'Debe ser NONE cuando el plazo es 0.'],
  ])('rechaza con 400 sobre dayType: %s, y no modifica nada', async (_case, body, message) => {
    const saved = await createProceduralState({ timeLimitDays: 5, dayType: 'BUSINESS' });

    const res = await patch(saved.stateId, body);

    expectError(res, 400, 'VALIDATION_ERROR', ['dayType']);
    expect(res.body.error.details.dayType).toBe(message);
    expect(await getPrisma().proceduralState.findUnique({ where: { stateId: saved.stateId } })).toMatchObject({
      timeLimitDays: 5,
      dayType: 'BUSINESS',
    });
  });

  // ── Cuerpo, identificador y destino inválidos ─────────────────────

  it('responde 400 con un cuerpo vacío', async () => {
    const saved = await createProceduralState();

    expectError(await patch(saved.stateId, {}), 400, 'VALIDATION_ERROR', ['body']);
  });

  it.each([
    ['denominación vacía', { name: '' }, 'name'],
    ['plazo negativo', { timeLimitDays: -1 }, 'timeLimitDays'],
    ['tipo de día inexistente', { dayType: 'WEEKLY' }, 'dayType'],
    ['terminal en null', { terminal: null }, 'terminal'],
    ['un campo que el contrato no define', { position: 2 }, 'position'],
  ])('responde 400 ante %s', async (_case, body, field) => {
    const saved = await createProceduralState();

    expectError(await patch(saved.stateId, body), 400, 'VALIDATION_ERROR', [field]);
  });

  it('responde 404 si no existe', async () => {
    expectError(await patch(999999, { terminal: true }), 404, 'PROCEDURAL_STATE_NOT_FOUND');
  });

  it('responde 404 si fue dado de baja', async () => {
    const deactivated = await createProceduralState({ isActive: false });

    expectError(await patch(deactivated.stateId, { terminal: true }), 404, 'PROCEDURAL_STATE_NOT_FOUND');
  });

  it('responde 404 con "Iniciada" y no la modifica', async () => {
    const initial = await createInitialState('CRIMINAL');

    expectError(await patch(initial.stateId, { terminal: true }), 404, 'PROCEDURAL_STATE_NOT_FOUND');
    expect((await getPrisma().proceduralState.findUnique({ where: { stateId: initial.stateId } }))?.terminal).toBe(false);
  });

  it('responde 400 INVALID_PATH_PARAMETER con /abc', async () => {
    expectError(await patch('abc', { terminal: true }), 400, 'INVALID_PATH_PARAMETER', ['stateId']);
  });

  // ── CA-17.7 · Perfil no habilitado ────────────────────────────────

  it('responde 401 sin token', async () => {
    const saved = await createProceduralState();

    const res = await request(app.getHttpServer()).patch(`${URL}/${saved.stateId}`).send({ terminal: true });

    expectError(res, 401, 'UNAUTHENTICATED');
  });

  it.each<TestRole>(['LAWYER', 'SECRETARY'])('responde 403 a un %s y no modifica nada', async (role) => {
    const saved = await createProceduralState({ name: 'Citación' });

    const res = await patch(saved.stateId, { name: 'Otro nombre' }, loginAs({ roles: [role] }));

    expectError(res, 403, 'FORBIDDEN');
    expect((await getPrisma().proceduralState.findUnique({ where: { stateId: saved.stateId } }))?.name).toBe('Citación');
  });
});

describe('DELETE /api/v1/procedural-states/:stateId', () => {
  const del = (id: number | string, auth = writer()) => request(app.getHttpServer()).delete(`${URL}/${id}`).set(auth);

  // ── CA-46.1 / CA-46.2 · Baja exitosa y lógica ─────────────────────

  it('responde 204 sin cuerpo y conserva el registro inactivo', async () => {
    const saved = await createProceduralState();

    expectNoContent(await del(saved.stateId));

    expect(await getPrisma().proceduralState.findUnique({ where: { stateId: saved.stateId } })).toMatchObject({
      name: saved.name,
      isActive: false,
    });
  });

  it('deja de aparecer en el listado del fuero y en la consulta por id', async () => {
    const kept = await createProceduralState();
    const dropped = await createProceduralState();

    await del(dropped.stateId).expect(204);

    const list = await request(app.getHttpServer()).get(`${URL}?jurisdiction=CRIMINAL`).set(reader());
    expect(expectPaginated<ProceduralStateBody>(list).map((s) => s.id)).toEqual([kept.stateId]);
    const one = await request(app.getHttpServer()).get(`${URL}/${dropped.stateId}`).set(reader());
    expectError(one, 404, 'PROCEDURAL_STATE_NOT_FOUND');
  });

  it('no puede reactivarse: la segunda baja responde 404', async () => {
    const saved = await createProceduralState();
    await del(saved.stateId).expect(204);

    expectError(await del(saved.stateId), 404, 'PROCEDURAL_STATE_NOT_FOUND');
  });

  it('permite volver a registrar un estado con la misma denominación', async () => {
    const saved = await createProceduralState({ name: 'Archivada', timeLimitDays: 0 });
    await del(saved.stateId).expect(204);

    const res = await request(app.getHttpServer())
      .post(URL)
      .set(writer())
      .send(aProceduralStateBody({ name: 'Archivada', timeLimitDays: 0, dayType: 'NONE' }));

    expect(expectData<SavedProceduralStateBody>(res, 201).id).not.toBe(saved.stateId);
  });

  // ── CA-46.3 / CA-46.4 · Causas en el estado dado de baja ──────────

  it('procede con causas en el estado, que lo conservan con su denominación y su vencimiento', async () => {
    const owner = await aCaseOwner();
    const saved = await createProceduralState({ name: 'Citación a juicio' });
    const kase = await createCase(owner);
    await registerAct(owner, kase.id, saved.stateId, '2026-09-08');

    expectNoContent(await del(saved.stateId));

    expect(await currentStateOfCase(owner.clientId)).toMatchObject({
      proceduralStateId: saved.stateId,
      name: 'Citación a juicio',
      dueDate: '2026-09-08',
    });
  });

  // ── Identificador y destino inválidos ─────────────────────────────

  it('responde 404 si no existe', async () => {
    expectError(await del(999999), 404, 'PROCEDURAL_STATE_NOT_FOUND');
  });

  it('responde 404 con "Iniciada" y la deja activa', async () => {
    const initial = await createInitialState('CRIMINAL');

    expectError(await del(initial.stateId), 404, 'PROCEDURAL_STATE_NOT_FOUND');
    expect((await getPrisma().proceduralState.findUnique({ where: { stateId: initial.stateId } }))?.isActive).toBe(true);
  });

  it('responde 400 INVALID_PATH_PARAMETER con /abc', async () => {
    expectError(await del('abc'), 400, 'INVALID_PATH_PARAMETER', ['stateId']);
  });

  // ── CA-46.5 · Perfil no habilitado ────────────────────────────────

  it('responde 401 sin token', async () => {
    const saved = await createProceduralState();

    expectError(await request(app.getHttpServer()).delete(`${URL}/${saved.stateId}`), 401, 'UNAUTHENTICATED');
  });

  it.each<TestRole>(['LAWYER', 'SECRETARY'])('responde 403 a un %s y no da de baja', async (role) => {
    const saved = await createProceduralState();

    expectError(await del(saved.stateId, loginAs({ roles: [role] })), 403, 'FORBIDDEN');
    expect((await getPrisma().proceduralState.findUnique({ where: { stateId: saved.stateId } }))?.isActive).toBe(true);
  });
});

/**
 * `activeCases` lo cuenta `cases`, dueño de la definición de causa activa
 * (§4). Llega por `ActiveCasesCounterPort`, que este subsistema declara y
 * `cases` implementa en
 * `cases/infrastructure/acl/legal-parameters-active-cases-counter.adapter.ts`.
 * Ya no hay stub.
 *
 * Lo que se verifica acá es el **cableado**: que el número cruce el borde entre
 * los dos subsistemas y llegue al JSON. La semántica del conteo —estado
 * terminal, estado inicial, estado escrito a mano, causa dada de baja, estado
 * renombrado— está probada contra la base en el `describe` de
 * `countActiveByProceduralState` de `test/subsystems/cases/case-query.int.spec.ts`.
 * Repetirla acá sería probar la misma regla dos veces por dos caminos, y
 * cuando cambie habría que acordarse de los dos lugares.
 */
describe('activeCases de /api/v1/procedural-states', () => {
  /** `activeCases` por id de estado, leído del listado. */
  async function activeCasesInList() {
    const list = await request(app.getHttpServer()).get(URL).set(reader());
    return new Map(expectPaginated<ProceduralStateBody>(list).map((state) => [state.id, state.activeCases]));
  }

  async function activeCasesById(stateId: number) {
    const one = await request(app.getHttpServer()).get(`${URL}/${stateId}`).set(reader());
    return expectData<ProceduralStateBody>(one, 200).activeCases;
  }

  it('cuenta las causas de cada estado, en el listado y en la consulta por id', async () => {
    const owner = await aCaseOwner();
    const conDos = await createProceduralState({ name: 'Alegato' });
    const conUna = await createProceduralState({ name: 'Clausura' });
    await createCaseInState(owner, conDos.stateId);
    await createCaseInState(owner, conDos.stateId);
    await createCaseInState(owner, conUna.stateId);

    // El listado no incluye "Iniciada" (`proc-state-prisma.repository.ts:196`),
    // así que el mapa completo son los dos estados creados acá.
    expect(await activeCasesInList()).toEqual(
      new Map([
        [conDos.stateId, 2],
        [conUna.stateId, 1],
      ]),
    );
    expect(await activeCasesById(conDos.stateId)).toBe(2);
    expect(await activeCasesById(conUna.stateId)).toBe(1);
  });

  it('un estado sin causas responde 0, y el campo viene igual', async () => {
    const sinCausas = await createProceduralState();

    expect(await activeCasesInList()).toEqual(new Map([[sinCausas.stateId, 0]]));
    expect(await activeCasesById(sinCausas.stateId)).toBe(0);
  });

  it('la regla de causa activa cruza el borde: no cuenta la dada de baja, y un estado terminal da 0', async () => {
    const owner = await aCaseOwner();
    const estado = await createProceduralState({ name: 'Alegato' });
    const terminal = await createProceduralState({ name: 'Archivada', terminal: true });
    await createCaseInState(owner, estado.stateId);
    const baja = await createCaseInState(owner, estado.stateId);
    await getPrisma().case.update({ where: { id: baja.id }, data: { active: false } });
    await createCaseInState(owner, terminal.stateId);

    expect(await activeCasesById(estado.stateId)).toBe(1);
    expect(await activeCasesById(terminal.stateId)).toBe(0);
  });
});

/**
 * El resto del spec firma tokens a mano (`loginAs`). Estos tests se loguean
 * de verdad para probar la cadena completa: el seed le da los permisos al
 * Administrador, el login los pone en el token y el guard los exige.
 */
describe('Permisos de /api/v1/procedural-states con login real', () => {
  const PASSWORD = 'password1';

  async function loginWithRole(role: TestRole) {
    const user = await createUser({ roles: [role], passwordHash: await bcrypt.hash(PASSWORD, 4) });
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: user.username, password: PASSWORD });
    if (res.status !== 200) {
      throw new Error(`login con rol ${role} falló: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return { Authorization: `Bearer ${res.body.data.accessToken}` };
  }

  beforeEach(async () => {
    await createJurisdiction('CRIMINAL');
  });

  it('el Administrador registra, modifica y da de baja', async () => {
    const admin = await loginWithRole('ADMINISTRATOR');
    const server = request(app.getHttpServer());

    const created = await server.post(URL).set(admin).send(aProceduralStateBody());
    const { id } = expectData<SavedProceduralStateBody>(created, 201);
    expectData(await request(app.getHttpServer()).patch(`${URL}/${id}`).set(admin).send({ terminal: true }), 200);
    expectNoContent(await request(app.getHttpServer()).delete(`${URL}/${id}`).set(admin));
  });

  it.each<TestRole>(['LAWYER', 'SECRETARY'])('un %s consulta pero no escribe', async (role) => {
    const auth = await loginWithRole(role);
    const saved = await createProceduralState();
    const server = () => request(app.getHttpServer());

    expectPaginated(await server().get(URL).set(auth));
    expectData(await server().get(`${URL}/${saved.stateId}`).set(auth), 200);
    expectError(await server().post(URL).set(auth).send(aProceduralStateBody()), 403, 'FORBIDDEN');
    expectError(await server().patch(`${URL}/${saved.stateId}`).set(auth).send({ terminal: true }), 403, 'FORBIDDEN');
    expectError(await server().delete(`${URL}/${saved.stateId}`).set(auth), 403, 'FORBIDDEN');
  });
});
