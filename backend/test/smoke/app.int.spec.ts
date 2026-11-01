import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { startTestApp, stopTestApp } from '../shared/harness/test-app';
import { expectError } from '../shared/contract/envelopes';

/**
 * Test de humo del harness: si este spec pasa, la suite está bien armada
 * (contenedor arriba, migraciones aplicadas, AppModule levantado con la
 * configuración de producción y filtro global de errores activo).
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

    // API_CONTRACT_V2 §5.3: ruta inexistente → 404 RESOURCE_NOT_FOUND.
    // Hoy DomainErrorFilter responde NOT_FOUND: este test queda en rojo
    // hasta que se corrija el filtro.
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
    ];

    for (const [method, path] of routes) {
      const res = await request(app.getHttpServer())[method](path);
      expect({ route: `${method.toUpperCase()} ${path}`, status: res.status }).toEqual({
        route: `${method.toUpperCase()} ${path}`,
        status: 401,
      });
      expectError(res, 401, 'UNAUTHENTICATED');
    }
  });

  it('devuelve el header X-Correlation-Id en cada respuesta', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/ruta-inexistente');

    expect(res.headers['x-correlation-id']).toEqual(expect.any(String));
  });

  it('respeta el X-Correlation-Id que envía el cliente', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ruta-inexistente')
      .set('X-Correlation-Id', 'test-correlation-123');

    expect(res.headers['x-correlation-id']).toBe('test-correlation-123');
  });
});
