import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { expectError, expectPaginated } from '../../shared/contract/envelopes';
import * as bcrypt from 'bcryptjs';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { createUser } from '../../shared/factories/user.factory';

const URL = '/api/v1/clients';

interface ClientBody {
  id: number;
  lastName: string;
  firstName: string;
  dni: string;
  phone: string | null;
  email: string | null;
  clientSince: string;
  activeCases: number;
  active: boolean;
}

const PASSWORD = 'password1';

/**
 * Crea un usuario con ese rol y lo loguea de verdad, para que el token
 * traiga los permisos que el **seed** le dio a ese rol.
 *
 * No alcanza con `loginAs`: ese firma el token con los permisos que se
 * le pasen, así que prueba el guard pero no la matriz — diría que un
 * rol puede leer aunque el seed no le haya dado nada. Acá la cadena va
 * entera: seed → `role_permissions` → login → claims → guard.
 *
 * Tampoco sirven los usuarios del fixture de desarrollo: están
 * condicionados a `NODE_ENV === 'development'` y el harness corre en
 * `'test'`. Ese gate es deliberado y no se toca.
 */
async function loginWithRole(app: INestApplication, role: TestRole) {
  const user = await createUser({
    roles: [role],
    passwordHash: await bcrypt.hash(PASSWORD, 4),
  });

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username: user.username, password: PASSWORD });

  if (res.status !== 200) {
    throw new Error(
      `login con rol ${role} falló: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return { Authorization: `Bearer ${res.body.data.accessToken}` };
}

const ROLES: TestRole[] = ['ADMINISTRATOR', 'LAWYER', 'SECRETARY'];

describe('GET /api/v1/clients', () => {
  let app: INestApplication;
  const reader = () => loginAs({ permissions: ['client:read'] });
  const writer = () => loginAs({ permissions: ['client:create'] });

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(async () => {
    // Las causas referencian clientes con `Restrict`, así que van
    // primero. El seed no crea ni unas ni otros, pero un spec vecino
    // podría dejarlas.
    await getPrisma().case.deleteMany();
    await getPrisma().client.deleteMany();
  });

  async function registrar(body: Partial<ClientBody> & { lastName: string; firstName: string; dni: string }) {
    const res = await request(app.getHttpServer())
      .post(URL)
      .set(writer())
      .send(body);
    if (res.status !== 201) {
      throw new Error(`alta falló: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return res.body.data as ClientBody;
  }

  // ── Contrato ──────────────────────────────────────────────────────

  it('devuelve el sobre paginado con cada cliente en la forma del contrato', async () => {
    await registrar({ lastName: 'BENÍTEZ', firstName: 'Rodrigo E.', dni: '31556208' });

    const res = await request(app.getHttpServer()).get(URL).set(reader());
    const data = expectPaginated<ClientBody>(res, { page: 1, limit: 20, totalItems: 1, totalPages: 1 });

    expect(data[0]).toEqual({
      id: expect.any(Number),
      lastName: 'BENÍTEZ',
      firstName: 'Rodrigo E.',
      dni: '31556208',
      phone: null,
      email: null,
      clientSince: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      activeCases: 0,
      active: true,
    });
  });

  /**
   * El helper compartido fuerza `totalPages` a 1 como mínimo: la
   * paginación del contrato arranca en la página 1, y reportar 0
   * páginas describe un rango al que ninguna petición válida llega.
   */
  it('reporta una página aunque no haya clientes', async () => {
    const res = await request(app.getHttpServer()).get(URL).set(reader());
    expectPaginated(res, { page: 1, limit: 20, totalItems: 0, totalPages: 1 });
  });

  // ── Comunicación con la base ──────────────────────────────────────

  // CA-9.1
  it('ordena por apellido y, dentro del apellido, por nombres', async () => {
    await registrar({ lastName: 'GÓMEZ', firstName: 'Zulema', dni: '30111111' });
    await registrar({ lastName: 'ACOSTA', firstName: 'Luis', dni: '30222222' });
    await registrar({ lastName: 'GÓMEZ', firstName: 'Ariel', dni: '30333333' });

    const res = await request(app.getHttpServer()).get(URL).set(reader());
    const data = expectPaginated<ClientBody>(res);

    expect(data.map((c) => `${c.lastName} ${c.firstName}`)).toEqual([
      'ACOSTA Luis',
      'GÓMEZ Ariel',
      'GÓMEZ Zulema',
    ]);
  });

  // CA-9.2
  it.each([
    ['apellido', 'BENÍ'],
    ['nombres', 'Rodrigo'],
    ['documento', '31556208'],
  ])('busca por %s', async (_campo, search) => {
    await registrar({ lastName: 'BENÍTEZ', firstName: 'Rodrigo E.', dni: '31556208' });
    await registrar({ lastName: 'MOLINA', firstName: 'Daniel', dni: '28999888' });

    const res = await request(app.getHttpServer()).get(URL).query({ search }).set(reader());
    const data = expectPaginated<ClientBody>(res);

    expect(data.map((c) => c.lastName)).toEqual(['BENÍTEZ']);
  });

  it('busca sin distinguir mayúsculas', async () => {
    await registrar({ lastName: 'BENÍTEZ', firstName: 'Rodrigo E.', dni: '31556208' });

    const res = await request(app.getHttpServer()).get(URL).query({ search: 'bení' }).set(reader());

    expect(expectPaginated<ClientBody>(res)).toHaveLength(1);
  });

  it('pagina contra la base', async () => {
    await registrar({ lastName: 'A', firstName: 'Uno', dni: '20111111' });
    await registrar({ lastName: 'B', firstName: 'Dos', dni: '20222222' });
    await registrar({ lastName: 'C', firstName: 'Tres', dni: '20333333' });

    const res = await request(app.getHttpServer()).get(URL).query({ page: 2, limit: 2 }).set(reader());
    const data = expectPaginated<ClientBody>(res, { page: 2, limit: 2, totalItems: 3, totalPages: 2 });

    expect(data.map((c) => c.lastName)).toEqual(['C']);
  });

  // ── Acceso (CA-9.3) ───────────────────────────────────────────────

  /**
   * Con login real: lo que se verifica acá es el **seed**. RN11 dice
   * que todo el estudio ve todo; la diferencia entre perfiles está en
   * lo que pueden operar, no en lo que pueden ver.
   */
  describe('acceso universal (CA-9.3)', () => {
    it.each(ROLES)('%s puede consultar el listado', async (role) => {
      const auth = await loginWithRole(app, role);

      const res = await request(app.getHttpServer()).get(URL).set(auth);

      expect(res.status).toBe(200);
    });

    /** El alta sigue siendo solo de Secretaría (CA-8.9). */
    it('solo Secretaría puede dar de alta', async () => {
      const secretaria = await loginWithRole(app, 'SECRETARY');
      const admin = await loginWithRole(app, 'ADMINISTRATOR');
      const body = { lastName: 'TEST', firstName: 'Alta', dni: '26111222' };

      await request(app.getHttpServer()).post(URL).set(secretaria).send(body).expect(201);
      await request(app.getHttpServer())
        .post(URL)
        .set(admin)
        .send({ ...body, dni: '26111333' })
        .expect(403);
    });
  });

  // ── Errores ───────────────────────────────────────────────────────

  // CA-9.6
  //
  // El código es `INVALID_PAGINATION`, no el `VALIDATION_ERROR` genérico: el
  // contrato le da una entrada propia en el catálogo de §5.3, y los cuatro
  // listados paginados la comparten (`app.setup.ts`, `toFieldKeyedBadRequest`).
  // `details` nombra los dos parámetros, como el ejemplo del contrato.
  it.each([
    ['page', { page: 0 }],
    ['limit', { limit: 500 }],
  ])('rechaza %s fuera de rango con INVALID_PAGINATION', async (_campo, query) => {
    const res = await request(app.getHttpServer()).get(URL).query(query).set(reader());

    expectError(res, 400, 'INVALID_PAGINATION', ['page', 'limit']);
  });

  it('exige autenticación', async () => {
    await request(app.getHttpServer()).get(URL).expect(401);
  });
});

