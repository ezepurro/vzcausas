import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { loginAs } from '../../shared/auth/login-as';
import { createCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createUser } from '../../shared/factories/user.factory';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

/*
 * HU24 Generar y emitir carátula. Contrato: API_CONTRACT_V5.md:4537-4663
 * (GET /cases/{caseId}/cover). Escrito desde el plan
 * `.claude/plans/tests-hu24-emitir-caratula.md`, no desde el código.
 *
 * Qué NO prueba y queda para revisión manual: que el PDF se vea como la plantilla del
 * estudio y que el texto quede dentro de su recuadro. Acá se fija que hay un PDF A4
 * y que las cabeceras y los errores son los del contrato; el contenido de cada
 * recuadro lo fijan los unitarios de `CoverSheet`.
 */

/** Superagent no entrega un cuerpo binario por sí solo: se junta en un Buffer. */
const asBuffer = (res: request.Response, done: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
};

describe('GET /api/v1/cases/{caseId}/cover', () => {
  let app: INestApplication;
  let actor: { Authorization: string };
  let userId: number;
  let lawyerId: number;
  let clientId: number;

  const cover = (caseId: number | string, query = '', headers = actor) =>
    request(app.getHttpServer()).get(`/api/v1/cases/${caseId}/cover${query}`).set(headers).buffer(true).parse(asBuffer);

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.offense.deleteMany();
    await prisma.case.updateMany({ data: { currentProceduralActId: null } });
    await prisma.proceduralAct.deleteMany();
    await prisma.case.deleteMany();
    await prisma.user.deleteMany();
    await prisma.lawyer.deleteMany();
    await prisma.client.deleteMany();
    await prisma.proceduralState.deleteMany();

    const lawyer = await createLawyer({ lastName: 'Vazquez', firstName: 'Fernando' });
    const user = await createUser({ roles: ['SECRETARY'] });
    const client = await createClient({ lastName: 'Sánchez', firstName: 'Celia' });
    lawyerId = lawyer.id;
    userId = user.id;
    clientId = client.id;
    actor = loginAs({ userId, roles: ['SECRETARY'] });
  });

  const aCase = (overrides: Partial<Parameters<typeof createCase>[0]> = {}) =>
    createCase({ clientId, responsibleLawyerId: lawyerId, createdByUserId: userId, ...overrides });

  describe('emisión (CA-24.1, CA-24.10)', () => {
    // C1: penal, con SAC, sin carpeta en Drive.
    it('devuelve el PDF, en línea por defecto, con el nombre del SAC; y no escribe nada (D1.1, D1.2, D1.4)', async () => {
      const created = await aCase({ sacNumber: '13284571' });
      const before = await getPrisma().case.findMany({ orderBy: { id: 'asc' } });

      const res = await cover(created.id);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/^application\/pdf/);
      expect(res.headers['content-disposition']).toBe('inline; filename="Caratula_13284571.pdf"');
      expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
      expect(await getPrisma().case.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
    });

    it('con ?disposition=attachment la manda para descargar; sin SAC, el nombre lleva el id (D1.3)', async () => {
      const created = await aCase({ sacNumber: null });

      const res = await cover(created.id, '?disposition=attachment');

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toBe(`attachment; filename="Caratula_causa-${created.id}.pdf"`);
    });
  });

  describe('fueros y perfiles (CA-24.2, CA-24.1)', () => {
    it.each(['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] as const)('el fuero %s emite el PDF (D2.1)', async (jurisdiction) => {
      const created = await aCase({ jurisdiction });

      const res = await cover(created.id);

      expect(res.status).toBe(200);
      expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('cualquier perfil puede emitirla: también un abogado (D2.2)', async () => {
      const created = await aCase();

      const res = await cover(created.id, '', loginAs({ userId, roles: ['LAWYER'] }));

      expect(res.status).toBe(200);
    });
  });

  describe('sin carpeta en Drive (CA-24.9)', () => {
    it('una causa sin carpeta se emite igual (D3.1)', async () => {
      const created = await aCase();
      expect(created.cloudFolderId).toBeNull();

      expect((await cover(created.id)).status).toBe(200);
    });
  });

  describe('errores (CA-24.10, CA-24.11)', () => {
    const textOf = (res: request.Response) => JSON.parse(res.body.toString());

    it('sin token: 401 UNAUTHENTICATED (D4.1)', async () => {
      const created = await aCase();

      const res = await request(app.getHttpServer()).get(`/api/v1/cases/${created.id}/cover`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: { code: 'UNAUTHENTICATED', message: 'La autenticación es requerida.', details: null },
      });
    });

    it.each([
      [
        '?disposition=otra',
        'INVALID_REQUEST',
        'Parámetros de query inválidos.',
        { disposition: 'Debe ser inline o attachment.' },
      ],
      ['abc', 'INVALID_PATH_PARAMETER', 'El identificador de la causa no es válido.', { caseId: 'Debe ser un número entero válido.' }],
    ])('400 con el código y el texto del contrato: %s (D4.2)', async (input, code, message, details) => {
      const created = await aCase();
      const before = await getPrisma().case.count();

      const res = input.startsWith('?') ? await cover(created.id, input) : await cover(input);

      expect(res.status).toBe(400);
      expect(textOf(res)).toEqual({ error: { code, message, details } });
      expect(await getPrisma().case.count()).toBe(before);
    });

    it('una causa inexistente o dada de baja: 404 CASE_NOT_FOUND (D4.3, D4.4)', async () => {
      const deactivated = await aCase({ sacNumber: '13284571' });
      await getPrisma().case.update({ where: { id: deactivated.id }, data: { active: false } });
      const expected = {
        error: { code: 'CASE_NOT_FOUND', message: 'No se encontró la causa solicitada.', details: null },
      };

      for (const id of [deactivated.id, deactivated.id + 1000]) {
        const res = await cover(id);
        expect(res.status).toBe(404);
        expect(textOf(res)).toEqual(expected);
      }
    });
  });
});
