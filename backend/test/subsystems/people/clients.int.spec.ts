import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createProceduralState } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';

/*
 * Recurso clientes (HU8, HU9). Contrato: API_CONTRACT_V5.md §3.6. Una sola app para
 * los tres endpoints. El 401 sin token está en `test/smoke/app.int.spec.ts`; las reglas
 * del documento, en `client-document.vo.spec.ts` y `register-client.use-case.spec.ts`.
 */

const URL = '/api/v1/clients';

interface ClientBody {
  id: number;
  lastName: string;
  firstName: string;
  documentType: string;
  documentNumber: string;
  address: string;
  phone: string;
  email: string | null;
  clientSince: string;
  activeCases: number;
  active: boolean;
}

const PASSWORD = 'password1';
const ROLES: TestRole[] = ['ADMINISTRATOR', 'LAWYER', 'SECRETARY'];

const reader = () => loginAs({ permissions: ['client:read'] });
const writer = () => loginAs({ permissions: ['client:create'] });

let app: INestApplication;
const server = () => request(app.getHttpServer());
const post = (body: object) => server().post(URL).set(writer()).send(body);

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await stopTestApp();
});

beforeEach(async () => {
  // Las causas referencian clientes con `Restrict`, y antes que las causas van sus
  // hijas (hechos y actos). La causa apunta a su acto vigente: ese vínculo se suelta
  // antes de borrar los actos. Usuarios y abogados, porque las factories numeran
  // matrícula y usuario desde 1 en cada suite.
  const prisma = getPrisma();
  await prisma.offense.deleteMany();
  await prisma.case.updateMany({ data: { currentProceduralActId: null } });
  await prisma.proceduralAct.deleteMany();
  await prisma.case.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany(); // referencia a lawyers
  await prisma.lawyer.deleteMany();
});

describe('POST /api/v1/clients', () => {
  // CA-8.1
  it('registra el cliente: 201 en la forma del contrato, con activeCases en 0', async () => {
    const res = await post({
      lastName: 'BENÍTEZ',
      firstName: 'Rodrigo E.',
      documentType: 'DNI',
      documentNumber: '31556208',
      address: 'Av. Rafael Núñez 4560, Córdoba',
      phone: '351 401-5573',
      email: 'rbenitez@gmail.com',
    });

    const data = expectData<ClientBody>(res, 201);
    expect(data).toEqual({
      id: expect.any(Number),
      lastName: 'BENÍTEZ',
      firstName: 'Rodrigo E.',
      documentType: 'DNI',
      documentNumber: '31556208',
      address: 'Av. Rafael Núñez 4560, Córdoba',
      phone: '351 401-5573',
      email: 'rbenitez@gmail.com',
      clientSince: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      activeCases: 0,
      active: true,
    });
    expect(await getPrisma().client.findUnique({ where: { id: data.id } })).toMatchObject({
      documentType: 'DNI',
      documentNumber: '31556208',
      address: 'Av. Rafael Núñez 4560, Córdoba',
      active: true,
    });
  });

  // D-108: un cliente extranjero se registra con pasaporte, que se guarda en mayúsculas.
  it('registra un cliente con pasaporte', async () => {
    const res = await post({
      lastName: 'SMITH',
      firstName: 'John',
      documentType: 'PASSPORT',
      documentNumber: 'AAE482915',
      address: '221B Baker Street, Londres',
      phone: '+44 20 7946 0958',
    });

    expect(expectData<ClientBody>(res, 201)).toMatchObject({
      documentType: 'PASSPORT',
      documentNumber: 'AAE482915',
      address: '221B Baker Street, Londres',
    });
  });

  /**
   * Documento único por tipo entre los vigentes, contra el índice parcial
   * `clients_document_active_key` (D-108).
   *
   * Desvío nombrado, sin fijar: el contrato pide `details: null` y hoy llega
   * `{ field: "documentNumber" }` (`people.errors.ts`). Por eso no se usa `expectError`.
   */
  it('rechaza con 409 un documento de un cliente vigente, pero no el mismo número de otro tipo', async () => {
    await createClient({ documentType: 'DNI', documentNumber: '31556208' });
    const body = { lastName: 'OTRO', firstName: 'Cliente', address: 'Calle 1', phone: '351 111-1111' };

    const res = await post({ ...body, documentType: 'DNI', documentNumber: '31556208' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'CLIENT_DNI_ALREADY_EXISTS',
      message: 'Ya existe un cliente registrado con ese DNI.',
    });
    expect(await getPrisma().client.count({ where: { documentNumber: '31556208' } })).toBe(1);

    // Un pasaporte con el mismo número es otro documento: no choca.
    const passport = await post({ ...body, documentType: 'PASSPORT', documentNumber: '31556208' });
    expectData<ClientBody>(passport, 201);
  });

  // D-108, D-109
  it('responde 400 nombrando cada campo inválido y no guarda nada', async () => {
    const res = await post({
      lastName: 'BENÍTEZ',
      firstName: 'Rodrigo E.',
      documentType: 'DNI',
      documentNumber: '31.556.208',
      address: '   ',
      email: 'no-es-un-correo',
    });

    expectError(res, 400, 'VALIDATION_ERROR', ['documentNumber', 'address', 'phone', 'email']);
    expect(Object.keys(res.body.error.details).sort()).toEqual(['address', 'documentNumber', 'email', 'phone']);
    expect(await getPrisma().client.count()).toBe(0);
  });
});

