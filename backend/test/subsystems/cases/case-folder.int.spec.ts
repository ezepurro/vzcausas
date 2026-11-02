import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { CASE_FOLDER_WAIT_MS } from '../../../src/subsystems/cases/infrastructure/events/in-memory-case-folder-outcomes';
import { DocumentStorageUnavailableError } from '../../../src/subsystems/documents/core/domain/errors/documents.errors';
import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import type { FolderReference } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { loginAs } from '../../shared/auth/login-as';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { createCase } from '../../shared/factories/case.factory';
import { clearCloudFolders, createCloudStructure } from '../../shared/factories/cloud-structure.factory';
import {
  CASES_URL,
  CaseFolderActors,
  registerCase,
  requestFolder,
  resetDatabaseForCaseFolders,
  seedCaseFolderActors,
  waitForFolderStatus,
} from '../../shared/harness/case-folder-scenario';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

/** Un almacenamiento que tarda en crear carpetas, para ver la respuesta `CREATING`. */
class SlowDocumentStorage extends InMemoryDocumentStorage {
  delayMs = 0;

  override async createFolder(reference: FolderReference) {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    return super.createFolder(reference);
  }
}

/** Las claves exactas del objeto `folder` (`API_CONTRACT_V5.md` §3.7 y `POST /cases/{caseId}/folder`). */
const FOLDER_KEYS = ['path', 'status', 'templatesCopied', 'templatesPending', 'url'];

/** El límite de espera del alta en este spec; el almacenamiento lento tarda más. */
const WAIT_MS = 300;
const SLOWER_THAN_WAIT_MS = 700;

interface FolderBody {
  status: string;
  url: string | null;
  path: string | null;
  templatesCopied: number;
  templatesPending: number;
}

interface CaseBody {
  id: number;
  folder: FolderBody | null;
}

/*
 * HU39 Crear carpeta en la nube. El alta de una causa pide la carpeta por eventos y
 * espera la respuesta hasta un límite; `POST /cases/{caseId}/folder` la pide de nuevo.
 * La base es real; el almacenamiento es el de memoria. La pila real de Google
 * (jerarquía en Drive, errores de Google, refresh token) está en
 * `documents/google-stack.int.spec.ts`. El 401 sin token, en `test/smoke/app.int.spec.ts`.
 */
