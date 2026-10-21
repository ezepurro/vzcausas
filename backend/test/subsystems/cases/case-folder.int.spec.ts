import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { CASE_FOLDER_WAIT_MS } from '../../../src/subsystems/cases/infrastructure/events/in-memory-case-folder-outcomes';
import { DocumentStorageUnavailableError } from '../../../src/subsystems/documents/core/domain/errors/documents.errors';
import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { FolderReference } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { loginAs } from '../../shared/auth/login-as';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { aCaseBody, createCase } from '../../shared/factories/case.factory';
import { clearCloudFolders, createCloudStructure } from '../../shared/factories/cloud-structure.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createInitialState } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

const URL = '/api/v1/cases';

/** Un almacenamiento que tarda en crear carpetas, para ver qué pasa si la respuesta no llega a tiempo. */
class SlowDocumentStorage extends InMemoryDocumentStorage {
  delayMs = 0;

  override async createFolder(reference: FolderReference) {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    return super.createFolder(reference);
  }
}

/*
 * HU39 Crear carpeta en la nube. El alta de una causa pide la carpeta por eventos
 * y espera la respuesta hasta un límite; `POST /cases/{caseId}/folder` la pide de
 * nuevo. La base es real; el almacenamiento es el de memoria.
 */
describe('Carpeta de la causa en la nube (HU39)', () => {
  let app: INestApplication;
  let storage: SlowDocumentStorage;
  let actor: { Authorization: string };
  let lawyerId: number;
  let clientId: number;
  let userId: number;

  beforeAll(async () => {
    app = await startTestApp((builder) =>
      builder
        .overrideProvider(DOCUMENT_STORAGE)
        .useClass(SlowDocumentStorage)
        // Corto, para poder probar qué pasa si la creación no llega a tiempo.
        .overrideProvider(CASE_FOLDER_WAIT_MS)
        .useValue(400),
    );
    storage = app.get(DOCUMENT_STORAGE);
  });

  afterAll(async () => {
    await getPrisma().case.deleteMany();
    await clearCloudFolders();
    await stopTestApp();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.offense.deleteMany();
    await prisma.case.updateMany({ data: { currentProceduralActId: null } });
    await prisma.proceduralAct.deleteMany();
    await prisma.case.deleteMany();
    await clearCloudFolders();
    await prisma.user.deleteMany();
    await prisma.lawyer.deleteMany();
    await prisma.client.deleteMany();
    await prisma.legalQualification.deleteMany();
    await createInitialState('CRIMINAL');

    storage.delayMs = 0;
    storage.reset();
    await createCloudStructure(storage);

    lawyerId = (await createLawyer({ lastName: 'Ríos', firstName: 'Malena' })).id;
    userId = (await createUser({ roles: ['SECRETARY'] })).id;
    clientId = (await createClient()).id;
    actor = loginAs({ userId, roles: ['SECRETARY'] });
  });

  const register = (overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post(URL)
      .set(actor)
      .send({ ...aCaseBody({ clientId, responsibleLawyerId: lawyerId }), ...overrides });

  /** El vínculo se escribe desde un suscriptor asíncrono: se espera a verlo, sin pausas fijas. */
  async function waitForFolderStatus(caseId: number, status: string): Promise<void> {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const row = await getPrisma().case.findUnique({ where: { id: caseId }, select: { folderStatus: true } });
      if (row?.folderStatus === status) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`La causa ${caseId} no llegó a ${status}`);
  }

  describe('POST /cases', () => {
    it('crea la carpeta, la vincula a la causa y la devuelve CREATED en la respuesta (CA-39.1, CA-39.4)', async () => {
      const res = await register();

      const data = expectData<{ id: number; folder: { status: string; url: string } }>(res, 201);
      expect(data.folder).toMatchObject({ status: 'CREATED', url: expect.any(String) });
      const saved = await getPrisma().case.findUniqueOrThrow({ where: { id: data.id } });
      expect(saved.folderStatus).toBe('CREATED');
      expect(saved.cloudFolderId).not.toBeNull();
    });

    it('la carpeta de la causa queda dentro de la raíz de causas, con el nombre de la carátula (CA-39.2, CA-39.3)', async () => {
      const caption = 'GÓMEZ, Ariel c/ PÉREZ: daños';

      const res = await register({ caption });

      const data = expectData<{ folder: { path: string } }>(res, 201);
      expect(data.folder.path).toBe('/VZ Causas/Causas/Ríos, Malena/Penal/GÓMEZ, Ariel c PÉREZ daños');
      const rootCases = await getPrisma().cloudFolder.findFirstOrThrow({ where: { kind: 'ROOT_CASES' } });
      const lawyerFolder = await getPrisma().cloudFolder.findFirstOrThrow({ where: { kind: 'LAWYER' } });
      expect(lawyerFolder.parentCloudFolderId).toBe(rootCases.cloudFolderId);
    });

    it('con createFolder en false no pide nada y la carpeta queda PENDING', async () => {
      const res = await register({ createFolder: false });

      const data = expectData<{ id: number; folder: { status: string; url: string | null } }>(res, 201);
      expect(data.folder).toMatchObject({ status: 'PENDING', url: null });
      expect(await getPrisma().cloudFolder.count({ where: { kind: 'CASE' } })).toBe(0);
    });

    it('copyTemplates en true sin crear la carpeta responde 400 y no registra la causa', async () => {
      const res = await register({ createFolder: false, copyTemplates: true });

      expectError(res, 400, 'VALIDATION_ERROR', ['copyTemplates']);
      expect(res.body.error.details.copyTemplates).toBe(
        'Para copiar los modelos primero hay que crear la carpeta de la causa.',
      );
      expect(await getPrisma().case.count()).toBe(0);
    });

    it('si el almacenamiento falla, la causa se registra igual y la carpeta queda ERROR (CA-39.5)', async () => {
      storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      const res = await register();

      const data = expectData<{ id: number; folder: { status: string; url: string | null } }>(res, 201);
      expect(data.folder).toMatchObject({ status: 'ERROR', url: null });
      expect((await getPrisma().case.findUniqueOrThrow({ where: { id: data.id } })).folderStatus).toBe('ERROR');
    });

    it('sin la estructura del estudio configurada, la causa se registra igual y la carpeta queda ERROR', async () => {
      await getPrisma().case.deleteMany();
      await clearCloudFolders();

      const res = await register();

      const data = expectData<{ folder: { status: string } }>(res, 201);
      expect(data.folder.status).toBe('ERROR');
    });

    it('si la carpeta tarda más que el límite, responde 201 con CREATING y termina en segundo plano', async () => {
      storage.delayMs = 800; // más que el límite de 400 ms

      const res = await register();

      const data = expectData<{ id: number; folder: { status: string; url: string | null } }>(res, 201);
      expect(data.folder).toMatchObject({ status: 'CREATING', url: null });
      await waitForFolderStatus(data.id, 'CREATED');
      expect((await getPrisma().case.findUniqueOrThrow({ where: { id: data.id } })).cloudFolderId).not.toBeNull();
    });
  });

  describe('GET /cases/{caseId}', () => {
    it('muestra la carpeta de la causa con su enlace y su ruta', async () => {
      const created = expectData<{ id: number }>(await register(), 201);

      const res = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);

      const data = expectData<{ folder: { status: string; url: string; path: string } }>(res, 200);
      expect(data.folder).toMatchObject({
        status: 'CREATED',
        url: expect.stringContaining('storage.invalid'),
        path: expect.stringMatching(/^\/VZ Causas\/Causas\/Ríos, Malena\/Penal\//),
      });
    });

    it('una causa anterior a las carpetas sale con folder en null', async () => {
      const old = await createCase({ clientId, responsibleLawyerId: lawyerId, createdByUserId: userId });

      const res = await request(app.getHttpServer()).get(`${URL}/${old.id}`).set(actor);

      expect(expectData<{ folder: unknown }>(res, 200).folder).toBeNull();
    });
  });

  describe('POST /cases/{caseId}/folder', () => {
    const retry = (caseId: number | string) =>
      request(app.getHttpServer()).post(`${URL}/${caseId}/folder`).set(actor).send();

    it('reintenta una carpeta en ERROR y, si ahora funciona, la deja CREATED con su enlace (CA-39.6)', async () => {
      storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));
      const created = expectData<{ id: number; folder: { status: string } }>(await register(), 201);
      expect(created.folder.status).toBe('ERROR');

      const res = await retry(created.id);

      const data = expectData<{ status: string; url: string }>(res, 200);
      expect(data).toMatchObject({ status: 'CREATED', url: expect.any(String) });
    });

    it('crea la carpeta de una causa que se registró sin ella', async () => {
      const created = expectData<{ id: number }>(await register({ createFolder: false }), 201);

      const res = await retry(created.id);

      expect(expectData<{ status: string }>(res, 200).status).toBe('CREATED');
    });

    it('es idempotente: repetirlo no crea una segunda carpeta (CA-39.7)', async () => {
      const created = expectData<{ id: number }>(await register(), 201);
      const foldersBefore = await getPrisma().cloudFolder.count({ where: { kind: 'CASE' } });

      const first = await retry(created.id);
      const second = await retry(created.id);

      expect(expectData<{ url: string }>(first, 200).url).toBe(expectData<{ url: string }>(second, 200).url);
      expect(await getPrisma().cloudFolder.count({ where: { kind: 'CASE' } })).toBe(foldersBefore);
    });

    it('dos pedidos a la vez crean una sola carpeta: la compuerta de folder_status la protege', async () => {
      const created = expectData<{ id: number }>(await register({ createFolder: false }), 201);

      await Promise.all([retry(created.id), retry(created.id)]);

      await waitForFolderStatus(created.id, 'CREATED');
      expect(await getPrisma().cloudFolder.count({ where: { kind: 'CASE' } })).toBe(1);
    });

    it('si el almacenamiento vuelve a fallar responde 502 y la carpeta queda ERROR', async () => {
      const created = expectData<{ id: number }>(await register({ createFolder: false }), 201);
      storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      const res = await retry(created.id);

      expectError(res, 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
      expect((await getPrisma().case.findUniqueOrThrow({ where: { id: created.id } })).folderStatus).toBe('ERROR');
    });

    it('si la carpeta todavía se está creando responde 200 con CREATING y no pide otra', async () => {
      storage.delayMs = 800;
      const created = expectData<{ id: number; folder: { status: string } }>(await register(), 201);
      expect(created.folder.status).toBe('CREATING');

      const res = await retry(created.id);

      expect(expectData<{ status: string }>(res, 200).status).toBe('CREATING');
      await waitForFolderStatus(created.id, 'CREATED');
      expect(await getPrisma().cloudFolder.count({ where: { kind: 'CASE' } })).toBe(1);
    });

    it('una causa anterior a las carpetas (sin estado) también puede pedirla', async () => {
      const old = await createCase({ clientId, responsibleLawyerId: lawyerId, createdByUserId: userId });
      await getPrisma().case.update({ where: { id: old.id }, data: { folderStatus: null } });

      const res = await retry(old.id);

      expect(expectData<{ status: string }>(res, 200).status).toBe('CREATED');
    });

    it('responde 404 CASE_NOT_FOUND si la causa no existe', async () => {
      expectError(await retry(999999), 404, 'CASE_NOT_FOUND');
    });

    it('responde 400 INVALID_PATH_PARAMETER si el id no es un entero', async () => {
      expectError(await retry('abc'), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
    });

    it('responde 401 sin token', async () => {
      expectError(await request(app.getHttpServer()).post(`${URL}/1/folder`).send(), 401, 'UNAUTHENTICATED');
    });
  });
});