describe('GET /api/v1/clients', () => {
  const get = (query: Record<string, unknown> = {}) => server().get(URL).query(query).set(reader());

  // CA-9.1: por apellido y, dentro del apellido, por nombres.
  it('devuelve el sobre paginado en la forma del contrato, ordenado por apellido y nombres', async () => {
    const zulema = await createClient({ lastName: 'GÓMEZ', firstName: 'Zulema' });
    const luis = await createClient({ lastName: 'ACOSTA', firstName: 'Luis', email: null });
    const ariel = await createClient({ lastName: 'GÓMEZ', firstName: 'Ariel' });

    const data = expectPaginated<ClientBody>(await get(), { page: 1, limit: 20, totalItems: 3, totalPages: 1 });

    expect(data.map((c) => c.id)).toEqual([luis.id, ariel.id, zulema.id]);
    expect(data[0]).toEqual({
      id: luis.id,
      lastName: 'ACOSTA',
      firstName: 'Luis',
      documentType: 'DNI',
      documentNumber: luis.documentNumber,
      address: luis.address,
      phone: luis.phone,
      email: null,
      clientSince: '2021-03-12',
      activeCases: 0,
      active: true,
    });
  });

  /**
   * CA-9.2: apellido, nombres y documento, sin distinguir mayúsculas.
   *
   * Desvío nombrado, sin fijar: para una colección vacía el contrato pide `totalPages`
   * en 0 (`API_CONTRACT_V5.md:8350`) y hoy llega 1, porque `paginate` lo fuerza
   * (`pagination.ts:84`). Por eso la búsqueda sin resultados mira `totalItems` y no
   * `totalPages`.
   */
  it('busca por apellido, nombres y documento, sin distinguir mayúsculas', async () => {
    const benitez = await createClient({ lastName: 'BENÍTEZ', firstName: 'Rodrigo E.', documentNumber: '31556208' });
    await createClient({ lastName: 'MOLINA', firstName: 'Daniel', documentNumber: '28999888' });

    for (const search of ['bení', 'Rodrigo', '31556208']) {
      expect(expectPaginated<ClientBody>(await get({ search })).map((c) => c.id)).toEqual([benitez.id]);
    }
    expect(expectPaginated(await get({ search: 'no coincide' }), { totalItems: 0 })).toEqual([]);
  });

  it('pagina contra la base', async () => {
    await createClient({ lastName: 'A' });
    await createClient({ lastName: 'B' });
    const third = await createClient({ lastName: 'C' });

    const data = expectPaginated<ClientBody>(await get({ page: 2, limit: 2 }), {
      page: 2,
      limit: 2,
      totalItems: 3,
      totalPages: 2,
    });

    expect(data.map((c) => c.id)).toEqual([third.id]);
  });

  // CA-9.6
  it('responde 400 INVALID_PAGINATION con una página fuera de rango', async () => {
    expectError(await get({ page: 0 }), 400, 'INVALID_PAGINATION', ['page', 'limit']);
  });
});

