import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { expectData, expectError, expectNoContent, expectPaginated } from '../../shared/contract/envelopes';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { createUser } from '../../shared/factories/user.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createProceduralState } from '../../shared/factories/procedural-state.factory';

/*
 * Recurso calificaciones legales (HU47, HU48, HU49, HU50). Contrato: API_CONTRACT_V6.md §3.5.
 *
 * Una sola app para los cinco endpoints. Las variantes de la denominación y del plazo
 * (borde de 255 caracteres, plazo mínimo, recorte) están en `legal-qualification.spec.ts`
 * y en los specs de los casos de uso; acá queda la forma del contrato, cada `code` de
 * error una vez y lo que sólo la base puede probar. El 401 sin token está en
 * `test/smoke/app.int.spec.ts`. HU49 y HU50 se escribieron desde
 * `.claude/plans/tests-hu49-hu50-calificaciones.md`, no desde el código.
 */

const URL = '/api/v1/legal-qualifications';

interface QualificationBody {
  id: number;
  name: string;
  prescriptionMonths: number;
  activeCases: number;
  active: boolean;
}

const PASSWORD = 'password1';
const ROLES: TestRole[] = ['ADMINISTRATOR', 'LAWYER', 'SECRETARY'];

const reader = () => loginAs({ permissions: ['qualification:read'] });
const writer = () => loginAs({ permissions: ['qualification:create'] });
const updater = () => loginAs({ permissions: ['qualification:update'] });
const deleter = () => loginAs({ permissions: ['qualification:delete'] });

let app: INestApplication;
const server = () => request(app.getHttpServer());

const patch = (id: number | string, body: object, auth = updater()) => server().patch(`${URL}/${id}`).set(auth).send(body);
const remove = (id: number | string, auth = deleter()) => server().delete(`${URL}/${id}`).set(auth);
/** Lo que quedó en la tabla, para comparar antes y después. */
const rowOf = (id: number) =>
  getPrisma().legalQualification.findUniqueOrThrow({
    where: { id },
    select: { name: true, prescriptionMonths: true, active: true },
  });

// Respuestas de error textuales del contrato (§3.5) y del guard de permisos.
const NOT_FOUND = {
  error: { code: 'LEGAL_QUALIFICATION_NOT_FOUND', message: 'No se encontró la calificación legal solicitada.', details: null },
};
const ALREADY_EXISTS = {
  error: {
    code: 'LEGAL_QUALIFICATION_ALREADY_EXISTS',
    message: 'Ya existe una calificación legal con esa denominación.',
    details: null,
  },
};
const INVALID_ID = {
  error: {
    code: 'INVALID_PATH_PARAMETER',
    message: 'El identificador de la calificación legal no es válido.',
    details: { qualificationId: 'Debe ser un número entero válido.' },
  },
};
const FORBIDDEN = {
  error: { code: 'FORBIDDEN', message: 'No tiene permisos para realizar esta operación.', details: null },
};
const validationError = (details: Record<string, string>) => ({
  error: { code: 'VALIDATION_ERROR', message: 'Los datos enviados no son válidos.', details },
});

/** Status y cuerpo exactos, en una sola aserción por cada uno. */
function expectResponse(res: Response, status: number, body: object): void {
  expect(res.status).toBe(status);
  expect(res.body).toEqual(body);
}

/**
 * Crea un usuario con ese rol y lo loguea de verdad, para que el token traiga los
 * permisos que el **seed** le dio a ese rol: seed → `role_permissions` → login →
 * claims → guard. `loginAs` prueba el guard, pero no la matriz.
 */
