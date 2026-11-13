import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { startTestApp, stopTestApp, getPrisma } from '../../shared/harness/test-app';
import { purgeAuditLog } from '../../shared/harness/audit-log';
import { expectData, expectError, expectNoContent, expectPaginated } from '../../shared/contract/envelopes';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import {
  aProceduralStateBody,
  createInitialState,
  createJurisdiction,
  createProceduralState,
} from '../../shared/factories/procedural-state.factory';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createUser } from '../../shared/factories/user.factory';

/*
 * Recurso estados procesales (HU45, HU16, HU17, HU46). Contrato: API_CONTRACT_V5.md §3.
 *
 * Qué prueba esta suite y qué no (criterios de `backend/test/README.md`):
 *  - la forma exacta del contrato en cada endpoint, cada `code` de error una vez y lo
 *    que sólo la base puede probar (unicidad por fuero, concurrencia, orden, `ILIKE`,
 *    `activeCases`, baja lógica);
 *  - las variantes de cada regla de dominio (coherencia plazo/tipo de día, nombre
 *    reservado, renombrar a sí mismo) están en `procedural-states.spec.ts` y en los
 *    specs de `register-` y `update-procedural-state.use-case`;
 *  - el 401 sin token está una sola vez, en `test/smoke/app.int.spec.ts`.
 */

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

// Consultar estados está abierto a cualquier usuario autenticado: sin permisos en el
// token alcanza. Se usa un abogado para que quede claro que no hace falta ser
// administrador.
const reader = () => loginAs({ roles: ['LAWYER'] });

// La escritura pide los permisos que el seed les da a los tres perfiles. Que el seed
// efectivamente se los dé lo prueba el `describe` de login real.
const writer = () => loginAs({ roles: ['ADMINISTRATOR'], permissions: WRITE_PERMISSIONS });

let app: INestApplication;
const server = () => request(app.getHttpServer());
const stored = (stateId: number) => getPrisma().proceduralState.findUniqueOrThrow({ where: { stateId } });

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await stopTestApp();
});

