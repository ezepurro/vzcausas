import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { expectNoContent } from '../../shared/contract/envelopes';
import { loginAs } from '../../shared/auth/login-as';
import { createUser } from '../../shared/factories/user.factory';

const URL = '/api/v1/users';

/**
 * HU-7 · `DELETE /users/{userId}` contra Postgres.
 *
 * Existe por CA-7.1: la baja marcaba `active = false` pero nunca
 * escribía `deleted_at`. Los unitarios no lo podían ver, porque el
 * repositorio en memoria guarda la entidad entera; el defecto estaba en
 * qué columnas escribía el repositorio de Prisma.
 */
describe('DELETE /api/v1/users/{userId}', () => {
  let app: INestApplication;
  const admin = () => loginAs({ permissions: ['user:delete'] });

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  // CA-7.1
  it('registra la fecha de la baja', async () => {
    const user = await createUser({ roles: ['SECRETARY'] });
    const before = new Date();

    expectNoContent(
      await request(app.getHttpServer()).delete(`${URL}/${user.id}`).set(admin()),
    );

    const row = await getPrisma().user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.active).toBe(false);
    expect(row.deletedAt).not.toBeNull();
    expect(row.deletedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(row.deletedAt!.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('no toca la fecha de un usuario que sigue activo', async () => {
    const user = await createUser({ roles: ['SECRETARY'] });

    const row = await getPrisma().user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.deletedAt).toBeNull();
  });

  /**
   * Una segunda baja responde 404 (el usuario ya no existe para la API)
   * y, sobre todo, no pisa la fecha de la primera: si lo hiciera, la
   * columna diría cuándo se intentó la última baja y no cuándo ocurrió.
   */
  it('una segunda baja no reescribe la fecha', async () => {
    const user = await createUser({ roles: ['SECRETARY'] });
    await request(app.getHttpServer()).delete(`${URL}/${user.id}`).set(admin()).expect(204);
    const first = (await getPrisma().user.findUniqueOrThrow({ where: { id: user.id } })).deletedAt;

    const res = await request(app.getHttpServer()).delete(`${URL}/${user.id}`).set(admin());

    // `expectError` no sirve acá: este error lleva el id como número en
    // `details`, y el helper solo admite textos o `null`.
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
    const after = (await getPrisma().user.findUniqueOrThrow({ where: { id: user.id } })).deletedAt;
    expect(after).toEqual(first);
  });
});
