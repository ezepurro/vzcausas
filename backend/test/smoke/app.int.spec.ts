import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { getPrisma, startTestApp, stopTestApp } from '../shared/harness/test-app';
import { expectError } from '../shared/contract/envelopes';

/**
 * Test de humo del harness: si este spec pasa, la suite está bien armada
 * (contenedor arriba, migraciones aplicadas, AppModule levantado con la
 * configuración de producción y filtro global de errores activo). Incluye el
 * chequeo de salud de la base, `GET /health/db`, que no es del contrato: lo usa
 * el healthcheck del compose.
 */
describe('[smoke] App de integración', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  it('responde una ruta inexistente con el sobre de error del contrato', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/ruta-inexistente');

    // API_CONTRACT_V5.md §5.3 (:8455): ruta inexistente → 404 RESOURCE_NOT_FOUND.
    expectError(res, 404, 'RESOURCE_NOT_FOUND');
  });

  /**
   * El 401 lo da el guard global (`jwt-auth.guard.ts`) y vale igual para toda ruta que
   * no sea `@Public()`: se verifica acá, una vez, en vez de en cada suite. La lista
   * sirve para que una ruta marcada pública por error se vea.
   */
  it('responde 401 UNAUTHENTICATED sin token en las rutas protegidas', async () => {
    const routes: [method: 'get' | 'post' | 'patch' | 'delete', path: string][] = [
      ['get', '/api/v1/procedural-states'],
      ['post', '/api/v1/procedural-states'],
      ['get', '/api/v1/procedural-states/1'],
      ['patch', '/api/v1/procedural-states/1'],
      ['delete', '/api/v1/procedural-states/1'],
      ['get', '/api/v1/legal-qualifications'],
      ['post', '/api/v1/legal-qualifications'],
      ['get', '/api/v1/legal-qualifications/1'],
      ['get', '/api/v1/lawyers'],
      ['post', '/api/v1/lawyers'],
      ['get', '/api/v1/lawyers/1'],
      ['get', '/api/v1/clients'],
      ['post', '/api/v1/clients'],
      ['get', '/api/v1/clients/1'],
      ['get', '/api/v1/document-templates'],
      ['post', '/api/v1/document-templates'],
      ['get', '/api/v1/document-templates/1'],
      ['get', '/api/v1/document-templates/1/file'],
      ['get', '/api/v1/cases'],
      ['post', '/api/v1/cases'],
      ['get', '/api/v1/cases/custom-states'],
      ['get', '/api/v1/cases/1'],
      ['get', '/api/v1/cases/1/timeline'],
      ['get', '/api/v1/cases/1/procedural-acts'],
      ['post', '/api/v1/cases/1/procedural-acts'],
      ['get', '/api/v1/cases/1/procedural-acts/1'],
      ['get', '/api/v1/cases/1/procedural-acts/deadline-preview'],
      ['post', '/api/v1/cases/1/folder'],
      ['get', '/api/v1/cases/1/interruptive-acts'],
      ['post', '/api/v1/cases/1/interruptive-acts'],
      ['post', '/api/v1/cases/1/prescription'],
      ['get', '/api/v1/cases/1/documents'],
      ['get', '/api/v1/cases/1/documents/doc-1/file'],
      ['post', '/api/v1/cases/1/case-files'],
      ['get', '/api/v1/dashboards/lawyer'],
      ['get', '/api/v1/dashboards/administrator'],
    ];

    for (const [method, path] of routes) {
      const res = await request(app.getHttpServer())[method](path);
      expect({ route: `${method.toUpperCase()} ${path}`, status: res.status }).toEqual({
        route: `${method.toUpperCase()} ${path}`,
        status: 401,
      });
      expectError(res, 401, 'UNAUTHENTICATED');
      expect(res.body.error.message).toBe('La autenticación es requerida.');
    }
  });

  it('devuelve el header X-Correlation-Id en cada respuesta y respeta el que envía el cliente', async () => {
    const generated = await request(app.getHttpServer()).get('/api/v1/ruta-inexistente');
    expect(generated.headers['x-correlation-id']).toEqual(expect.any(String));

    const echoed = await request(app.getHttpServer())
      .get('/api/v1/ruta-inexistente')
      .set('X-Correlation-Id', 'test-correlation-123');
    expect(echoed.headers['x-correlation-id']).toBe('test-correlation-123');
  });

  describe('GET /api/v1/health/db', () => {
    it('responde 200 con el estado de la base de datos conectada', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health/db');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({ status: 'ok', database: 'up', latencyMs: expect.any(Number) });
      expect(res.body.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('responde 503 con el sobre de error cuando la base no está disponible', async () => {
      const failure = jest
        .spyOn(getPrisma(), '$queryRaw')
        .mockRejectedValueOnce(new Error('Connection terminated unexpectedly'));

      const res = await request(app.getHttpServer()).get('/api/v1/health/db');

      expectError(res, 503, 'HTTP_ERROR');

      failure.mockRestore();
    });
  });
});
