import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { purgeAuditLog } from '../../shared/harness/audit-log';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { TestRole } from '../../shared/auth/login-as';
import { createCase } from '../../shared/factories/case.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createUser } from '../../shared/factories/user.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU15 · Dar de baja un abogado: DELETE /lawyers/{lawyerId} (contrato V6 §3.3, D-143, D-133).
 *
 * Escrito desde `.claude/plans/tests-hu15-baja-abogado.md`, no desde el código. Reloj fijo: ahora
 * es 06/10/2026 12:30 en Córdoba. El abogado a dar de baja es Ríos, Malena (el del escenario de
 * actos procesales): responsable de la causa A, a la que se suman B, C y una archivada T. Su usuario
 * (LAWYER) está vinculado. El administrador inicia sesión de verdad: el permiso `lawyer:delete` sale
 * del seed.
 *
 * Desvío nombrado, sin fijar: `LAWYER_NOT_FOUND` y `USER_NOT_FOUND` responden `details: { lawyerId }` o
 * `{ userId }` y el contrato dice `details: null`. Es previo a esta HU y común a GET y PATCH de abogados
 * (los tests de esos endpoints también lo esquivan con `toMatchObject`), por eso solo se miran código y mensaje.
 *
 * Desvío nombrado, sin fijar: la fila 5 del plan (atomicidad) pide forzar una falla a mitad de la
 * operación, y esta suite no tiene cómo hacerlo contra la base real. Queda cubierta en
 * `deactivate-lawyer.use-case.spec.ts` (con dobles) y por la transacción compartida de la base.
 */
type Body = Record<string, any>;
const NOW = new Date('2026-10-06T15:30:00.000Z');