describe('Carpeta de la causa en la nube (HU39)', () => {
  let app: INestApplication;
  let storage: SlowDocumentStorage;
  let actors: CaseFolderActors;

  beforeAll(async () => {
    app = await startTestApp((builder) =>
      builder.overrideProvider(DOCUMENT_STORAGE).useClass(SlowDocumentStorage).overrideProvider(CASE_FOLDER_WAIT_MS).useValue(WAIT_MS),
    );
    storage = app.get(DOCUMENT_STORAGE);
  });

  afterAll(async () => {
    await resetDatabaseForCaseFolders();
    await stopTestApp();
  });

  beforeEach(async () => {
    await resetDatabaseForCaseFolders();
    actors = await seedCaseFolderActors();
    storage.reset();
    storage.delayMs = 0;
    await createCloudStructure(storage);
  });

  const register = (overrides: Record<string, unknown> = {}) => registerCase(app, actors, overrides);
  const retry = (caseId: number | string) => requestFolder(app, actors.actor, caseId);
  const caseFolders = () => getPrisma().cloudFolder.count({ where: { kind: 'CASE' } });
  const savedCase = (id: number) => getPrisma().case.findUniqueOrThrow({ where: { id } });

  describe('POST /api/v1/cases', () => {
    // CA-39.1, CA-39.2, CA-39.3, CA-39.4
    it('crea la carpeta bajo la raíz de causas, la vincula y la devuelve CREATED, idéntica en el detalle y el listado', async () => {
      const created = expectData<CaseBody>(await register({ caption: 'GÓMEZ, Ariel c/ PÉREZ: daños' }), 201);

      expect(Object.keys(created.folder as object).sort()).toEqual(FOLDER_KEYS);
      expect(created.folder).toEqual({
        status: 'CREATED',
        url: expect.stringContaining('storage.invalid'),
        path: '/VZ Causas/Causas/Ríos, Malena/Penal/GÓMEZ, Ariel c PÉREZ daños',
        templatesCopied: 0,
        templatesPending: 0,
      });
      const saved = await savedCase(created.id);
      expect(saved.folderStatus).toBe('CREATED');
      expect(saved.cloudFolderId).not.toBeNull();
      const rootCases = await getPrisma().cloudFolder.findFirstOrThrow({ where: { kind: 'ROOT_CASES' } });
      const lawyerFolder = await getPrisma().cloudFolder.findFirstOrThrow({ where: { kind: 'LAWYER' } });
      expect(lawyerFolder.parentCloudFolderId).toBe(rootCases.cloudFolderId);

      const detail = expectData<CaseBody>(await request(app.getHttpServer()).get(`${CASES_URL}/${created.id}`).set(actors.actor), 200);
      const fromList = expectPaginated<CaseBody>(await request(app.getHttpServer()).get(CASES_URL).set(actors.actor)).find(
        (item) => item.id === created.id,
      );
      expect(detail.folder).toEqual(created.folder);
      expect(fromList?.folder).toEqual(created.folder);
    });

    it('con createFolder en false no pide nada y la carpeta queda PENDING, con url y path en null', async () => {
      const { folder } = expectData<CaseBody>(await register({ createFolder: false }), 201);

      expect(Object.keys(folder as object).sort()).toEqual(FOLDER_KEYS);
      expect(folder).toEqual({ status: 'PENDING', url: null, path: null, templatesCopied: 0, templatesPending: 0 });
      expect(await caseFolders()).toBe(0);
    });

    // CA-39.5: Drive nunca hace fallar la operación de negocio (D-60).
    it('si el almacenamiento falla, la causa se registra igual y la carpeta queda ERROR', async () => {
      storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      const { id, folder } = expectData<CaseBody>(await register(), 201);

      expect(Object.keys(folder as object).sort()).toEqual(FOLDER_KEYS);
      expect(folder).toMatchObject({ status: 'ERROR', url: null, path: null });
      expect((await savedCase(id)).folderStatus).toBe('ERROR');
    });

    it('si la carpeta tarda más que el límite responde 201 CREATING; pedirla mientras tanto responde CREATING y no crea otra', async () => {
      storage.delayMs = SLOWER_THAN_WAIT_MS;

      const { id, folder } = expectData<CaseBody>(await register(), 201);

      expect(Object.keys(folder as object).sort()).toEqual(FOLDER_KEYS);
      expect(folder).toMatchObject({ status: 'CREATING', url: null, path: null });
      expect(expectData<FolderBody>(await retry(id), 200).status).toBe('CREATING');
      await waitForFolderStatus(id, 'CREATED');
      expect((await savedCase(id)).cloudFolderId).not.toBeNull();
      expect(await caseFolders()).toBe(1);
    });

    // CA-39.3, con el cambio del 22/10/2026: la estructura base faltante se arma sola.
    it('sin la estructura del estudio configurada, la arma y la carpeta de la causa queda CREATED', async () => {
      await clearCloudFolders();

      const { folder } = expectData<CaseBody>(await register(), 201);

      expect(folder).toMatchObject({ status: 'CREATED', path: expect.stringMatching(/^\/VZ Causas\/Causas\/Ríos, Malena\/Penal\//) });
      const kinds = (await getPrisma().cloudFolder.findMany({ select: { kind: true } })).map((f) => f.kind).sort();
      expect(kinds).toEqual(['CASE', 'JURISDICTION', 'LAWYER', 'MAIN', 'ROOT_CASES', 'TEMPLATES']);
    });

    it('rechaza con 400 copiar modelos sin crear la carpeta, y un createFolder o copyTemplates que no es booleano, sin registrar la causa', async () => {
      const withoutFolder = await register({ createFolder: false, copyTemplates: true });

      expectError(withoutFolder, 400, 'VALIDATION_ERROR', ['copyTemplates']);
      expect(withoutFolder.body.error.details.copyTemplates).toBe(
        'Para copiar los modelos primero hay que crear la carpeta de la causa.',
      );
      expectError(await register({ createFolder: 'si' }), 400, 'VALIDATION_ERROR', ['createFolder']);
      expectError(await register({ copyTemplates: 'si' }), 400, 'VALIDATION_ERROR', ['copyTemplates']);
      expect(await getPrisma().case.count()).toBe(0);
    });
  });

  it('GET /cases/{caseId}: una causa anterior a las carpetas sale con folder en null', async () => {
    const old = await createCase({ clientId: actors.clientId, responsibleLawyerId: actors.lawyerId, createdByUserId: actors.userId });

    const res = await request(app.getHttpServer()).get(`${CASES_URL}/${old.id}`).set(actors.actor);

    expect(expectData<CaseBody>(res, 200).folder).toBeNull();
  });

  describe('POST /api/v1/cases/{caseId}/folder', () => {
    // CA-39.6, CA-39.7
    it('reintenta una carpeta en ERROR y la deja CREATED; repetirlo después devuelve la misma y no crea otra', async () => {
      storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));
      const created = expectData<CaseBody>(await register(), 201);
      expect(created.folder?.status).toBe('ERROR');

      const first = expectData<FolderBody>(await retry(created.id), 200);
      const second = expectData<FolderBody>(await retry(created.id), 200);

      expect(Object.keys(first).sort()).toEqual(FOLDER_KEYS);
      expect(first).toMatchObject({ status: 'CREATED', url: expect.any(String) });
      expect(second.url).toBe(first.url);
      expect(await caseFolders()).toBe(1);
    });

    it('crea la carpeta de una causa registrada sin ella y de una anterior a las carpetas (sin estado)', async () => {
      const withoutFolder = expectData<CaseBody>(await register({ createFolder: false }), 201);
      const old = await createCase({ clientId: actors.clientId, responsibleLawyerId: actors.lawyerId, createdByUserId: actors.userId });

      expect(expectData<FolderBody>(await retry(withoutFolder.id), 200).status).toBe('CREATED');
      expect(expectData<FolderBody>(await retry(old.id), 200).status).toBe('CREATED');
    });

    it('dos pedidos a la vez crean una sola carpeta: la compuerta de folder_status la protege', async () => {
      const created = expectData<CaseBody>(await register({ createFolder: false }), 201);

      await Promise.all([retry(created.id), retry(created.id)]);

      await waitForFolderStatus(created.id, 'CREATED');
      expect(await caseFolders()).toBe(1);
    });

    it('si el almacenamiento vuelve a fallar responde 502 con el texto del contrato y la carpeta queda ERROR', async () => {
      const created = expectData<CaseBody>(await register({ createFolder: false }), 201);
      storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      const res = await retry(created.id);

      expectError(res, 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
      expect(res.body.error.message).toBe(
        'No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.',
      );
      expect((await savedCase(created.id)).folderStatus).toBe('ERROR');
    });

    // CA-39.6: cualquier perfil puede pedirla.
    it.each(['ADMINISTRATOR', 'LAWYER', 'SECRETARY'] as const)('responde 200 al perfil %s', async (role) => {
      const created = expectData<CaseBody>(await register({ createFolder: false }), 201);

      const res = await requestFolder(app, loginAs({ userId: actors.userId, roles: [role] }), created.id);

      expect(expectData<FolderBody>(res, 200).status).toBe('CREATED');
    });

    it('si el abogado responsable fue dado de baja igual se crea la carpeta, con su nombre (RN12)', async () => {
      const created = expectData<CaseBody>(await register({ createFolder: false }), 201);
      await getPrisma().lawyer.update({ where: { id: actors.lawyerId }, data: { active: false } });

      const folder = expectData<FolderBody>(await retry(created.id), 200);

      expect(folder.status).toBe('CREATED');
      expect(folder.path).toContain('Ríos, Malena');
    });

    it('responde 404 CASE_NOT_FOUND si la causa no existe y 400 INVALID_PATH_PARAMETER si el id no es un entero positivo', async () => {
      expectError(await retry(999999), 404, 'CASE_NOT_FOUND');
      expectError(await retry('abc'), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
      expectError(await retry(0), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
    });
  });
});
