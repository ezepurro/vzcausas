import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { startTestApp, stopTestApp, getPrisma } from '../../shared/harness/test-app';
import { expectError } from '../../shared/contract/envelopes';

describe('GET /api/v1/health/db', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  it('responde 200 con el estado de la base de datos conectada', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/db');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      status: 'ok',
      database: 'up',
      latencyMs: expect.any(Number),
    });
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