describe('GET /api/v1/clients/{clientId}', () => {
  let app: INestApplication;
  const reader = () => loginAs({ permissions: ['client:read'] });
  const writer = () => loginAs({ permissions: ['client:create'] });

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(async () => {
    await getPrisma().case.deleteMany();
    await getPrisma().client.deleteMany();
  });

  it('devuelve el cliente dentro del sobre `data`', async () => {
    const creado = await request(app.getHttpServer())
      .post(URL)
      .set(writer())
      .send({ lastName: 'BENÍTEZ', firstName: 'Rodrigo E.', dni: '31556208' });

    const res = await request(app.getHttpServer())
      .get(`${URL}/${creado.body.data.id}`)
      .set(reader());

    expect(res.status).toBe(200);
    expect(res.body.data.dni).toBe('31556208');
  });

  it('responde 404 para un cliente inexistente', async () => {
    const res = await request(app.getHttpServer()).get(`${URL}/9999`).set(reader());

    expectError(res, 404, 'CLIENT_NOT_FOUND');
  });

  it('rechaza un identificador que no es un entero', async () => {
    const res = await request(app.getHttpServer()).get(`${URL}/abc`).set(reader());

    expectError(res, 400, 'INVALID_PATH_PARAMETER', ['clientId']);
  });
});

/**
 * La matriz de permisos también cubre `/lawyers`: su lectura es de
 * cualquier autenticado. Antes de HU-9 el seed dejaba a `LAWYER` con
 * la lista vacía y el endpoint le respondía 403, contra la matriz, sin
 * que ningún test lo viera.
 */
describe('GET /api/v1/lawyers — la matriz, del otro lado', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  it.each(ROLES)('%s puede consultar abogados', async (role) => {
    const auth = await loginWithRole(app, role);

    const res = await request(app.getHttpServer()).get('/api/v1/lawyers').set(auth);

    expect(res.status).toBe(200);
  });
});
