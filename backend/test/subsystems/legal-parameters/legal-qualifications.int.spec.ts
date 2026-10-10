import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { createUser } from '../../shared/factories/user.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';

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

/**
 * Crea un usuario con ese rol y lo loguea de verdad, para que el token
 * traiga los permisos que el **seed** le dio a ese rol.
 *
 * No alcanza con `loginAs`: ese firma el token con los permisos que se
 * le pasen, así que prueba el guard pero no la matriz — diría que un
 * rol puede registrar aunque el seed no le haya dado nada, que es
 * justo lo que CA-48.9 niega. Acá la cadena va entera: seed →
 * `role_permissions` → login → claims → guard.
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
    throw new Error(`login con rol ${role} falló: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { Authorization: `Bearer ${res.body.data.accessToken}` };
}

/**
 * Las calificaciones son referenciadas por `offenses` con `Restrict`,
 * así que los hechos van primero. El seed no crea ni unos ni otras,
 * pero un spec vecino podría dejarlos.
 */
async function limpiar() {
  await getPrisma().offense.deleteMany();
  await getPrisma().legalQualification.deleteMany();
}

describe('POST /api/v1/legal-qualifications', () => {
  let app: INestApplication;
  const writer = () => loginAs({ permissions: ['qualification:create'] });

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(limpiar);

  // ── Contrato ──────────────────────────────────────────────────────

  // CA-48.1
  it('registra la calificación y la devuelve en la forma del contrato', async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .set(writer())
      .send({ name: 'Hurto simple — art. 162 CP', prescriptionMonths: 24 });

    const data = expectData<QualificationBody>(res, 201);
    expect(data).toEqual({
      id: expect.any(Number),
      name: 'Hurto simple — art. 162 CP',
      prescriptionMonths: 24,
      active: true,
    });
  });

  /**
   * El contrato marca `activeCases` como *"solo en las respuestas de
   * `GET`"*, y el criterio detrás es CA-48.7: el alta no toca ninguna
   * causa, así que no hay conteo que informar todavía.
   */
  it('no incluye `activeCases` en la respuesta del alta', async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .set(writer())
      .send({ name: 'Amenazas coactivas — art. 149 bis CP', prescriptionMonths: 24 });

    expect(res.body.data).not.toHaveProperty('activeCases');
  });

  // ── Comunicación con la base ──────────────────────────────────────

  // CA-48.1: queda disponible para elegirse al registrar causas.
  it('persiste la calificación y la deja visible en el listado', async () => {
    const creada = await request(app.getHttpServer())
      .post(URL)
      .set(writer())
      .send({ name: 'Robo calificado — art. 167 inc. 2 CP', prescriptionMonths: 96 });

    const fila = await getPrisma().legalQualification.findUnique({
      where: { id: creada.body.data.id },
    });

    expect(fila).toMatchObject({
      name: 'Robo calificado — art. 167 inc. 2 CP',
      prescriptionMonths: 96,
      active: true,
    });
  });

  // CA-48.3
  it('guarda el plazo como la cantidad total de meses', async () => {
    // 6 años y 6 meses.
    const res = await request(app.getHttpServer())
      .post(URL)
      .set(writer())
      .send({ name: 'Abuso de armas — art. 104 CP', prescriptionMonths: 78 });

    expect(res.body.data.prescriptionMonths).toBe(78);
    const fila = await getPrisma().legalQualification.findUnique({
      where: { id: res.body.data.id },
    });
    expect(fila?.prescriptionMonths).toBe(78);
  });

  // ── Unicidad, contra el índice real (CA-48.4) ─────────────────────

  it('rechaza una denominación que ya tiene una calificación vigente', async () => {
    await createLegalQualification({ name: 'Hurto simple — art. 162 CP' });

    const res = await request(app.getHttpServer())
      .post(URL)
      .set(writer())
      .send({ name: 'Hurto simple — art. 162 CP', prescriptionMonths: 24 });

    expectError(res, 409, 'LEGAL_QUALIFICATION_ALREADY_EXISTS');
  });

  it.each([
    ['mayúsculas', 'HURTO SIMPLE — ART. 162 CP'],
    ['minúsculas', 'hurto simple — art. 162 cp'],
    ['espacios alrededor', '  Hurto simple — art. 162 CP  '],
  ])('la rechaza aunque difiera en %s', async (_caso, name) => {
    await createLegalQualification({ name: 'Hurto simple — art. 162 CP' });

    const res = await request(app.getHttpServer())
      .post(URL)
      .set(writer())
      .send({ name, prescriptionMonths: 24 });

    expectError(res, 409, 'LEGAL_QUALIFICATION_ALREADY_EXISTS');
  });

  /**
   * El índice es parcial (`WHERE active`), así que una calificación
   * dada de baja libera su denominación. Importa porque sin esto un
   * error de carga sería irreparable: se da de baja la calificación
   * mal escrita y su nombre queda tomado para siempre.
   */
  it('acepta la denominación de una calificación dada de baja', async () => {
    await createLegalQualification({ name: 'Hurto simple — art. 162 CP', active: false });

    const res = await request(app.getHttpServer())
      .post(URL)
      .set(writer())
      .send({ name: 'Hurto simple — art. 162 CP', prescriptionMonths: 24 });

    expect(res.status).toBe(201);
  });

  // ── Validación (CA-48.5, CA-48.6) ─────────────────────────────────

  it.each([
    ['sin denominación', { prescriptionMonths: 24 }, 'name'],
    ['sin plazo', { name: 'Hurto simple' }, 'prescriptionMonths'],
    ['con denominación vacía', { name: '   ', prescriptionMonths: 24 }, 'name'],
    ['con plazo cero', { name: 'Hurto simple', prescriptionMonths: 0 }, 'prescriptionMonths'],
    ['con plazo negativo', { name: 'Hurto simple', prescriptionMonths: -6 }, 'prescriptionMonths'],
    [
      'con denominación de más de 255 caracteres',
      { name: 'A'.repeat(256), prescriptionMonths: 24 },
      'name',
    ],
  ])('rechaza el alta %s nombrando el campo a corregir', async (_caso, body, campo) => {
    const res = await request(app.getHttpServer()).post(URL).set(writer()).send(body);

    expectError(res, 400, 'VALIDATION_ERROR', [campo]);
  });

  it('admite una denominación de exactamente 255 caracteres', async () => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .set(writer())
      .send({ name: 'A'.repeat(255), prescriptionMonths: 24 });

    expect(res.status).toBe(201);
  });

  // ── Acceso (CA-48.9) ──────────────────────────────────────────────

  /**
   * Con login real: lo que se verifica acá es el **seed**. La
   * escritura de la parametrización jurídica es del Administrador
   * solo, porque de ella depende la prescripción de todas las causas.
   */
  describe('escritura reservada al Administrador (CA-48.9)', () => {
    it('el Administrador puede registrar', async () => {
      const admin = await loginWithRole(app, 'ADMINISTRATOR');

      const res = await request(app.getHttpServer())
        .post(URL)
        .set(admin)
        .send({ name: 'Hurto simple — art. 162 CP', prescriptionMonths: 24 });

      expect(res.status).toBe(201);
    });

    it.each<TestRole>(['LAWYER', 'SECRETARY'])('%s no puede registrar', async (role) => {
      const auth = await loginWithRole(app, role);

      const res = await request(app.getHttpServer())
        .post(URL)
        .set(auth)
        .send({ name: `Hurto simple ${role} — art. 162 CP`, prescriptionMonths: 24 });

      expect(res.status).toBe(403);
    });

    /** Y no por haber fallado la validación: nada se persistió. */
    it('el rechazo no registra nada', async () => {
      const auth = await loginWithRole(app, 'LAWYER');

      await request(app.getHttpServer())
        .post(URL)
        .set(auth)
        .send({ name: 'Encubrimiento — art. 277 CP', prescriptionMonths: 36 })
        .expect(403);

      expect(await getPrisma().legalQualification.count()).toBe(0);
    });
  });

  it('exige autenticación', async () => {
    await request(app.getHttpServer())
      .post(URL)
      .send({ name: 'Hurto simple — art. 162 CP', prescriptionMonths: 24 })
      .expect(401);
  });
});

