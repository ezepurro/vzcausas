import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { purgeAuditLog } from '../../shared/harness/audit-log';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { loginAs } from '../../shared/auth/login-as';
import { aCaseBody, createCase } from '../../shared/factories/case.factory';
import { createUser } from '../../shared/factories/user.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU21 · Registrar baja de una causa: DELETE /cases/{caseId} (contrato V5 §3.7).
 *
 * Escrito desde `.claude/plans/tests-hu21-baja-causa.md`, no desde el código.
 * Reloj fijo: ahora es 06/10/2026 12:30 en Córdoba. La causa de referencia es
 * la del escenario de actos procesales: penal, en "Iniciada", sin SAC,
 * responsable Ríos, Malena. Da de baja una secretaria: cualquier perfil puede.
 */
type Body = Record<string, any>;
const NOW = new Date('2026-10-06T15:30:00.000Z');

describe('DELETE /api/v1/cases/:caseId', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;
  let secretary: { id: number; auth: { Authorization: string } };

  const server = () => request(app.getHttpServer());
  const url = (id: number | string = s.caseRow.id) => `/api/v1/cases/${id}`;
  const remove = (id?: number | string, body?: unknown) => {
    const req = server().delete(url(id)).set(secretary.auth).set('X-Correlation-Id', 'corr-hu21');
    return body === undefined ? req : req.send(body as object);
  };

  /** Lo que un rechazo no puede tocar: la causa, sus actos y la auditoría. */
  const snapshot = async (id: number = s.caseRow.id) => ({
    caseRow: await getPrisma().case.findUnique({ where: { id } }),
    acts: await getPrisma().proceduralAct.count({ where: { caseId: id } }),
    audit: await getPrisma().auditLog.count(),
  });

  const newCase = (overrides: Partial<Parameters<typeof createCase>[0]> = {}) =>
    createCase({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id, ...overrides });

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
    const user = await createUser({ roles: ['SECRETARY'] });
    secretary = { id: user.id, auth: loginAs({ userId: user.id, roles: ['SECRETARY'] }) };
  });

  describe('baja exitosa', () => {
    // CA-21.1, CA-21.3
    it('responde 204 sin cuerpo; la causa queda dada de baja con sus actos y una fila de auditoría sin el motivo', async () => {
      const actsUrl = `/api/v1/cases/${s.caseRow.id}/procedural-acts`;
      const act = { proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-01' };
      expectData(await server().post(actsUrl).set(s.responsible).send(act), 201);
      await purgeAuditLog();

      const res = await remove(undefined, { reason: '  Causa duplicada: se registró dos veces.  ' });

      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      const row = await getPrisma().case.findUnique({ where: { id: s.caseRow.id } });
      expect(row).toMatchObject({
        active: false,
        deactivatedAt: NOW,
        deactivatedByUserId: secretary.id,
        deactivationReason: 'Causa duplicada: se registró dos veces.',
      });
      expect(await getPrisma().proceduralAct.count({ where: { caseId: s.caseRow.id } })).toBe(1);

      const audit = await getPrisma().auditLog.findMany();
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({
        actorUserId: secretary.id,
        action: 'case.deactivated',
        entityType: 'Case',
        entityId: String(s.caseRow.id),
        occurredAt: NOW,
        metadata: null,
        correlationId: 'corr-hu21',
      });
      expect(JSON.stringify(audit[0])).not.toContain('duplicada');
    });

    // CA-21.2
    it.each<[string, unknown, string | null]>([
      ['sin cuerpo', undefined, null],
      ['con un motivo en blanco', { reason: '   ' }, null],
      ['con un motivo de 500 caracteres', { reason: 'a'.repeat(500) }, 'a'.repeat(500)],
    ])('%s la baja procede', async (_case, body, stored) => {
      expect((await remove(undefined, body)).status).toBe(204);

      const row = await getPrisma().case.findUnique({ where: { id: s.caseRow.id } });
      expect(row).toMatchObject({ active: false, deactivationReason: stored });
    });
  });

  describe('motivo inválido', () => {
    // CA-21.2
    it.each<[string, Body, Record<string, string>]>([
      ['un motivo de 501 caracteres', { reason: 'a'.repeat(501) }, { reason: 'Debe tener hasta 500 caracteres.' }],
      ['un campo que no es el motivo', { active: false }, { active: 'No es un campo admitido.' }],
    ])('%s: 400 y no se escribe nada', async (_case, body, details) => {
      const before = await snapshot();

      const res = await remove(undefined, body);

      expectError(res, 400, 'VALIDATION_ERROR', Object.keys(details));
      expect(res.body.error.message).toBe('Los datos enviados no son válidos.');
      expect(res.body.error.details).toEqual(details);
      expect(await snapshot()).toEqual(before);
    });
  });

  describe('para el cliente la causa no existe', () => {
    // CA-21.4
    it('el detalle y sus subrecursos responden 404 CASE_NOT_FOUND, y no aparece en el listado', async () => {
      await remove().expect(204);

      for (const path of ['', '/timeline', '/procedural-acts', '/interruptive-acts']) {
        const res = await server().get(`${url()}${path}`).set(secretary.auth);
        expectError(res, 404, 'CASE_NOT_FOUND');
        expect(res.body.error.message).toBe('No se encontró la causa solicitada.');
      }
      const list = await server().get('/api/v1/cases').query({ search: s.caseRow.caption }).set(secretary.auth);
      expect(expectPaginated(list, { totalItems: 0 })).toEqual([]);
    });

    // CA-21.6
    it('deja de contar en los activeCases de su abogado y de su cliente', async () => {
      const reader = loginAs({ roles: ['ADMINISTRATOR'], permissions: ['lawyer:read', 'client:read'] });
      const counts = async () => ({
        lawyer: expectData<Body>(await server().get(`/api/v1/lawyers/${s.lawyer.id}`).set(reader), 200).activeCases,
        client: expectData<Body>(await server().get(`/api/v1/clients/${s.client.id}`).set(reader), 200).activeCases,
      });
      const before = await counts();
      expect(before).toEqual({ lawyer: 1, client: 1 });

      await remove().expect(204);

      expect(await counts()).toEqual({ lawyer: 0, client: 0 });
    });
  });

  describe('baja repetida, id inválido y SAC', () => {
    // CA-21.5, CA-21.10
    it('una segunda baja o una causa inexistente es 404; un id no entero, 400', async () => {
      await remove().expect(204);
      const before = await snapshot();

      for (const id of [s.caseRow.id, 999999]) {
        const res = await remove(id, { reason: 'Otra vez' });
        expectError(res, 404, 'CASE_NOT_FOUND');
        expect(res.body.error.message).toBe('No se encontró la causa solicitada.');
      }
      expect(await snapshot()).toEqual(before);

      const invalid = await remove('abc');
      expectError(invalid, 400, 'INVALID_PATH_PARAMETER', ['caseId']);
      expect(invalid.body.error.message).toBe('El identificador de la causa no es válido.');
    });

    // CA-21.7
    it('su SAC queda libre: otra causa se registra con él y otra se modifica a él', async () => {
      const withSac = await newCase({ sacNumber: '20000002' });
      await remove(withSac.id).expect(204);

      const registered = await server()
        .post('/api/v1/cases')
        .set(secretary.auth)
        .send(
          aCaseBody(
            { clientId: s.client.id, responsibleLawyerId: s.lawyer.id },
            { sacNumber: '20000002', startDate: '2021-03-12', createFolder: false },
          ),
        );
      expect(expectData<Body>(registered, 201).sacNumber).toBe('20000002');

      await remove(registered.body.data.id).expect(204);
      const modified = await server().patch(url()).set(secretary.auth).send({ sacNumber: '20000002', startDate: '2021-03-12' });
      expect(expectData<Body>(modified, 200).sacNumber).toBe('20000002');
    });
  });

  describe('cualquier estado', () => {
    // CA-21.9
    it('se dan de baja una causa archivada y una prescripta', async () => {
      const archived = await newCase({ currentStateId: s.states.terminal.stateId });
      const prescribed = await newCase({
        currentStateId: s.states.prescribed.stateId,
        prescriptionDeclaration: {
          prescriptionDate: '2026-09-15',
          resolution: 'Sentencia N° 214',
          registeredByUserId: s.user.id,
          registeredAt: NOW,
        },
      });

      for (const target of [archived, prescribed]) {
        expect((await remove(target.id)).status).toBe(204);
        expect((await getPrisma().case.findUnique({ where: { id: target.id } }))?.active).toBe(false);
      }
    });
  });
});
