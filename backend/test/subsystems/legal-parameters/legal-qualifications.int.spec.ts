import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { purgeAuditLog } from '../../shared/harness/audit-log';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { createUser } from '../../shared/factories/user.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createProceduralState } from '../../shared/factories/procedural-state.factory';

/*
 * Recurso calificaciones legales (HU47, HU48). Contrato: API_CONTRACT_V5.md §3.
 *
 * Una sola app para los tres endpoints. Las variantes de la denominación y del plazo
 * (borde de 255 caracteres, plazo mínimo, recorte) están en `legal-qualification.spec.ts`
 * y en `register-legal-qualification.spec.ts`; acá queda la forma del contrato, cada
 * `code` de error una vez y lo que sólo la base puede probar. El 401 sin token está en
 * `test/smoke/app.int.spec.ts`.
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

let app: INestApplication;
const server = () => request(app.getHttpServer());

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
  await purgeAuditLog();
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
  it.each(ROLES)('un %s consulta el listado y el detalle, y registra', async (role) => {
    const auth = await loginWithRole(role);

    const created = await server().post(URL).set(auth).send({ name: `Hurto simple ${role} — art. 162 CP`, prescriptionMonths: 24 });
    const { id } = expectData<QualificationBody>(created, 201);
    expectPaginated(await server().get(URL).set(auth));
    expectData(await server().get(`${URL}/${id}`).set(auth), 200);
  });
});