describe('GET /api/v1/legal-qualifications', () => {
  let app: INestApplication;
  const reader = () => loginAs({ permissions: ['qualification:read'] });

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(limpiar);

  // ── Contrato ──────────────────────────────────────────────────────

  // CA-47.1
  it('devuelve el sobre paginado con cada calificación en la forma del contrato', async () => {
    const saved = await createLegalQualification({
      name: 'Abuso de armas — art. 104 CP',
      prescriptionMonths: 78,
    });

    const res = await request(app.getHttpServer()).get(URL).set(reader());
    const data = expectPaginated<QualificationBody>(res, {
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
    });

    expect(data).toEqual([
      {
        id: saved.id,
        name: 'Abuso de armas — art. 104 CP',
        prescriptionMonths: 78,
        // CA-47.8 NO se cumple: el conteo real exige cruzar `offenses`
        // y `cases`, y antes que eso exige que `cases` defina qué es
        // una causa activa. Ver el comentario del mapper y T-01.
        activeCases: 0,
        active: true,
      },
    ]);
  });

  // ── Comunicación con la base ──────────────────────────────────────

  // CA-47.3
  it('ordena alfabéticamente por denominación', async () => {
    await createLegalQualification({ name: 'Hurto simple — art. 162 CP' });
    await createLegalQualification({ name: 'Abuso de armas — art. 104 CP' });
    await createLegalQualification({ name: 'Encubrimiento — art. 277 CP' });

    const res = await request(app.getHttpServer()).get(URL).set(reader());
    const data = expectPaginated<QualificationBody>(res);

    expect(data.map((q) => q.name)).toEqual([
      'Abuso de armas — art. 104 CP',
      'Encubrimiento — art. 277 CP',
      'Hurto simple — art. 162 CP',
    ]);
  });

  // CA-47.4
  it.each([
    ['el nombre del delito', 'hurto'],
    ['el artículo', 'art. 162'],
    ['un fragmento del artículo', '162'],
  ])('busca por %s', async (_caso, search) => {
    await createLegalQualification({ name: 'Hurto simple — art. 162 CP' });
    await createLegalQualification({ name: 'Abuso de armas — art. 104 CP' });

    const res = await request(app.getHttpServer()).get(URL).query({ search }).set(reader());
    const data = expectPaginated<QualificationBody>(res);

    expect(data.map((q) => q.name)).toEqual(['Hurto simple — art. 162 CP']);
  });

  it('busca sin distinguir mayúsculas', async () => {
    await createLegalQualification({ name: 'Hurto simple — art. 162 CP' });

    const res = await request(app.getHttpServer()).get(URL).query({ search: 'HURTO' }).set(reader());

    expect(expectPaginated<QualificationBody>(res)).toHaveLength(1);
  });

  // CA-47.6
  it('devuelve la colección vacía con total en cero, sin tratarlo como error', async () => {
    await createLegalQualification({ name: 'Hurto simple — art. 162 CP' });

    const res = await request(app.getHttpServer())
      .get(URL)
      .query({ search: 'no coincide con nada' })
      .set(reader());

    const data = expectPaginated<QualificationBody>(res, { totalItems: 0 });
    expect(data).toEqual([]);
  });

  // CA-47.9
  it('no lista las calificaciones dadas de baja', async () => {
    await createLegalQualification({ name: 'Hurto simple — art. 162 CP', active: true });
    await createLegalQualification({ name: 'Figura derogada — art. 0 CP', active: false });

    const res = await request(app.getHttpServer()).get(URL).set(reader());
    const data = expectPaginated<QualificationBody>(res, { totalItems: 1 });

    expect(data.map((q) => q.name)).toEqual(['Hurto simple — art. 162 CP']);
  });

  // CA-47.5
  it('pagina contra la base', async () => {
    await createLegalQualification({ name: 'A — art. 1 CP' });
    await createLegalQualification({ name: 'B — art. 2 CP' });
    await createLegalQualification({ name: 'C — art. 3 CP' });

    const res = await request(app.getHttpServer())
      .get(URL)
      .query({ page: 2, limit: 2 })
      .set(reader());
    const data = expectPaginated<QualificationBody>(res, {
      page: 2,
      limit: 2,
      totalItems: 3,
      totalPages: 2,
    });

    expect(data.map((q) => q.name)).toEqual(['C — art. 3 CP']);
  });

  // El código es propio, `INVALID_PAGINATION`, como pide el contrato (§5.3), y
  // lo comparten los cuatro listados del backend: lo resuelve el
  // `exceptionFactory` global cuando todo lo que falla es paginación
  // (`app.setup.ts`). `details` nombra los dos parámetros.
  it.each([
    ['page', { page: 0 }],
    ['limit', { limit: 500 }],
  ])('rechaza %s fuera de rango con INVALID_PAGINATION', async (_campo, query) => {
    const res = await request(app.getHttpServer()).get(URL).query(query).set(reader());

    expectError(res, 400, 'INVALID_PAGINATION', ['page', 'limit']);
  });

  // ── Acceso (CA-47.1, CA-47.11) ────────────────────────────────────

  /**
   * Con login real: la lectura es de cualquier autenticado, porque el
   * alta de causa —que opera cualquier perfil— ofrece el selector de
   * calificaciones (CA-47.10).
   */
  describe('lectura abierta a todos los perfiles (CA-47.1)', () => {
    it.each(ROLES)('%s puede consultar el listado', async (role) => {
      const auth = await loginWithRole(app, role);

      const res = await request(app.getHttpServer()).get(URL).set(auth);

      expect(res.status).toBe(200);
    });
  });

  // CA-47.11
  it('exige autenticación', async () => {
    await request(app.getHttpServer()).get(URL).expect(401);
  });
});