describe('GET /api/v1/clients/{clientId}', () => {
  const getById = (id: number | string) => server().get(`${URL}/${id}`).set(reader());

  it('devuelve el cliente en la forma del contrato', async () => {
    const client = await createClient({ lastName: 'BENÍTEZ', firstName: 'Rodrigo E.', documentNumber: '31556208' });

    expect(expectData<ClientBody>(await getById(client.id), 200)).toEqual({
      id: client.id,
      lastName: 'BENÍTEZ',
      firstName: 'Rodrigo E.',
      documentType: 'DNI',
      documentNumber: '31556208',
      address: client.address,
      phone: client.phone,
      email: client.email,
      clientSince: '2021-03-12',
      activeCases: 0,
      active: true,
    });
  });

  it('responde 404 para un cliente inexistente y 400 para un identificador que no es un entero', async () => {
    expectError(await getById(999999), 404, 'CLIENT_NOT_FOUND');
    expectError(await getById('abc'), 400, 'INVALID_PATH_PARAMETER', ['clientId']);
  });
});

/**
 * `activeCases` de clientes (§3.6). Lo cuenta `cases`, dueño de la definición de causa
 * activa (§4), y llega por el `ActiveCasesCounterPort` que declara `people` e implementa
 * `cases/infrastructure/acl/people-active-cases-counter.adapter.ts`. El de abogados
 * está en `lawyers.int.spec.ts`.
 */
describe('activeCases de /api/v1/clients', () => {
  async function anOwner() {
    const lawyer = await createLawyer();
    const user = await createUser();
    return { responsibleLawyerId: lawyer.id, createdByUserId: user.id };
  }

  it('el listado y el detalle devuelven el conteo real de cada cliente, con 0 para uno sin causas', async () => {
    const owner = await anOwner();
    const conDos = await createClient();
    const sinCausas = await createClient();
    await createCase({ ...owner, clientId: conDos.id });
    await createCase({ ...owner, clientId: conDos.id });

    const list = expectPaginated<ClientBody>(await server().get(URL).set(reader()));
    const one = expectData<ClientBody>(await server().get(`${URL}/${conDos.id}`).set(reader()), 200);

    expect(new Map(list.map((c) => [c.id, c.activeCases]))).toEqual(
      new Map([
        [conDos.id, 2],
        [sinCausas.id, 0],
      ]),
    );
    expect(one.activeCases).toBe(2);
  });

  /**
   * La asimetría del §4 que se ve desde este lado: la causa en el estado inicial **sí**
   * cuenta para su cliente (para el `activeCases` de un estado procesal no contaría), y
   * la de estado escrito a mano también es activa.
   */
  it('cuenta la causa en el estado inicial y la de estado escrito a mano; no la dada de baja ni la terminal', async () => {
    const client = await createClient();
    const owner = { ...(await anOwner()), clientId: client.id };
    // Sin fijarle el nombre: el seed ya tiene una "Archivada" y chocaría con
    // `procedural_states_jurisdiction_name_active_key`. Sólo importa que sea terminal.
    const terminal = await createProceduralState({ terminal: true });
    await createCase(owner);
    await createCase({ ...owner, currentCustomState: 'Con acusación, pero con oposición' });
    await createCase({ ...owner, currentStateId: terminal.stateId });
    const baja = await createCase(owner);
    await deactivateCase(baja.id);

    const one = await server().get(`${URL}/${client.id}`).set(reader());

    expect(expectData<ClientBody>(one, 200).activeCases).toBe(2);
  });
});

/**
 * Con login real: lo que se verifica es el **seed** (seed → `role_permissions` → login
 * → claims → guard). RN11: todo el estudio ve todo, y desde la matriz del 2026-10-11
 * (§5.1) los tres perfiles dan de alta clientes (CA-9.3).
 */
describe('Permisos de /api/v1/clients', () => {
  it.each(ROLES)('un %s consulta el listado y el detalle, y da de alta', async (role) => {
    const user = await createUser({ roles: [role], passwordHash: await bcrypt.hash(PASSWORD, 4) });
    const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: PASSWORD });
    expect(login.status).toBe(200);
    const auth = { Authorization: `Bearer ${login.body.data.accessToken}` };

    const created = await server().post(URL).set(auth).send({
      lastName: 'TEST',
      firstName: role,
      documentType: 'DNI',
      documentNumber: '26111222',
      address: 'Calle 1',
      phone: '351 111-1111',
    });
    const { id } = expectData<ClientBody>(created, 201);
    expectPaginated(await server().get(URL).set(auth));
    expectData(await server().get(`${URL}/${id}`).set(auth), 200);
  });
});