describe('DELETE /api/v1/lawyers/:lawyerId', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;
  let admin: { id: number; auth: { Authorization: string } };
  let caseA: { id: number };
  let caseB: { id: number };
  let caseC: { id: number };
  let caseT: { id: number };

  const server = () => request(app.getHttpServer());
  const url = (id: number | string = s.lawyer.id) => `/api/v1/lawyers/${id}`;
  const remove = (body?: unknown, id?: number | string, auth = admin.auth) => {
    const req = server().delete(url(id)).set(auth).set('X-Correlation-Id', 'corr-hu15');
    return body === undefined ? req : req.send(body as object);
  };

  const newCase = (overrides: Partial<Parameters<typeof createCase>[0]> = {}) =>
    createCase({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id, ...overrides });

  /** Lo que un rechazo no puede tocar: el abogado, sus causas, su usuario y la auditoría. */
  const snapshot = async () => ({
    lawyer: await getPrisma().lawyer.findUnique({ where: { id: s.lawyer.id } }),
    cases: await getPrisma().case.findMany({
      where: { id: { in: [caseA.id, caseB.id, caseC.id, caseT.id] } },
      orderBy: { id: 'asc' },
    }),
    user: await getPrisma().user.findUnique({ where: { id: s.user.id } }),
    audit: await getPrisma().auditLog.count(),
  });

  const loginWith = async (roles: TestRole[], lawyerId: number | null = null) => {
    const user = await createUser({ roles, lawyerId, passwordHash: await bcrypt.hash('password1', 4) });
    const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: 'password1' });
    return { id: user.id, auth: { Authorization: `Bearer ${login.body.data.accessToken}` } };
  };

  const caseRow = (id: number) => getPrisma().case.findUniqueOrThrow({ where: { id } });

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
  });

  afterAll(async () => {
    await purgeAuditLog();
    await resetProceduralActData();
    await stopTestApp();
  });

  beforeEach(async () => {
    // Antes de borrar usuarios: la auditoría los referencia.
    await purgeAuditLog();
    s = await setUpProceduralActScenario();
    admin = await loginWith(['ADMINISTRATOR']);
    caseA = s.caseRow;
    caseB = await newCase({ caption: 'CAUSA B' });
    caseC = await newCase({ caption: 'CAUSA C' });
    caseT = await newCase({ caption: 'CAUSA ARCHIVADA', currentStateId: s.states.terminal.stateId });
  });

  describe('baja exitosa', () => {
    // CA-15.1: sin causas activas, la baja no necesita reparto
    it('un abogado sin causas activas se da de baja sin cuerpo: 204, y para el cliente deja de existir', async () => {
      const lonely = await createLawyer();

      await remove(undefined, lonely.id).expect(204);

      expect(await getPrisma().lawyer.findUnique({ where: { id: lonely.id } })).toMatchObject({ active: false });
      const reread = await server().get(url(lonely.id)).set(admin.auth);
      expect(reread.status).toBe(404);
      expect(reread.body.error).toMatchObject({ code: 'LAWYER_NOT_FOUND' });
      const audit = await getPrisma().auditLog.findMany({ where: { action: 'lawyer.deactivated' } });
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ entityType: 'Lawyer', entityId: String(lonely.id), actorUserId: admin.id });
    });

    // CA-15.2, CA-15.3, CA-15.4, CA-15.5: reasignar, dejar huérfanas y conservar las terminales
    it('reasigna una causa, deja huérfanas dos y la archivada sigue con el abogado', async () => {
      const before = { A: await caseRow(caseA.id), B: await caseRow(caseB.id), T: await caseRow(caseT.id) };

      await remove({
        reassignments: [
          { caseId: caseA.id, responsibleLawyerId: s.otherLawyer.id },
          { caseId: caseB.id, unassigned: true },
          { caseId: caseC.id, unassigned: true },
        ],
      }).expect(204);

      const a = await caseRow(caseA.id);
      expect(a).toMatchObject({ responsibleLawyerId: s.otherLawyer.id, orphanedAt: null, active: true });
      const b = await caseRow(caseB.id);
      // Huérfana: sin responsable y con desde cuándo, vigente y con su estado procesal intacto (D-143).
      expect(b).toMatchObject({ responsibleLawyerId: null, orphanedAt: NOW, active: true });
      expect(b.currentStateId).toBe(before.B.currentStateId);
      expect(a.currentStateId).toBe(before.A.currentStateId);
      // Una causa archivada no se reasigna: sigue con el abogado como parte de su historia.
      expect(await caseRow(caseT.id)).toMatchObject({ responsibleLawyerId: s.lawyer.id, orphanedAt: null });
      expect((await caseRow(caseT.id)).currentStateId).toBe(before.T.currentStateId);
      expect(await getPrisma().lawyer.findUnique({ where: { id: s.lawyer.id } })).toMatchObject({ active: false });
    });

    // D-143: así se las encuentra para reasignarlas, y la carga del nuevo abogado cuenta la reasignada
    it('las huérfanas aparecen con unassigned=true y la reasignada cuenta en el abogado nuevo', async () => {
      await remove({
        reassignments: [
          { caseId: caseA.id, responsibleLawyerId: s.otherLawyer.id },
          { caseId: caseB.id, unassigned: true },
          { caseId: caseC.id, unassigned: true },
        ],
      }).expect(204);

      const orphans = expectPaginated<Body>(await server().get('/api/v1/cases?unassigned=true').set(admin.auth), {
        totalItems: 2,
      });
      expect(orphans.map((item) => item.id).sort()).toEqual([caseB.id, caseC.id].sort());
      expect(orphans.every((item) => item.responsibleLawyer === null && item.orphanedAt !== null)).toBe(true);
      const other = expectData<Body>(await server().get(`/api/v1/lawyers/${s.otherLawyer.id}`).set(admin.auth), 200);
      expect(other.activeCases).toBe(1);
      // Cada cambio de responsable queda en la auditoría de su causa, y la baja en la del abogado.
      expect(await getPrisma().auditLog.count({ where: { action: 'case.updated' } })).toBe(3);
      expect(await getPrisma().auditLog.count({ where: { action: 'lawyer.deactivated' } })).toBe(1);
    });
  });

  describe('el usuario vinculado (D-133)', () => {
    const distribution = () => ({
      reassignments: [
        { caseId: caseA.id, unassigned: true },
        { caseId: caseB.id, unassigned: true },
        { caseId: caseC.id, unassigned: true },
      ],
    });

    it('si LAWYER era su único rol, el usuario se da de baja y sus sesiones se cierran', async () => {
      await remove(distribution()).expect(204);

      expect(await getPrisma().user.findUnique({ where: { id: s.user.id } })).toMatchObject({
        active: false,
        lawyerId: null,
      });
      const reread = await server().get(`/api/v1/users/${s.user.id}`).set(admin.auth);
      expect(reread.status).toBe(404);
      expect(reread.body.error).toMatchObject({ code: 'USER_NOT_FOUND' });
    });

    it('si tiene otro rol, sigue vigente con él, sin la ficha ni el rol LAWYER', async () => {
      const both = await createLawyer();
      const user = await createUser({ roles: ['LAWYER', 'ADMINISTRATOR'], lawyerId: both.id });

      await remove(undefined, both.id).expect(204);

      const data = expectData<Body>(await server().get(`/api/v1/users/${user.id}`).set(admin.auth), 200);
      expect(data).toMatchObject({ roles: ['ADMINISTRATOR'], lawyer: null });
    });
  });

  describe('un pedido rechazado no escribe nada', () => {
    // Regla 3: una causa activa fuera del reparto nunca queda huérfana por omisión
    it('una causa activa que no figura en el reparto es 409 con el texto del contrato', async () => {
      const before = await snapshot();

      const res = await remove({
        reassignments: [
          { caseId: caseA.id, unassigned: true },
          { caseId: caseB.id, unassigned: true },
        ],
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toEqual({
        code: 'LAWYER_HAS_DEPENDENCIES',
        message: 'El abogado tiene causas activas sin reasignar ni dejar sin asignar.',
        details: null,
      });
      expect(await snapshot()).toEqual(before);
    });

    it('sin cuerpo, un abogado con causas activas es 409', async () => {
      const before = await snapshot();

      expectError(await remove(), 409, 'LAWYER_HAS_DEPENDENCIES');
      expect(await snapshot()).toEqual(before);
    });

    // Regla 2: cada variante del reparto inválido responde 400 sobre `reassignments`
    it.each<[string, (ids: { a: number; b: number; c: number; t: number; self: number; other: number }) => unknown[]]>([
      ['una causa que no es del abogado', ({ a, b, c }) => [{ caseId: a + 100000, unassigned: true }, { caseId: b, unassigned: true }, { caseId: c, unassigned: true }]],
      ['la causa archivada (no es una causa activa)', ({ t }) => [{ caseId: t, unassigned: true }]],
      ['una causa repetida', ({ a }) => [{ caseId: a, unassigned: true }, { caseId: a, unassigned: true }]],
      ['el mismo abogado que se da de baja como destino', ({ a, self }) => [{ caseId: a, responsibleLawyerId: self }]],
      ['un abogado de destino inexistente', ({ a }) => [{ caseId: a, responsibleLawyerId: 99999999 }]],
      ['una entrada con abogado y `unassigned`', ({ a, other }) => [{ caseId: a, responsibleLawyerId: other, unassigned: true }]],
      ['una entrada sin abogado ni `unassigned`', ({ a }) => [{ caseId: a }]],
      ['un `unassigned` que no es true', ({ a }) => [{ caseId: a, unassigned: false }]],
    ])('rechaza %s con 400 y el detalle en `reassignments`', async (_caso, build) => {
      const before = await snapshot();

      const res = await remove({
        reassignments: build({
          a: caseA.id,
          b: caseB.id,
          c: caseC.id,
          t: caseT.id,
          self: s.lawyer.id,
          other: s.otherLawyer.id,
        }),
      });

      expectError(res, 400, 'VALIDATION_ERROR', ['reassignments']);
      expect(res.body.error.message).toBe('Los datos enviados no son válidos.');
      expect(await snapshot()).toEqual(before);
    });

    it('un abogado de destino dado de baja es 400', async () => {
      const gone = await createLawyer({ active: false });
      const before = await snapshot();

      const res = await remove({ reassignments: [{ caseId: caseA.id, responsibleLawyerId: gone.id }] });

      expectError(res, 400, 'VALIDATION_ERROR', ['reassignments']);
      expect(await snapshot()).toEqual(before);
    });

    it('el texto del ejemplo del contrato: la causa no es una causa activa de este abogado', async () => {
      const res = await remove({ reassignments: [{ caseId: 999999, unassigned: true }] });

      expect(res.status).toBe(400);
      expect(res.body.error.details).toEqual({
        reassignments: 'La causa 999999 no es una causa activa de este abogado.',
      });
    });
  });

  describe('existencia y acceso', () => {
    // Regla 1
    it('un abogado inexistente o ya dado de baja es 404, y un id que no es entero, 400', async () => {
      const gone = await createLawyer({ active: false });

      const missing = await remove(undefined, 999999);
      expect(missing.status).toBe(404);
      expect(missing.body.error).toMatchObject({
        code: 'LAWYER_NOT_FOUND',
        message: 'No se encontró el abogado solicitado.',
      });
      const alreadyGone = await remove(undefined, gone.id);
      expect(alreadyGone.status).toBe(404);
      expect(alreadyGone.body.error).toMatchObject({ code: 'LAWYER_NOT_FOUND' });
      const invalid = await remove(undefined, 'abc');
      expect(invalid.status).toBe(400);
      expect(invalid.body.error).toEqual({
        code: 'INVALID_PATH_PARAMETER',
        message: 'El identificador del abogado no es válido.',
        details: { lawyerId: 'Debe ser un número entero válido.' },
      });
    });

    // El 404 antes que el reparto: un abogado que no existe no revela si el cuerpo era válido
    // Contrato V6, reglas de la baja: 1. el abogado existe (404), 2. el cuerpo es válido (400).
    it('el 404 se resuelve antes que el cuerpo, aunque el cuerpo no sea una lista', async () => {
      const notAList = await remove({ reassignments: 'no es una lista' }, 999999);
      expect(notAList.status).toBe(404);
      expect(notAList.body.error).toMatchObject({ code: 'LAWYER_NOT_FOUND' });
      // Con el abogado existente, el mismo cuerpo es 400 sobre `reassignments`.
      expectError(await remove({ reassignments: 'no es una lista' }), 400, 'VALIDATION_ERROR', ['reassignments']);
      const missing = await remove({ reassignments: [{ caseId: 1 }] }, 999999);
      expect(missing.status).toBe(404);
      expect(missing.body.error).toMatchObject({ code: 'LAWYER_NOT_FOUND' });
    });

    it.each<[TestRole]>([['LAWYER'], ['SECRETARY']])('un usuario %s recibe 403 y no se escribe nada', async (role) => {
      const user = await loginWith([role], role === 'LAWYER' ? (await createLawyer()).id : null);
      const before = await snapshot();

      const res = await remove({ reassignments: [] }, undefined, user.auth);

      expectError(res, 403, 'FORBIDDEN');
      expect(await snapshot()).toEqual(before);
    });
  });
});
