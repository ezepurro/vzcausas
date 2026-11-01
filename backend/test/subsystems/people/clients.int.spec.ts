import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { expectError, expectPaginated } from '../../shared/contract/envelopes';
import * as bcrypt from 'bcryptjs';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createProceduralState } from '../../shared/factories/procedural-state.factory';
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
    // Las causas referencian clientes con `Restrict`, así que van primero. El
    // seed no crea ni unas ni otros, pero un spec vecino podría dejarlas.
    //
    // Y antes que las causas van sus hijas: los hechos y los actos procesales
    // las referencian, también con `Restrict`. Borrar sólo `case` funcionaba
    // mientras ningún spec vecino dejaba actos; desde que `cases` tiene specs
    // que los crean, falla con
    // `procedural_acts_case_id_fkey` según el orden en que Jest corra las
    // suites — o sea, de forma intermitente. Mismo orden que
    // `test/subsystems/cases/case-query.int.spec.ts:49`.
    await getPrisma().offense.deleteMany();
    // La causa apunta a su acto vigente: hay que soltar la FK antes de
    // borrar los actos, o el DELETE la viola.
    await getPrisma().case.updateMany({ data: { currentProceduralActId: null } });
    await getPrisma().proceduralAct.deleteMany();
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

    /**
     * Desde la matriz del 2026-10-11 (§5.1) los tres perfiles
     * administran clientes. Antes el alta era solo de Secretaría
     * (CA-8.9, D-05) y el Administrador recibía 403.
     */
    it.each(ROLES)('%s puede dar de alta', async (role) => {
      const auth = await loginWithRole(app, role);

      await request(app.getHttpServer())
        .post(URL)
        .set(auth)
        .send({ lastName: 'TEST', firstName: role, dni: '26111222' })
        .expect(201);
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
    // Mismo orden completo que el `beforeEach` de arriba: los hechos y los
    // actos procesales referencian la causa con `Restrict`, y la causa apunta
    // a su acto vigente. Borrar sólo `case` alcanzaba mientras ninguna suite
    // vecina dejaba actos; ahora `register-procedural-act.int.spec.ts` los
    // deja, y sin esto el spec falla según el orden de las suites.
    await getPrisma().offense.deleteMany();
    await getPrisma().case.updateMany({ data: { currentProceduralActId: null } });
    await getPrisma().proceduralAct.deleteMany();
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

/**
 * `activeCases` de clientes y abogados (contrato §3.6 y §3.3, V3 §8.4).
 *
 * Lo cuenta `cases`, dueño de la definición de causa activa (§4), y llega por
 * el `ActiveCasesCounterPort` que declara `people` e implementa
 * `cases/infrastructure/acl/people-active-cases-counter.adapter.ts`. Hasta el
 * 10/10/2026 los dos mappers devolvían una constante `0`.
 *
 * Lo que se verifica acá es el **cableado**: que el número cruce el borde
 * entre subsistemas y llegue al JSON. La semántica del conteo está probada
 * contra la base en el `describe` de `countActiveByResponsibleLawyer` y
 * `countActiveByClient` de `test/subsystems/cases/case-query.int.spec.ts`.
 */
describe('activeCases de clientes y abogados', () => {
  let app: INestApplication;
  // Un solo token para los dos listados: `GET /clients` y `GET /lawyers`
  // piden cualquier usuario autenticado, con su permiso de lectura.
  const reader = () => loginAs({ permissions: ['client:read', 'lawyer:read'] });

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(async () => {
    await getPrisma().offense.deleteMany();
    await getPrisma().case.updateMany({ data: { currentProceduralActId: null } });
    await getPrisma().proceduralAct.deleteMany();
    await getPrisma().case.deleteMany();
    await getPrisma().client.deleteMany();
    await getPrisma().user.deleteMany(); // referencia a lawyers
    await getPrisma().lawyer.deleteMany();
  });

  /** Cliente, abogado y usuario, más `n` causas que los tienen a los dos. */
  async function withCases(n: number) {
    const client = await createClient();
    const lawyer = await createLawyer();
    const user = await createUser();
    for (let i = 0; i < n; i += 1) {
      await createCase({
        clientId: client.id,
        responsibleLawyerId: lawyer.id,
        createdByUserId: user.id,
      });
    }
    return { clientId: client.id, lawyerId: lawyer.id, userId: user.id };
  }

  it('el listado y el detalle de un cliente devuelven el conteo real', async () => {
    const { clientId } = await withCases(2);
    const auth = reader();

    const list = await request(app.getHttpServer()).get(URL).set(auth);
    expect(expectPaginated<ClientBody>(list).map((c) => [c.id, c.activeCases])).toEqual([
      [clientId, 2],
    ]);

    const one = await request(app.getHttpServer()).get(`${URL}/${clientId}`).set(auth);
    expect(one.body.data.activeCases).toBe(2);
  });

  it('el listado de abogados devuelve el conteo real', async () => {
    const { lawyerId } = await withCases(3);

    const res = await request(app.getHttpServer()).get('/api/v1/lawyers').set(reader());

    const found = expectPaginated<{ id: number; activeCases: number }>(res).find(
      (l) => l.id === lawyerId,
    );
    expect(found?.activeCases).toBe(3);
  });

  it('un cliente y un abogado sin causas devuelven 0', async () => {
    const client = await createClient();
    await createLawyer();

    const one = await request(app.getHttpServer()).get(`${URL}/${client.id}`).set(reader());

    expect(one.body.data.activeCases).toBe(0);
  });

  /**
   * La mitad de la asimetría del §4 que se ve desde este lado: `createCase`
   * deja la causa en el estado inicial, y para su cliente y su abogado **sí**
   * cuenta. Para el `activeCases` de un estado procesal no contaría.
   */
  it('la causa en el estado inicial cuenta para su cliente y su abogado', async () => {
    const { clientId } = await withCases(1);

    const one = await request(app.getHttpServer()).get(`${URL}/${clientId}`).set(reader());

    expect(one.body.data.activeCases).toBe(1);
  });

  it('no cuenta la causa dada de baja ni la de un estado terminal', async () => {
    const { clientId, lawyerId, userId } = await withCases(0);
    const quedaActiva = await createCase({
      clientId,
      responsibleLawyerId: lawyerId,
      createdByUserId: userId,
    });
    const baja = await createCase({ clientId, responsibleLawyerId: lawyerId, createdByUserId: userId });
    const archivada = await createCase({
      clientId,
      responsibleLawyerId: lawyerId,
      createdByUserId: userId,
    });
    await deactivateCase(baja.id);
    // Sin fijarle el nombre, a propósito. Este spec **no** borra los estados
    // procesales en su `beforeEach`, así que los 18 que siembra el seed siguen
    // ahí, y uno se llama "Archivada": fijar ese nombre choca con
    // `procedural_states_jurisdiction_name_active_key`. La factory genera un
    // nombre con contador justo para esto (`procedural-state.factory.ts:62`).
    // Lo único que el test necesita es que el estado sea terminal.
    const terminal = await createProceduralState({ terminal: true });
    await getPrisma().case.update({
      where: { id: archivada.id },
      data: { currentStateId: terminal.stateId },
    });

    const one = await request(app.getHttpServer()).get(`${URL}/${clientId}`).set(reader());

    expect(quedaActiva.id).toBeDefined();
    expect(one.body.data.activeCases).toBe(1);
  });
});