describe('GET /api/v1/legal-qualifications/{qualificationId}', () => {
  let app: INestApplication;
  const reader = () => loginAs({ permissions: ['qualification:read'] });

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(limpiar);

  // CA-47.7
  it('devuelve sus datos completos dentro del sobre `data`', async () => {
    const saved = await createLegalQualification({
      name: 'Robo calificado — art. 167 inc. 2 CP',
      prescriptionMonths: 96,
    });

    const res = await request(app.getHttpServer()).get(`${URL}/${saved.id}`).set(reader());

    const data = expectData<QualificationBody>(res, 200);
    expect(data).toEqual({
      id: saved.id,
      name: 'Robo calificado — art. 167 inc. 2 CP',
      prescriptionMonths: 96,
      activeCases: 0,
      active: true,
    });
  });

  it('responde 404 para una calificación inexistente', async () => {
    const res = await request(app.getHttpServer()).get(`${URL}/999999`).set(reader());

    expectError(res, 404, 'LEGAL_QUALIFICATION_NOT_FOUND');
  });

  /**
   * CA-47.9: una dada de baja no puede consultarse. Tiene que ser
   * indistinguible de una que nunca existió, así que el mismo 404 y
   * no un cuerpo con `active: false`.
   */
  it('responde 404 para una calificación dada de baja', async () => {
    const saved = await createLegalQualification({
      name: 'Figura derogada — art. 0 CP',
      active: false,
    });

    const res = await request(app.getHttpServer()).get(`${URL}/${saved.id}`).set(reader());

    expectError(res, 404, 'LEGAL_QUALIFICATION_NOT_FOUND');
  });

  it('rechaza un identificador que no es un entero', async () => {
    const res = await request(app.getHttpServer()).get(`${URL}/abc`).set(reader());

    expectError(res, 400, 'INVALID_PATH_PARAMETER', ['qualificationId']);
  });

  it.each(ROLES)('%s puede consultarla (CA-47.1)', async (role) => {
    const saved = await createLegalQualification();
    const auth = await loginWithRole(app, role);

    const res = await request(app.getHttpServer()).get(`${URL}/${saved.id}`).set(auth);

    expect(res.status).toBe(200);
  });

  it('exige autenticación', async () => {
    const saved = await createLegalQualification();

    await request(app.getHttpServer()).get(`${URL}/${saved.id}`).expect(401);
  });
});