async function loginWithRole(role: TestRole) {
  const user = await createUser({ roles: [role], passwordHash: await bcrypt.hash(PASSWORD, 4) });
  const res = await server().post('/api/v1/auth/login').send({ username: user.username, password: PASSWORD });
  if (res.status !== 200) {
    throw new Error(`login con rol ${role} falló: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { Authorization: `Bearer ${res.body.data.accessToken}` };
}

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await stopTestApp();
});

beforeEach(async () => {
  // Las calificaciones son referenciadas por `offenses` con `Restrict`, y los hechos
  // por la causa: van primero. La causa apunta a su acto vigente, así que ese vínculo
  // se suelta antes de borrar los actos.
  const prisma = getPrisma();
  await prisma.offense.deleteMany();
  await prisma.case.updateMany({ data: { currentProceduralActId: null } });
  await prisma.proceduralAct.deleteMany();
  await prisma.case.deleteMany();
  // Las factories numeran DNI y matrícula desde 1 en cada suite: sin esto chocan con
  // los que dejó otra suite.
  await prisma.client.deleteMany();
  await prisma.user.deleteMany(); // referencia a lawyers
  await prisma.lawyer.deleteMany();
  await prisma.legalQualification.deleteMany();
});

describe('POST /api/v1/legal-qualifications', () => {
  const post = (body: object, auth = writer()) => server().post(URL).set(auth).send(body);

  // CA-48.1, CA-48.3 y CA-48.7: `activeCases` sólo va en los `GET`.
  it('registra la calificación: 201 en la forma del contrato, sin activeCases, y la persiste con el plazo en meses', async () => {
    const res = await post({ name: 'Abuso de armas — art. 104 CP', prescriptionMonths: 78 });

    const data = expectData<QualificationBody>(res, 201);
    expect(data).toEqual({
      id: expect.any(Number),
      name: 'Abuso de armas — art. 104 CP',
      prescriptionMonths: 78,
      active: true,
    });
    expect(await getPrisma().legalQualification.findUnique({ where: { id: data.id } })).toMatchObject({
      name: 'Abuso de armas — art. 104 CP',
      prescriptionMonths: 78,
      active: true,
    });
  });

  // CA-48.4, contra el índice real.
  it('rechaza con 409 una denominación vigente aunque difiera en mayúsculas y espacios, y no guarda otra', async () => {
    await createLegalQualification({ name: 'Hurto simple — art. 162 CP' });

    const res = await post({ name: '  HURTO SIMPLE — art. 162 cp  ', prescriptionMonths: 24 });

    expectError(res, 409, 'LEGAL_QUALIFICATION_ALREADY_EXISTS');
    expect(await getPrisma().legalQualification.count()).toBe(1);
  });

  /**
   * El índice es parcial (`WHERE active`): una calificación dada de baja libera su
   * denominación. Sin esto un error de carga sería irreparable.
   */
  it('acepta la denominación de una calificación dada de baja', async () => {
    await createLegalQualification({ name: 'Hurto simple — art. 162 CP', active: false });

    expectData(await post({ name: 'Hurto simple — art. 162 CP', prescriptionMonths: 24 }), 201);
  });

  // CA-48.5 y CA-48.6
  it('responde 400 nombrando cada campo a corregir y no guarda nada', async () => {
    const res = await post({ name: 'A'.repeat(256), prescriptionMonths: 0 });

    expectError(res, 400, 'VALIDATION_ERROR', ['name', 'prescriptionMonths']);
    expect(Object.keys(res.body.error.details).sort()).toEqual(['name', 'prescriptionMonths']);
    expect(await getPrisma().legalQualification.count()).toBe(0);
  });

  it('responde 403 a un token sin el permiso y no guarda nada', async () => {
    const res = await post({ name: 'Hurto simple — art. 162 CP', prescriptionMonths: 24 }, loginAs({ roles: ['LAWYER'] }));

    expectError(res, 403, 'FORBIDDEN');
    expect(await getPrisma().legalQualification.count()).toBe(0);
  });
});

describe('GET /api/v1/legal-qualifications', () => {
  const get = (query: Record<string, unknown> = {}) => server().get(URL).query(query).set(reader());

  // CA-47.1, CA-47.3 y CA-47.9
  it('devuelve el sobre paginado en la forma del contrato, en orden alfabético y sin las dadas de baja', async () => {
    const hurto = await createLegalQualification({ name: 'Hurto simple — art. 162 CP', prescriptionMonths: 24 });
    const abuso = await createLegalQualification({ name: 'Abuso de armas — art. 104 CP', prescriptionMonths: 78 });
    await createLegalQualification({ name: 'Figura derogada — art. 0 CP', active: false });

    const data = expectPaginated<QualificationBody>(await get(), { page: 1, limit: 20, totalItems: 2, totalPages: 1 });

    expect(data).toEqual([
      { id: abuso.id, name: 'Abuso de armas — art. 104 CP', prescriptionMonths: 78, activeCases: 0, active: true },
      { id: hurto.id, name: 'Hurto simple — art. 162 CP', prescriptionMonths: 24, activeCases: 0, active: true },
    ]);
  });

  // CA-47.4 y CA-47.6: busca por el delito o por el artículo, sin distinguir mayúsculas;
  // sin coincidencias es una colección vacía, no un error.
  it('busca por el nombre del delito o por el artículo, sin distinguir mayúsculas', async () => {
    await createLegalQualification({ name: 'Hurto simple — art. 162 CP' });
    await createLegalQualification({ name: 'Abuso de armas — art. 104 CP' });

    for (const search of ['HURTO', 'art. 162', '162']) {
      expect(expectPaginated<QualificationBody>(await get({ search })).map((q) => q.name)).toEqual([
        'Hurto simple — art. 162 CP',
      ]);
    }
    // §4: una colección sin resultados lleva `totalPages` en 0 (`API_CONTRACT_V5.md:8350`).
    expect(expectPaginated(await get({ search: 'no coincide con nada' }), { totalItems: 0, totalPages: 0 })).toEqual([]);
  });

  // CA-47.5
  it('pagina contra la base', async () => {
    await createLegalQualification({ name: 'A — art. 1 CP' });
    await createLegalQualification({ name: 'B — art. 2 CP' });
    await createLegalQualification({ name: 'C — art. 3 CP' });

    const data = expectPaginated<QualificationBody>(await get({ page: 2, limit: 2 }), {
      page: 2,
      limit: 2,
      totalItems: 3,
      totalPages: 2,
    });

    expect(data.map((q) => q.name)).toEqual(['C — art. 3 CP']);
  });

  it('responde 400 INVALID_PAGINATION con un límite fuera de rango', async () => {
    expectError(await get({ limit: 500 }), 400, 'INVALID_PAGINATION', ['page', 'limit']);
  });
});

describe('GET /api/v1/legal-qualifications/{qualificationId}', () => {
  const getById = (id: number | string) => server().get(`${URL}/${id}`).set(reader());

  // CA-47.7
  it('devuelve sus datos completos dentro del sobre `data`', async () => {
    const saved = await createLegalQualification({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 });

    expect(expectData<QualificationBody>(await getById(saved.id), 200)).toEqual({
      id: saved.id,
      name: 'Robo calificado — art. 167 inc. 2 CP',
      prescriptionMonths: 96,
      activeCases: 0,
      active: true,
    });
  });

  // CA-47.9: dada de baja es indistinguible de inexistente.
  it('responde 404 para una calificación inexistente y para una dada de baja', async () => {
    const deactivated = await createLegalQualification({ active: false });

    expectError(await getById(999999), 404, 'LEGAL_QUALIFICATION_NOT_FOUND');
    expectError(await getById(deactivated.id), 404, 'LEGAL_QUALIFICATION_NOT_FOUND');
  });

  it('rechaza un identificador que no es un entero', async () => {
    expectError(await getById('abc'), 400, 'INVALID_PATH_PARAMETER', ['qualificationId']);
  });
});

// ── HU49: modificar ──────────────────────────────────────────────────────

describe('PATCH /api/v1/legal-qualifications/{qualificationId} — modificación', () => {
  // CA-49.1 y CA-49.5: la respuesta no trae `activeCases` (D-32); el campo omitido no cambia.
  it('modifica la denominación y el plazo: 200 con las cuatro claves, sin activeCases, persistido; lo omitido queda', async () => {
    const saved = await createLegalQualification({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 });

    const res = await patch(saved.id, { name: '  Robo calificado — art. 167 inc. 4 CP  ', prescriptionMonths: 120 });

    expect(expectData<QualificationBody>(res, 200)).toEqual({
      id: saved.id,
      name: 'Robo calificado — art. 167 inc. 4 CP',
      prescriptionMonths: 120,
      active: true,
    });
    expect(await rowOf(saved.id)).toEqual({ name: 'Robo calificado — art. 167 inc. 4 CP', prescriptionMonths: 120, active: true });

    const onlyMonths = await patch(saved.id, { prescriptionMonths: 132 });

    expect(expectData<QualificationBody>(onlyMonths, 200)).toEqual({
      id: saved.id,
      name: 'Robo calificado — art. 167 inc. 4 CP',
      prescriptionMonths: 132,
      active: true,
    });
  });

  // CA-49.1 (al menos un campo), CA-49.3 (plazo ≥ 1), CA-49.5 (`activeCases` no se
  // modifica) y CA-50.1 (no se reactiva): todo 400, con `details` exacto y sin cambios.
  it.each([
    ['sin ningún campo', {}, { body: 'Debe enviarse al menos un campo para modificar.' }],
    [
      'con la denominación vacía y el plazo en 0',
      { name: '', prescriptionMonths: 0 },
      { name: 'No puede estar vacío.', prescriptionMonths: 'Debe ser un número entero mayor o igual a 1.' },
    ],
    [
      'con la denominación en blanco y el plazo fraccionario',
      { name: '   ', prescriptionMonths: 1.5 },
      { name: 'No puede estar vacío.', prescriptionMonths: 'Debe ser un número entero mayor o igual a 1.' },
    ],
    [
      'con los dos campos en null',
      { name: null, prescriptionMonths: null },
      { name: 'No puede estar vacío.', prescriptionMonths: 'Debe ser un número entero mayor o igual a 1.' },
    ],
    ['con una denominación de 256 caracteres', { name: 'A'.repeat(256) }, { name: 'Debe tener como máximo 255 caracteres.' }],
    ['con activeCases', { activeCases: 3 }, { activeCases: 'No es un campo admitido.' }],
    ['con active', { active: false }, { active: 'No es un campo admitido.' }],
  ])('responde 400 %s y no cambia nada', async (_caso, body, details) => {
    const saved = await createLegalQualification({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 });

    expectResponse(await patch(saved.id, body), 400, validationError(details));
    expect(await rowOf(saved.id)).toEqual({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96, active: true });
  });

  // CA-49.6
  it('responde 404 para una inexistente y para una dada de baja, que no cambia; 400 con un id que no es entero', async () => {
    const deactivated = await createLegalQualification({ prescriptionMonths: 96, active: false });

    for (const id of [999999, deactivated.id]) {
      expectResponse(await patch(id, { prescriptionMonths: 120 }), 404, NOT_FOUND);
    }
    expect(await rowOf(deactivated.id)).toMatchObject({ prescriptionMonths: 96, active: false });

    for (const id of ['abc', '0']) {
      expectResponse(await patch(id, { prescriptionMonths: 120 }), 400, INVALID_ID);
    }
  });
});

describe('PATCH /api/v1/legal-qualifications/{qualificationId} — denominación única', () => {
  // CA-49.2, contra el índice parcial real (`lower(name) WHERE active`).
  it('409 con la de otra vigente sin distinguir mayúsculas ni espacios, sin cambios; la propia con otras mayúsculas y la de una dada de baja, 200', async () => {
    await createLegalQualification({ name: 'Hurto simple — art. 162 CP' });
    await createLegalQualification({ name: 'Abuso de armas — art. 104 CP', active: false });
    const robo = await createLegalQualification({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 });

    expectResponse(await patch(robo.id, { name: '  HURTO SIMPLE — art. 162 cp  ', prescriptionMonths: 120 }), 409, ALREADY_EXISTS);
    expect(await rowOf(robo.id)).toEqual({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96, active: true });

    const sameWithOtherCase = await patch(robo.id, { name: 'ROBO CALIFICADO — ART. 167 INC. 2 CP' });
    expect(expectData<QualificationBody>(sameWithOtherCase, 200).name).toBe('ROBO CALIFICADO — ART. 167 INC. 2 CP');

    const nameOfDeactivated = await patch(robo.id, { name: 'Abuso de armas — art. 104 CP' });
    expect(expectData<QualificationBody>(nameOfDeactivated, 200).name).toBe('Abuso de armas — art. 104 CP');
  });

  // CA-49.2 bajo concurrencia: si los dos pasan el chequeo previo, el índice frena al
  // segundo, y tiene que responder el 409 del contrato, no un 500.
  it('ante dos renombres simultáneos al mismo nombre, uno se guarda y el otro responde 409', async () => {
    const first = await createLegalQualification();
    const second = await createLegalQualification();

    const responses = await Promise.all([
      patch(first.id, { name: 'Hurto simple — art. 162 CP' }),
      patch(second.id, { name: 'hurto simple — art. 162 cp' }),
    ]);

    expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(responses.find((res) => res.status === 409)?.body).toEqual(ALREADY_EXISTS);
    const withThatName = await getPrisma().legalQualification.count({
      where: { active: true, name: { equals: 'Hurto simple — art. 162 CP', mode: 'insensitive' } },
    });
    expect(withThatName).toBe(1);
  });
});

// ── HU50: dar de baja ───────────────────────────────────────────────────

describe('DELETE /api/v1/legal-qualifications/{qualificationId}', () => {
  // CA-50.1, CA-50.2 y QL-02: baja lógica, invisible para el cliente, libera la denominación.
  it('204 sin cuerpo; queda no vigente con su denominación y plazo; no se lista ni se consulta, y libera la denominación', async () => {
    const robo = await createLegalQualification({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 });
    const hurto = await createLegalQualification({ name: 'Hurto simple — art. 162 CP' });

    expectNoContent(await remove(robo.id));

    expect(await rowOf(robo.id)).toEqual({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96, active: false });
    const listed = expectPaginated<QualificationBody>(await server().get(URL).set(reader()));
    expect(listed.map((q) => q.id)).toEqual([hurto.id]);
    expectResponse(await server().get(`${URL}/${robo.id}`).set(reader()), 404, NOT_FOUND);

    const again = await server().post(URL).set(writer()).send({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 });
    expectData(again, 201);
  });

  // CA-50.4 y CA-50.1 (no se reactiva por la API).
  it('la segunda baja y una inexistente responden 404; un id que no es entero, 400; una dada de baja no se modifica', async () => {
    const saved = await createLegalQualification({ prescriptionMonths: 96 });
    expectNoContent(await remove(saved.id));

    for (const id of [saved.id, 999999]) {
      expectResponse(await remove(id), 404, NOT_FOUND);
    }
    expectResponse(await remove('abc'), 400, INVALID_ID);
    expectResponse(await patch(saved.id, { prescriptionMonths: 120 }), 404, NOT_FOUND);
    expect(await rowOf(saved.id)).toMatchObject({ prescriptionMonths: 96, active: false });
  });
});

/**
 * Las causas **referencian** la calificación, no copian su plazo (§3.5, D-08): por eso
 * cambiarlo se ve en la siguiente consulta de la causa, y darla de baja no se la saca.
 * Fechas del plan: hecho del 27/02/2021, 96 meses → 27/02/2029; 120 meses → 27/02/2031.
 */
describe('Las causas que registran una calificación modificada o dada de baja', () => {
  interface CaseQualification {
    id: number;
    name: string;
    prescriptionMonths: number;
    offenseDate: string;
    prescriptionStartsOn: string;
    prescriptionExpiresOn: string;
  }

  /** Una causa penal con un hecho del 27/02/2021 bajo esa calificación. */
  async function aCriminalCaseWith(legalQualificationId: number) {
    const client = await createClient();
    const lawyer = await createLawyer();
    const user = await createUser();
    const kase = await createCase({ clientId: client.id, responsibleLawyerId: lawyer.id, createdByUserId: user.id });
    await getPrisma().offense.create({
      data: {
        caseId: kase.id,
        legalQualificationId,
        offenseDate: new Date('2021-02-27T00:00:00.000Z'),
        // La columna que guarda el alta; ninguna lectura la usa (schema.prisma, `Offense`).
        prescriptionDate: new Date('2029-02-27T00:00:00.000Z'),
      },
    });
    return kase;
  }

  /** La calificación tal como la muestra `GET /cases/{caseId}`. */
  async function asTheCaseShowsIt(caseId: number, legalQualificationId: number) {
    const data = expectData<{ legalQualifications: CaseQualification[] }>(
      await server().get(`/api/v1/cases/${caseId}`).set(reader()),
      200,
    );
    return data.legalQualifications.find((q) => q.id === legalQualificationId);
  }

  const activeCasesOf = async (id: number) =>
    expectData<QualificationBody>(await server().get(`${URL}/${id}`).set(reader()), 200).activeCases;

  // CA-49.4 y CA-49.5
  it('cambiar el plazo recalcula la prescripción de sus causas desde la siguiente consulta, y no cambia cuántas la usan', async () => {
    const saved = await createLegalQualification({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 });
    const kase = await aCriminalCaseWith(saved.id);
    expect(await asTheCaseShowsIt(kase.id, saved.id)).toMatchObject({
      prescriptionMonths: 96,
      offenseDate: '2021-02-27',
      prescriptionStartsOn: '2021-02-27',
      prescriptionExpiresOn: '2029-02-27',
    });
    expect(await activeCasesOf(saved.id)).toBe(1);

    expectData(await patch(saved.id, { prescriptionMonths: 120 }), 200);

    expect(await asTheCaseShowsIt(kase.id, saved.id)).toMatchObject({
      name: 'Robo calificado — art. 167 inc. 2 CP',
      prescriptionMonths: 120,
      prescriptionStartsOn: '2021-02-27',
      prescriptionExpiresOn: '2031-02-27',
    });
    expect(await activeCasesOf(saved.id)).toBe(1);
  });

  // CA-50.3 y §4 Bajas: la baja procede sin 409 y las causas la conservan.
  it('se da de baja aunque haya causas que la registran, sin 409, y esas causas la siguen mostrando con su prescripción', async () => {
    const saved = await createLegalQualification({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 });
    const kase = await aCriminalCaseWith(saved.id);

    expectNoContent(await remove(saved.id));

    expect(await asTheCaseShowsIt(kase.id, saved.id)).toMatchObject({
      id: saved.id,
      name: 'Robo calificado — art. 167 inc. 2 CP',
      prescriptionMonths: 96,
      prescriptionStartsOn: '2021-02-27',
      prescriptionExpiresOn: '2029-02-27',
    });
    expect(await getPrisma().offense.count({ where: { legalQualificationId: saved.id } })).toBe(1);
  });
});

/**
 * `activeCases` de calificaciones legales (CA-47.8). Lo cuenta `cases`, dueño de la
 * definición de causa activa (§4), y llega por `ActiveCasesCounterPort.countByQualifications`,
 * que implementa `cases/infrastructure/acl/legal-parameters-active-cases-counter.adapter.ts`.
 *
 * Lo que no se ve desde acá es el conteo de una calificación dada de baja (RN12: sigue
 * contando sus causas): la calificación no se lista ni se consulta, así que su número no
 * tiene dónde mostrarse.
 */
describe('activeCases de /api/v1/legal-qualifications', () => {
  /** Una causa penal que registra `qualificationIds` como sus hechos. */
  async function aCaseWith(qualificationIds: number[], overrides: { currentCustomState?: string; currentStateId?: number } = {}) {
    const client = await createClient();
    const lawyer = await createLawyer();
    const user = await createUser();
    const kase = await createCase({
      clientId: client.id,
      responsibleLawyerId: lawyer.id,
      createdByUserId: user.id,
      ...overrides,
    });
    await getPrisma().offense.createMany({
      data: qualificationIds.map((legalQualificationId) => ({
        caseId: kase.id,
        legalQualificationId,
        offenseDate: new Date('2021-03-12T00:00:00.000Z'),
        prescriptionDate: new Date('2029-03-12T00:00:00.000Z'),
      })),
    });
    return kase;
  }

  it('el listado y el detalle devuelven el conteo real: una causa suma a cada una de sus calificaciones', async () => {
    const robo = await createLegalQualification();
    const lesiones = await createLegalQualification();
    const sinCausas = await createLegalQualification();
    await aCaseWith([robo.id, lesiones.id]);
    await aCaseWith([robo.id]);

    const list = expectPaginated<QualificationBody>(await server().get(URL).set(reader()));
    expect(new Map(list.map((q) => [q.id, q.activeCases]))).toEqual(
      new Map([
        [robo.id, 2],
        [lesiones.id, 1],
        [sinCausas.id, 0],
      ]),
    );
    expect(expectData<QualificationBody>(await server().get(`${URL}/${robo.id}`).set(reader()), 200).activeCases).toBe(2);
  });

  it('cuenta la causa en el estado inicial y la de estado escrito a mano; no la dada de baja ni la terminal', async () => {
    const qualification = await createLegalQualification();
    // Sin fijarle el nombre: el seed ya tiene una "Archivada" y chocaría con el índice
    // único por fuero. Sólo importa que sea terminal.
    const terminal = await createProceduralState({ terminal: true });
    await aCaseWith([qualification.id]);
    await aCaseWith([qualification.id], { currentCustomState: 'Con acusación, pero con oposición' });
    await aCaseWith([qualification.id], { currentStateId: terminal.stateId });
    const baja = await aCaseWith([qualification.id]);
    await deactivateCase(baja.id);

    const one = await server().get(`${URL}/${qualification.id}`).set(reader());

    expect(expectData<QualificationBody>(one, 200).activeCases).toBe(2);
  });
});

/**
 * Con login real: lo que se verifica es el **seed**. Desde la matriz del 2026-10-11
 * (§5.1) los tres perfiles consultan y registran calificaciones (CA-47.1, CA-47.10).
 */
describe('Permisos de /api/v1/legal-qualifications', () => {
  // CA-49.1 y CA-50.1: los tres perfiles modifican y dan de baja (matriz §5.1, RNF9).
  it.each(ROLES)('un %s consulta el listado y el detalle, registra, modifica y da de baja', async (role) => {
    const auth = await loginWithRole(role);

    const created = await server().post(URL).set(auth).send({ name: `Hurto simple ${role} — art. 162 CP`, prescriptionMonths: 24 });
    const { id } = expectData<QualificationBody>(created, 201);
    expectPaginated(await server().get(URL).set(auth));
    expectData(await server().get(`${URL}/${id}`).set(auth), 200);
    expectData(await server().patch(`${URL}/${id}`).set(auth).send({ prescriptionMonths: 30 }), 200);
    expectNoContent(await server().delete(`${URL}/${id}`).set(auth));
  });

  it('un token sin el permiso recibe 403 al modificar y al dar de baja, y la calificación no cambia', async () => {
    const saved = await createLegalQualification({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 });

    const withoutUpdate = loginAs({ permissions: ['qualification:read', 'qualification:delete'] });
    const withoutDelete = loginAs({ permissions: ['qualification:read', 'qualification:update'] });
    expectResponse(await patch(saved.id, { prescriptionMonths: 120 }, withoutUpdate), 403, FORBIDDEN);
    expectResponse(await remove(saved.id, withoutDelete), 403, FORBIDDEN);

    expect(await rowOf(saved.id)).toEqual({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96, active: true });
  });
});
