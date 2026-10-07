import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { startTestApp, stopTestApp, getPrisma } from '../../shared/harness/test-app';
import { expectError, expectPaginated } from '../../shared/contract/envelopes';
import { loginAs } from '../../shared/auth/login-as';
import { createInitialState, createProceduralState } from '../../shared/factories/procedural-state.factory';

const URL = '/api/v1/procedural-states';

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

describe('GET /api/v1/procedural-states', () => {
  let app: INestApplication;
  // Consultar estados está abierto a cualquier usuario autenticado: sin
  // permisos en el token alcanza. Se usa un abogado para que quede claro
  // que no hace falta ser administrador.
  const reader = () => loginAs({ roles: ['LAWYER'] });

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    // Causas y actos referencian estados y fueros con `Restrict`: van
    // primero por si un spec vecino los dejó.
    await prisma.offense.deleteMany();
    await prisma.proceduralAct.deleteMany();
    await prisma.case.deleteMany();
    await prisma.proceduralState.deleteMany(); // hija: referencia a jurisdictions
    await prisma.jurisdiction.deleteMany(); // padre
  });

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
  // El contrato pide INVALID_REQUEST / INVALID_PAGINATION. Hoy el
  // ValidationPipe global responde VALIDATION_ERROR, con `details`
  // indexado por campo; cambiar el code afecta a todos los módulos
  // (decisión del equipo pendiente).

  it.each([
    ['fuero inexistente', '?jurisdiction=FOO', 'jurisdiction'],
    ['página menor a 1', '?page=0', 'page'],
    ['límite mayor a 100', '?limit=101', 'limit'],
    ['parámetro desconocido', '?foo=1', 'foo'],
  ])('responde 400 ante %s', async (_case, query, field) => {
    const res = await get(query);

    expectError(res, 400, 'VALIDATION_ERROR', [field]);
  });
});
