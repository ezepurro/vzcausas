import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { startTestApp, stopTestApp, getPrisma } from '../../shared/harness/test-app';
import { expectError, expectPaginated } from '../../shared/contract/envelopes';
import { createProceduralState } from '../../shared/factories/procedural-state.factory';

const URL = '/api/v1/procedural-states';

interface ProceduralStateBody {
  id: number;
  name: string;
  jurisdiction: string;
  position: number;
  timeLimitDays: number;
  dayType: string;
  terminal: boolean;
  activeCases: number;
  active: boolean;
}

/*
 * Pendiente: 401 sin token y 403 sin rol ADMINISTRATOR (API_CONTRACT_V2 §3.4).
 * Se agregan cuando `identity` exponga el JwtAuthGuard y el endpoint quede protegido.
 */
describe('GET /api/v1/procedural-states', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(async () => {
    await getPrisma().proceduralState.deleteMany(); // hija: referencia a jurisdictions
    await getPrisma().jurisdiction.deleteMany(); // padre
  });

  // ── Contrato ──────────────────────────────────────────────────────

  it('devuelve el sobre paginado con cada estado en la forma del contrato', async () => {
    const saved = await createProceduralState({
      jurisdiction: 'CRIMINAL',
      name: 'Oposición al requerimiento de elevación',
      position: 4,
      timeLimitDays: 5,
      dayType: 'BUSINESS',
      terminal: false,
    });

    const res = await request(app.getHttpServer()).get(URL);

    const data = expectPaginated<ProceduralStateBody>(res, { page: 1, limit: 20, totalItems: 1, totalPages: 1 });
    expect(data).toEqual([
      {
        id: saved.stateId,
        name: 'Oposición al requerimiento de elevación',
        jurisdiction: 'CRIMINAL',
        position: 4,
        timeLimitDays: 5,
        dayType: 'BUSINESS',
        terminal: false,
        activeCases: 0,
        active: true,
      },
    ]);
  });

  it('devuelve una colección vacía cuando no hay estados cargados', async () => {
    const res = await request(app.getHttpServer()).get(URL);

    const data = expectPaginated(res, { totalItems: 0, totalPages: 0 });
    expect(data).toEqual([]);
  });

  it('informa como NONE un estado sin tipo de día en la base', async () => {
    await createProceduralState({ timeLimitDays: 0, dayType: null, terminal: true });

    const res = await request(app.getHttpServer()).get(URL);

    const [state] = expectPaginated<ProceduralStateBody>(res);
    expect(state.dayType).toBe('NONE');
  });

  // ── Comunicación con la base ──────────────────────────────────────

  it('devuelve los estados tal como están guardados, con su fuero', async () => {
    const criminal = await createProceduralState({ jurisdiction: 'CRIMINAL' });
    const amparo = await createProceduralState({ jurisdiction: 'AMPARO' });

    const res = await request(app.getHttpServer()).get(URL);

    const data = expectPaginated<ProceduralStateBody>(res, { totalItems: 2 });
    const byId = new Map(data.map((s) => [s.id, s]));
    expect(byId.get(criminal.stateId)).toMatchObject({ name: criminal.name, jurisdiction: 'CRIMINAL' });
    expect(byId.get(amparo.stateId)).toMatchObject({ name: amparo.name, jurisdiction: 'AMPARO' });
  });

  it('pagina contra la base', async () => {
    await createProceduralState({ position: 1 });
    await createProceduralState({ position: 2 });
    const third = await createProceduralState({ position: 3 });

    const res = await request(app.getHttpServer()).get(`${URL}?page=2&limit=2`);

    const data = expectPaginated<ProceduralStateBody>(res, { page: 2, limit: 2, totalItems: 3, totalPages: 2 });
    expect(data.map((s) => s.id)).toEqual([third.stateId]);
  });

  it.each(['CRIMINAL', 'criminal'])('filtra por fuero (?jurisdiction=%s)', async (jurisdiction) => {
    const criminal = await createProceduralState({ jurisdiction: 'CRIMINAL' });
    await createProceduralState({ jurisdiction: 'ADMINISTRATIVE' });

    const res = await request(app.getHttpServer()).get(`${URL}?jurisdiction=${jurisdiction}`);

    const data = expectPaginated<ProceduralStateBody>(res, { totalItems: 1 });
    expect(data.map((s) => s.id)).toEqual([criminal.stateId]);
  });

  it('filtra por nombre sin distinguir mayúsculas', async () => {
    const match = await createProceduralState({ name: 'Notificación de OFICIO' });
    await createProceduralState({ name: 'Archivada' });

    const res = await request(app.getHttpServer()).get(`${URL}?search=ofic`);

    const data = expectPaginated<ProceduralStateBody>(res, { totalItems: 1 });
    expect(data.map((s) => s.id)).toEqual([match.stateId]);
  });

  it('no lista los estados dados de baja', async () => {
    const active = await createProceduralState();
    await createProceduralState({ isActive: false });

    const res = await request(app.getHttpServer()).get(URL);

    const data = expectPaginated<ProceduralStateBody>(res, { totalItems: 1 });
    expect(data.map((s) => s.id)).toEqual([active.stateId]);
  });

  it('ordena por fuero y, dentro de cada fuero, por posición', async () => {
    const criminal2 = await createProceduralState({ jurisdiction: 'CRIMINAL', position: 2 });
    const administrative1 = await createProceduralState({ jurisdiction: 'ADMINISTRATIVE', position: 1 });
    const criminal1 = await createProceduralState({ jurisdiction: 'CRIMINAL', position: 1 });

    const res = await request(app.getHttpServer()).get(URL);

    const data = expectPaginated<ProceduralStateBody>(res);
    expect(data.map((s) => s.id)).toEqual([administrative1.stateId, criminal1.stateId, criminal2.stateId]);
  });

  // ── Errores ───────────────────────────────────────────────────────
  // El contrato pide INVALID_REQUEST / INVALID_PAGINATION con `details`
  // por campo. Hoy el ValidationPipe global produce VALIDATION_ERROR con
  // claves `error_N`; cambiarlo afecta a todos los módulos (decisión del
  // equipo pendiente).

  it.each([
    ['fuero inexistente', '?jurisdiction=FOO'],
    ['página menor a 1', '?page=0'],
    ['límite mayor a 100', '?limit=101'],
    ['parámetro desconocido', '?foo=1'],
  ])('responde 400 ante %s', async (_case, query) => {
    const res = await request(app.getHttpServer()).get(`${URL}${query}`);

    expectError(res, 400, 'VALIDATION_ERROR', ['error_0']);
  });
});