beforeEach(async () => {
  const prisma = getPrisma();
  // Causas y actos referencian estados y fueros con `Restrict`: van primero por si un
  // spec vecino los dejó. La causa apunta a su acto vigente, así que ese vínculo se
  // suelta antes de borrar los actos.
  await prisma.offense.deleteMany();
  await prisma.case.updateMany({ data: { currentProceduralActId: null } });
  await prisma.proceduralAct.deleteMany();
  await prisma.case.deleteMany();
  // Las factories numeran DNI y matrícula desde 1 en cada suite: sin esto chocan con
  // los que dejó otra suite.
  await prisma.client.deleteMany();
  await purgeAuditLog();
  await prisma.user.deleteMany(); // referencia a lawyers
  await prisma.lawyer.deleteMany();
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

type CaseOwner = Awaited<ReturnType<typeof aCaseOwner>>;

/**
 * Estado actual de la causa, leído de la base: id y nombre del estado (por la FK, así
 * que un renombrado se ve) y el vencimiento vigente, `COALESCE(manual, calculado)`,
 * como fecha civil.
 */
async function currentStateOfCase(caseId: number) {
  const kase = await getPrisma().case.findUniqueOrThrow({
    where: { id: caseId },
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

// Helpers locales, a propósito: `case.factory.ts` crea causas en el estado inicial.
// Para verificar qué les pasa a las causas cuando se modifica o se da de baja un
// estado (CA-17.2, CA-17.3, CA-46.3, CA-46.4), la causa se crea con esa factory y se
// la lleva al estado con Prisma.

/** PERSISTE una causa penal y la deja en `stateId`. */
async function createCaseInState(owner: CaseOwner, stateId: number) {
  const kase = await createCase(owner);
  return getPrisma().case.update({ where: { id: kase.id }, data: { currentStateId: stateId } });
}

/**
 * PERSISTE un acto procesal que llevó la causa a `stateId` y lo deja como su acto
 * vigente, con un vencimiento ya calculado (`dueDate`, `YYYY-MM-DD`). Los valores del
 * plazo se guardan tal cual: lo que se verifica es que nada los recalcule después.
 */
async function registerAct(owner: CaseOwner, caseId: number, stateId: number, dueDate: string) {
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
  const get = (query = '') => server().get(`${URL}${query}`).set(reader());

  // Los estados no tienen posición: se listan por fuero y, dentro de cada fuero, en
  // el orden en que se registraron (`id` ascendente).
  it('devuelve el sobre paginado en la forma del contrato, ordenado por fuero y por orden de registro', async () => {
    const criminalFirst = await createProceduralState({
      jurisdiction: 'CRIMINAL',
      name: 'Oposición al requerimiento de elevación',
      timeLimitDays: 5,
      dayType: 'BUSINESS',
      terminal: false,
    });
    const administrative = await createProceduralState({
      jurisdiction: 'ADMINISTRATIVE',
      name: 'Archivada',
      timeLimitDays: 0,
      terminal: true,
    });
    const criminalSecond = await createProceduralState({ jurisdiction: 'CRIMINAL', name: 'Citación a juicio' });

    const data = expectPaginated<ProceduralStateBody>(await get(), { page: 1, limit: 20, totalItems: 3, totalPages: 1 });

    expect(data).toEqual([
      {
        id: administrative.stateId,
        name: 'Archivada',
        jurisdiction: 'ADMINISTRATIVE',
        timeLimitDays: 0,
        dayType: 'NONE',
        terminal: true,
        activeCases: 0,
        active: true,
      },
      {
        id: criminalFirst.stateId,
        name: 'Oposición al requerimiento de elevación',
        jurisdiction: 'CRIMINAL',
        timeLimitDays: 5,
        dayType: 'BUSINESS',
        terminal: false,
        activeCases: 0,
        active: true,
      },
      expect.objectContaining({ id: criminalSecond.stateId, jurisdiction: 'CRIMINAL' }),
    ]);
  });

  it('filtra por fuero (acepta el código en minúsculas) y por nombre sin distinguir mayúsculas', async () => {
    const match = await createProceduralState({ jurisdiction: 'CRIMINAL', name: 'Notificación de OFICIO' });
    const otherCriminal = await createProceduralState({ jurisdiction: 'CRIMINAL', name: 'Alegato' });
    await createProceduralState({ jurisdiction: 'ADMINISTRATIVE', name: 'Oficio librado' });

    const byJurisdiction = expectPaginated<ProceduralStateBody>(await get('?jurisdiction=criminal'), { totalItems: 2 });
    const byBoth = expectPaginated<ProceduralStateBody>(await get('?jurisdiction=CRIMINAL&search=ofic'), { totalItems: 1 });

    expect(byJurisdiction.map((s) => s.id)).toEqual([match.stateId, otherCriminal.stateId]);
    expect(byBoth.map((s) => s.id)).toEqual([match.stateId]);
  });

  // El contrato: "El estado inicial 'Iniciada' no forma parte del listado". Bajas, §4.
  it('no lista los estados dados de baja ni el estado inicial "Iniciada"', async () => {
    await createInitialState('CRIMINAL');
    await createProceduralState({ jurisdiction: 'CRIMINAL', isActive: false });
    const regular = await createProceduralState({ jurisdiction: 'CRIMINAL' });

    const data = expectPaginated<ProceduralStateBody>(await get(), { totalItems: 1 });

    expect(data.map((s) => s.id)).toEqual([regular.stateId]);
  });

  // §4 del contrato: "Una colección sin resultados devuelve `data` vacío, `totalItems`
  // en `0` y `totalPages` en `0`" (`API_CONTRACT_V5.md:8350`).
  it('devuelve una colección vacía con totalItems y totalPages en 0', async () => {
    expect(expectPaginated(await get(), { totalItems: 0, totalPages: 0 })).toEqual([]);
  });

  it('pagina contra la base', async () => {
    await createProceduralState();
    await createProceduralState();
    const third = await createProceduralState();

    const data = expectPaginated<ProceduralStateBody>(await get('?page=2&limit=2'), {
      page: 2,
      limit: 2,
      totalItems: 3,
      totalPages: 2,
    });

    expect(data.map((s) => s.id)).toEqual([third.stateId]);
  });

  it('responde 400 VALIDATION_ERROR con un fuero inexistente y un parámetro desconocido', async () => {
    const res = await get('?jurisdiction=FOO&foo=1');

    expectError(res, 400, 'VALIDATION_ERROR', ['jurisdiction', 'foo']);
    expect(Object.keys(res.body.error.details).sort()).toEqual(['foo', 'jurisdiction']);
  });

  // `INVALID_PAGINATION` lo resuelve el `exceptionFactory` global cuando todo lo que
  // falla es paginación (`app.setup.ts`). `details` nombra los dos parámetros, como el
  // ejemplo del contrato.
  it('responde 400 INVALID_PAGINATION con una página menor a 1', async () => {
    expectError(await get('?page=0'), 400, 'INVALID_PAGINATION', ['page', 'limit']);
  });
});

describe('POST /api/v1/procedural-states', () => {
  const post = (body: object, auth = writer()) => server().post(URL).set(auth).send(body);

  beforeEach(async () => {
    await createJurisdiction('CRIMINAL');
    await createJurisdiction('AMPARO');
  });

  // CA-45.1
  it('registra el estado: 201 en la forma del contrato, sin activeCases, persistido y en el listado de su fuero', async () => {
    const res = await post(aProceduralStateBody({ name: '  Oposición al requerimiento de elevación  ', terminal: true }));

    const data = expectData<SavedProceduralStateBody>(res, 201);
    expect(data).toEqual({
      id: expect.any(Number),
      name: 'Oposición al requerimiento de elevación',
      jurisdiction: 'CRIMINAL',
      timeLimitDays: 5,
      dayType: 'BUSINESS',
      terminal: true,
      active: true,
    });
    const row = await getPrisma().proceduralState.findUnique({ where: { stateId: data.id }, include: { jurisdiction: true } });
    expect(row).toMatchObject({ name: data.name, timeLimitDays: 5, dayType: 'BUSINESS', terminal: true, isActive: true, isInitial: false });
    expect(row?.jurisdiction.name).toBe('CRIMINAL');
    const list = await server().get(`${URL}?jurisdiction=CRIMINAL`).set(reader());
    expect(expectPaginated<ProceduralStateBody>(list).map((s) => s.id)).toEqual([data.id]);
  });

  // CA-45.5, y los valores por defecto del contrato.
  it('sin plazo ni tipo de día ni terminal, aplica los valores por defecto: 0 días, NONE, no terminal', async () => {
    const res = await post({ name: 'Archivada', jurisdiction: 'CRIMINAL' });

    expect(expectData<SavedProceduralStateBody>(res, 201)).toMatchObject({
      timeLimitDays: 0,
      dayType: 'NONE',
      terminal: false,
    });
  });

  // CA-45.2 y CA-45.4
  it('rechaza con 409 una denominación tomada en el fuero o "Iniciada", sin distinguir mayúsculas, y no guarda nada', async () => {
    await createInitialState('CRIMINAL');
    await createProceduralState({ jurisdiction: 'CRIMINAL', name: 'Archivada', timeLimitDays: 0 });
    const before = await getPrisma().proceduralState.count();

    expectError(await post(aProceduralStateBody({ name: 'ARCHIVADA' })), 409, 'PROCEDURAL_STATE_ALREADY_EXISTS');
    expectError(
      await post(aProceduralStateBody({ name: 'iniciada', timeLimitDays: 0, dayType: 'NONE' })),
      409,
      'PROCEDURAL_STATE_ALREADY_EXISTS',
    );
    expect(await getPrisma().proceduralState.count()).toBe(before);
  });

  // CA-45.2. La unicidad es por fuero y sólo entre los vigentes (índice parcial).
  it('acepta la denominación en otro fuero y la de un estado dado de baja', async () => {
    await createProceduralState({ jurisdiction: 'CRIMINAL', name: 'Archivada', timeLimitDays: 0 });
    await createProceduralState({ jurisdiction: 'CRIMINAL', name: 'Citación', isActive: false });

    const otherJurisdiction = await post(aProceduralStateBody({ name: 'Archivada', jurisdiction: 'AMPARO', timeLimitDays: 0, dayType: 'NONE' }));
    const deactivatedName = await post(aProceduralStateBody({ name: 'Citación' }));

    expect(expectData<SavedProceduralStateBody>(otherJurisdiction, 201).jurisdiction).toBe('AMPARO');
    expectData(deactivatedName, 201);
  });

  it('ante dos altas simultáneas con la misma denominación, registra una y rechaza la otra con 409', async () => {
    const body = aProceduralStateBody({ name: 'Concurrente' });

    const responses = await Promise.all([post(body), post(body)]);

    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await getPrisma().proceduralState.count({ where: { name: 'Concurrente' } })).toBe(1);
  });

  // CA-45.3. Las demás combinaciones incoherentes están en `procedural-states.spec.ts`.
  it('con días mayores a 0 y sin tipo de día, rechaza con el mensaje del contrato y no guarda nada', async () => {
    const res = await post({ name: 'Citación', jurisdiction: 'CRIMINAL', timeLimitDays: 5 });

    expectError(res, 400, 'VALIDATION_ERROR', ['dayType']);
    expect(res.body.error.details.dayType).toBe('Debe indicarse el tipo de día cuando el plazo es mayor a 0.');
    expect(await getPrisma().proceduralState.count()).toBe(0);
  });

  it('responde 400 nombrando cada campo inválido, incluido uno que el contrato no define', async () => {
    const res = await post({ name: '   ', jurisdiction: 'FOO', timeLimitDays: 1.5, terminal: null, position: 1 });

    expectError(res, 400, 'VALIDATION_ERROR', ['name', 'jurisdiction', 'timeLimitDays', 'terminal', 'position']);
    expect(Object.keys(res.body.error.details).sort()).toEqual(['jurisdiction', 'name', 'position', 'terminal', 'timeLimitDays']);
  });
});

describe('GET /api/v1/procedural-states/:stateId', () => {
  const getById = (id: number | string) => server().get(`${URL}/${id}`).set(reader());

  it('responde 200 con el estado en la forma del contrato, con activeCases', async () => {
    const saved = await createProceduralState({ name: 'Citación a juicio', timeLimitDays: 5, dayType: 'CONSECUTIVE' });

    expect(expectData<ProceduralStateBody>(await getById(saved.stateId), 200)).toEqual({
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

  // CA-46.2: dado de baja es indistinguible de inexistente. "Iniciada" no se expone.
  it('responde 404 si no existe, si fue dado de baja y con el estado inicial "Iniciada"', async () => {
    const deactivated = await createProceduralState({ isActive: false });
    const initial = await createInitialState('CRIMINAL');

    for (const id of [999999, deactivated.stateId, initial.stateId]) {
      expectError(await getById(id), 404, 'PROCEDURAL_STATE_NOT_FOUND');
    }
  });

  it('responde 400 INVALID_PATH_PARAMETER con un identificador que no es un entero positivo', async () => {
    for (const id of ['abc', '0', '1.5']) {
      expectError(await getById(id), 400, 'INVALID_PATH_PARAMETER', ['stateId']);
    }
  });
});

describe('PATCH /api/v1/procedural-states/:stateId', () => {
  const patch = (id: number | string, body: object, auth = writer()) => server().patch(`${URL}/${id}`).set(auth).send(body);

  // CA-17.1
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
    expect(await stored(saved.stateId)).toMatchObject({
      name: 'Citación a juicio',
      timeLimitDays: 10,
      dayType: 'CONSECUTIVE',
      terminal: true,
    });
  });

  // CA-17.2 y CA-17.3
  it('el nombre nuevo se ve en las causas del estado, y sus vencimientos ya registrados no se recalculan', async () => {
    const owner = await aCaseOwner();
    const saved = await createProceduralState({ name: 'Citación', timeLimitDays: 5, dayType: 'BUSINESS' });
    const kase = await createCase(owner);
    const act = await registerAct(owner, kase.id, saved.stateId, '2026-09-08');

    await patch(saved.stateId, { name: 'Citación a juicio', timeLimitDays: 20, dayType: 'CONSECUTIVE' }).expect(200);

    expect(await currentStateOfCase(kase.id)).toEqual({
      proceduralStateId: saved.stateId,
      name: 'Citación a juicio',
      dueDate: '2026-09-08',
    });
    expect(await getPrisma().proceduralAct.findUnique({ where: { id: act.id } })).toMatchObject({
      deadlineTimeLimitDays: 5,
      deadlineDayType: 'BUSINESS',
    });
  });

  // CA-17.4 (D-36): el fuero no se modifica, aunque se envíe el mismo.
  it('rechaza con 400 sobre jurisdiction aunque se envíe el mismo fuero, y no modifica nada', async () => {
    const saved = await createProceduralState({ jurisdiction: 'CRIMINAL', name: 'Citación' });

    const res = await patch(saved.stateId, { name: 'Otro nombre', jurisdiction: 'CRIMINAL' });

    expectError(res, 400, 'VALIDATION_ERROR', ['jurisdiction']);
    expect(res.body.error.details.jurisdiction).toBe('El fuero de un estado procesal no se puede modificar.');
    expect(await stored(saved.stateId)).toMatchObject({ name: 'Citación', jurisdictionId: saved.jurisdictionId });
  });

  // CA-17.5. Renombrar a sí mismo, a "Iniciada" o a un nombre de otro fuero está en
  // `update-procedural-state.use-case.spec.ts`.
  it('rechaza con 409 una denominación de otro estado del fuero y no modifica nada', async () => {
    await createProceduralState({ name: 'Archivada', timeLimitDays: 0 });
    const saved = await createProceduralState({ name: 'Citación' });

    expectError(await patch(saved.stateId, { name: 'archivada' }), 409, 'PROCEDURAL_STATE_ALREADY_EXISTS');
    expect((await stored(saved.stateId)).name).toBe('Citación');
  });

  // CA-17.6: la coherencia se valida contra los valores que el estado ya tiene.
  it('rechaza con 400 un plazo de 0 días sobre un estado BUSINESS, con el mensaje del contrato, y no modifica nada', async () => {
    const saved = await createProceduralState({ timeLimitDays: 5, dayType: 'BUSINESS' });

    const res = await patch(saved.stateId, { name: 'Renombrado', timeLimitDays: 0 });

    expectError(res, 400, 'VALIDATION_ERROR', ['dayType']);
    expect(res.body.error.details.dayType).toBe('Debe ser NONE cuando el plazo es 0.');
    expect(await stored(saved.stateId)).toMatchObject({ name: saved.name, timeLimitDays: 5, dayType: 'BUSINESS' });
  });

  it('responde 400 con un cuerpo vacío', async () => {
    const saved = await createProceduralState();

    expectError(await patch(saved.stateId, {}), 400, 'VALIDATION_ERROR', ['body']);
  });

  it('responde 404 si no existe, si fue dado de baja y con "Iniciada", que no se modifica', async () => {
    const deactivated = await createProceduralState({ isActive: false });
    const initial = await createInitialState('CRIMINAL');

    for (const id of [999999, deactivated.stateId, initial.stateId]) {
      expectError(await patch(id, { terminal: true }), 404, 'PROCEDURAL_STATE_NOT_FOUND');
    }
    expect((await stored(initial.stateId)).terminal).toBe(false);
  });
});

describe('DELETE /api/v1/procedural-states/:stateId', () => {
  const del = (id: number | string) => server().delete(`${URL}/${id}`).set(writer());

  // CA-46.1 y CA-46.2: baja lógica (RN12), y una vez dado de baja no existe para el
  // cliente ni se reactiva.
  it('responde 204, conserva el registro inactivo, lo saca del listado y de la consulta y libera su denominación', async () => {
    const kept = await createProceduralState();
    const dropped = await createProceduralState({ name: 'Archivada', timeLimitDays: 0 });

    expectNoContent(await del(dropped.stateId));

    expect(await stored(dropped.stateId)).toMatchObject({ name: 'Archivada', isActive: false });
    const list = await server().get(`${URL}?jurisdiction=CRIMINAL`).set(reader());
    expect(expectPaginated<ProceduralStateBody>(list).map((s) => s.id)).toEqual([kept.stateId]);
    expectError(await server().get(`${URL}/${dropped.stateId}`).set(reader()), 404, 'PROCEDURAL_STATE_NOT_FOUND');
    expectError(await del(dropped.stateId), 404, 'PROCEDURAL_STATE_NOT_FOUND');
    const again = await server()
      .post(URL)
      .set(writer())
      .send(aProceduralStateBody({ name: 'Archivada', timeLimitDays: 0, dayType: 'NONE' }));
    expect(expectData<SavedProceduralStateBody>(again, 201).id).not.toBe(dropped.stateId);
  });

  // CA-46.3 y CA-46.4: la causa sigue mostrando el estado dado de baja (§4, Bajas).
  it('procede con causas en el estado, que lo conservan con su denominación y su vencimiento', async () => {
    const owner = await aCaseOwner();
    const saved = await createProceduralState({ name: 'Citación a juicio' });
    const kase = await createCase(owner);
    await registerAct(owner, kase.id, saved.stateId, '2026-09-08');

    expectNoContent(await del(saved.stateId));

    expect(await currentStateOfCase(kase.id)).toEqual({
      proceduralStateId: saved.stateId,
      name: 'Citación a juicio',
      dueDate: '2026-09-08',
    });
  });

  it('responde 404 si no existe y con "Iniciada", que sigue activa', async () => {
    const initial = await createInitialState('CRIMINAL');

    expectError(await del(999999), 404, 'PROCEDURAL_STATE_NOT_FOUND');
    expectError(await del(initial.stateId), 404, 'PROCEDURAL_STATE_NOT_FOUND');
    expect((await stored(initial.stateId)).isActive).toBe(true);
  });
});

/**
 * `activeCases` lo cuenta `cases`, dueño de la definición de causa activa (§4), y llega
 * por `ActiveCasesCounterPort`, que implementa
 * `cases/infrastructure/acl/legal-parameters-active-cases-counter.adapter.ts`. Se
 * verifica a través de la API, contra la base: el número que cruza el borde y la regla
 * de causa activa.
 *
 * Lo que no se ve desde acá es el estado inicial: "Iniciada" no se lista ni se consulta
 * (404), así que su conteo (0, a diferencia del de abogados, clientes y calificaciones)
 * no tiene dónde mostrarse.
 */
describe('activeCases de /api/v1/procedural-states', () => {
  async function activeCasesInList() {
    const list = await server().get(URL).set(reader());
    return new Map(expectPaginated<ProceduralStateBody>(list).map((state) => [state.id, state.activeCases]));
  }

  async function activeCasesById(stateId: number) {
    return expectData<ProceduralStateBody>(await server().get(`${URL}/${stateId}`).set(reader()), 200).activeCases;
  }

  it('cuenta las causas de cada estado en el listado y en la consulta por id, con 0 para un estado sin causas', async () => {
    const owner = await aCaseOwner();
    const conDos = await createProceduralState({ name: 'Alegato' });
    const conUna = await createProceduralState({ name: 'Clausura' });
    const sinCausas = await createProceduralState({ name: 'Citación' });
    await createCaseInState(owner, conDos.stateId);
    await createCaseInState(owner, conDos.stateId);
    await createCaseInState(owner, conUna.stateId);

    expect(await activeCasesInList()).toEqual(
      new Map([
        [conDos.stateId, 2],
        [conUna.stateId, 1],
        [sinCausas.stateId, 0],
      ]),
    );
    expect(await activeCasesById(conDos.stateId)).toBe(2);
  });

  it('no cuenta la causa dada de baja ni la de estado escrito a mano; un estado terminal da 0; un renombrado sigue contando', async () => {
    const owner = await aCaseOwner();
    const estado = await createProceduralState({ name: 'Alegato' });
    const terminal = await createProceduralState({ name: 'Archivada', terminal: true });
    await createCaseInState(owner, estado.stateId);
    const baja = await createCaseInState(owner, estado.stateId);
    await deactivateCase(baja.id);
    await createCaseInState(owner, terminal.stateId);
    // Estado escrito a mano: sin `current_state_id`, no pertenece a ninguna fila.
    await createCase({ ...owner, currentCustomState: 'Con acusación, pero con oposición' });
    // Agrupa por el id, no por el nombre: la causa referencia la fila por FK.
    await server().patch(`${URL}/${estado.stateId}`).set(writer()).send({ name: 'Alegato, renombrado' }).expect(200);

    expect(await activeCasesById(estado.stateId)).toBe(1);
    expect(await activeCasesById(terminal.stateId)).toBe(0);
  });
});

/**
 * El resto de la suite firma tokens a mano (`loginAs`). Estos tests se loguean de
 * verdad para probar la cadena completa: el seed le da los permisos a cada perfil, el
 * login los pone en el token y el guard los exige. Desde la matriz del 2026-10-11
 * (§5.1) los tres perfiles administran estados procesales.
 */
describe('Permisos de /api/v1/procedural-states', () => {
  const PASSWORD = 'password1';

  async function loginWithRole(role: TestRole) {
    const user = await createUser({ roles: [role], passwordHash: await bcrypt.hash(PASSWORD, 4) });
    const res = await server().post('/api/v1/auth/login').send({ username: user.username, password: PASSWORD });
    if (res.status !== 200) {
      throw new Error(`login con rol ${role} falló: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return { Authorization: `Bearer ${res.body.data.accessToken}` };
  }

  beforeEach(async () => {
    await createJurisdiction('CRIMINAL');
  });

  it.each<TestRole>(['ADMINISTRATOR', 'LAWYER', 'SECRETARY'])('un %s consulta, registra, modifica y da de baja', async (role) => {
    const auth = await loginWithRole(role);

    const created = await server().post(URL).set(auth).send(aProceduralStateBody());
    const { id } = expectData<SavedProceduralStateBody>(created, 201);
    expectPaginated(await server().get(URL).set(auth));
    expectData(await server().get(`${URL}/${id}`).set(auth), 200);
    expectData(await server().patch(`${URL}/${id}`).set(auth).send({ terminal: true }), 200);
    expectNoContent(await server().delete(`${URL}/${id}`).set(auth));
  });

  // CA-45.6, CA-17.7, CA-46.5: cada ruta de escritura exige su permiso.
  it('un token sin permisos recibe 403 en POST, PATCH y DELETE, y no cambia nada', async () => {
    const saved = await createProceduralState({ name: 'Citación' });
    const auth = loginAs({ roles: ['LAWYER'] });

    expectError(await server().post(URL).set(auth).send(aProceduralStateBody()), 403, 'FORBIDDEN');
    expectError(await server().patch(`${URL}/${saved.stateId}`).set(auth).send({ name: 'Otro' }), 403, 'FORBIDDEN');
    expectError(await server().delete(`${URL}/${saved.stateId}`).set(auth), 403, 'FORBIDDEN');
    expect(await getPrisma().proceduralState.count()).toBe(1);
    expect(await stored(saved.stateId)).toMatchObject({ name: 'Citación', isActive: true });
  });
});

/*
 * HU33 CA-33.13 y D-53: "Prescripta" es un estado de sistema del fuero penal. Aparece
 * en el listado, pero `PATCH` y `DELETE` responden 422 PROCEDURAL_STATE_PROTECTED, y no
 * se puede registrar otro con su nombre.
 */
describe('el estado de sistema "Prescripta" (HU33, CA-33.13)', () => {
  const PROTECTED_MESSAGE = 'El estado Prescripta es un estado del sistema y no puede modificarse ni darse de baja.';

  const aPrescribedState = () =>
    createProceduralState({
      jurisdiction: 'CRIMINAL',
      name: 'Prescripta',
      timeLimitDays: 0,
      dayType: 'NONE',
      terminal: true,
      isPrescribed: true,
    });

  it('PATCH y DELETE responden 422 PROCEDURAL_STATE_PROTECTED, no cambian nada y sigue en el listado', async () => {
    const prescribed = await aPrescribedState();

    const patched = await server()
      .patch(`${URL}/${prescribed.stateId}`)
      .set(writer())
      .send({ name: 'Prescripción', timeLimitDays: 5, dayType: 'BUSINESS' });
    const deleted = await server().delete(`${URL}/${prescribed.stateId}`).set(writer());

    for (const res of [patched, deleted]) {
      expectError(res, 422, 'PROCEDURAL_STATE_PROTECTED');
      expect(res.body.error.message).toBe(PROTECTED_MESSAGE);
    }
    expect(await stored(prescribed.stateId)).toMatchObject({
      name: 'Prescripta',
      timeLimitDays: 0,
      dayType: 'NONE',
      terminal: true,
      isActive: true,
    });
    const listed = expectPaginated<ProceduralStateBody>(await server().get(URL).query({ jurisdiction: 'CRIMINAL' }).set(reader()));
    expect(listed.map((state) => state.name)).toContain('Prescripta');
  });

  it('registrar otro "Prescripta" en el fuero penal responde 409 y no crea otro (D-53)', async () => {
    await aPrescribedState();

    const res = await server()
      .post(URL)
      .set(writer())
      .send(aProceduralStateBody({ name: 'Prescripta', timeLimitDays: 0, dayType: 'NONE', terminal: true }));

    expectError(res, 409, 'PROCEDURAL_STATE_ALREADY_EXISTS');
    expect(await getPrisma().proceduralState.count({ where: { name: 'Prescripta' } })).toBe(1);
  });
});
