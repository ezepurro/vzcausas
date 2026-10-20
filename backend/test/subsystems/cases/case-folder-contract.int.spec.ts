import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { CASE_FOLDER_WAIT_MS } from '../../../src/subsystems/cases/core/domain/ports/case-folder-outcome.port';
import { DocumentStorageUnavailableError } from '../../../src/subsystems/documents/core/domain/errors/documents.errors';
import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import type { FolderReference } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { loginAs } from '../../shared/auth/login-as';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { createCloudStructure } from '../../shared/factories/cloud-structure.factory';
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

const FOLDER_KEYS = ['path', 'status', 'templatesCopied', 'templatesPending', 'url'];

/** El mensaje del `502` tal como está en `API_CONTRACT_V4.md` (`POST /cases/{caseId}/folder`). */
const CONTRACT_502_MESSAGE = 'No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.';

interface CaseBody {
  id: number;
  folder: Record<string, unknown> | null;
}

/*
 * HU39 · La forma de las respuestas de la carpeta según `API_CONTRACT_V4.md`
 * (`folder` del recurso de causa y `POST /cases/{caseId}/folder`). Es
 * independiente de qué almacenamiento haya detrás: usa el de memoria.
 */
describe('Carpeta de la causa: respuestas según el contrato', () => {
  let app: INestApplication;
  let storage: SlowDocumentStorage;
  let actors: CaseFolderActors;

  beforeAll(async () => {
    app = await startTestApp((builder) =>
      builder
        .overrideProvider(DOCUMENT_STORAGE)
        .useClass(SlowDocumentStorage)
        .overrideProvider(CASE_FOLDER_WAIT_MS)
        .useValue(300),
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

  describe('el objeto folder', () => {
    it('CREATED: tiene exactamente las cinco claves del contrato, con enlace y ruta', async () => {
      const { folder } = expectData<CaseBody>(await register(), 201);

      expect(Object.keys(folder as object).sort()).toEqual(FOLDER_KEYS);
      expect(folder).toMatchObject({ status: 'CREATED', templatesCopied: 0, templatesPending: 0 });
      expect(folder?.url).toEqual(expect.any(String));
      expect(folder?.path).toMatch(/^\/VZ Causas\/Causas\/Ríos, Malena\/Penal\//);
    });

    it('ERROR: url y path son null y las claves son las mismas', async () => {
      storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      const { folder } = expectData<CaseBody>(await register(), 201);

      expect(Object.keys(folder as object).sort()).toEqual(FOLDER_KEYS);
      expect(folder).toMatchObject({ status: 'ERROR', url: null, path: null });
    });

    it('CREATING: si la carpeta tarda más que el límite, la respuesta es 201 con url y path en null', async () => {
      storage.delayMs = 700; // el límite del spec es 300 ms

      const { id, folder } = expectData<CaseBody>(await register(), 201);

      expect(Object.keys(folder as object).sort()).toEqual(FOLDER_KEYS);
      expect(folder).toMatchObject({ status: 'CREATING', url: null, path: null });
      await waitForFolderStatus(id, 'CREATED');
    });

    it('PENDING: con createFolder en false, url y path son null', async () => {
      const { folder } = expectData<CaseBody>(await register({ createFolder: false }), 201);

      expect(Object.keys(folder as object).sort()).toEqual(FOLDER_KEYS);
      expect(folder).toMatchObject({ status: 'PENDING', url: null, path: null, templatesCopied: 0, templatesPending: 0 });
    });

    it('una causa anterior a las carpetas devuelve folder en null', async () => {
      const prisma = getPrisma();
      const created = expectData<CaseBody>(await register({ createFolder: false }), 201);
      await prisma.case.update({ where: { id: created.id }, data: { folderStatus: null } });

      const res = await request(app.getHttpServer()).get(`${CASES_URL}/${created.id}`).set(actors.actor);

      expect(expectData<CaseBody>(res, 200).folder).toBeNull();
    });
  });

  describe('el mismo recurso en el alta, el detalle y el listado', () => {
    it('folder es idéntico en POST /cases, GET /cases/{id} y GET /cases', async () => {
      const created = expectData<CaseBody>(await register(), 201);

      const detail = await request(app.getHttpServer()).get(`${CASES_URL}/${created.id}`).set(actors.actor);
      const list = await request(app.getHttpServer()).get(CASES_URL).set(actors.actor);

      expect(expectData<CaseBody>(detail, 200).folder).toEqual(created.folder);
      const item = (list.body.data as CaseBody[]).find((c) => c.id === created.id);
      expect(item?.folder).toEqual(created.folder);
    });
  });

  describe('validación del alta', () => {
    it.each([
      ['createFolder', { createFolder: 'si' }],
      ['copyTemplates', { copyTemplates: 'si' }],
    ])('%s con un tipo inválido responde 400 VALIDATION_ERROR con el campo en details', async (field, body) => {
      const res = await register(body);

      expectError(res, 400, 'VALIDATION_ERROR', [field]);
      expect(await getPrisma().case.count()).toBe(0);
    });
  });

  describe('POST /cases/{caseId}/folder', () => {
    it.each(['ADMINISTRATOR', 'LAWYER', 'SECRETARY'] as const)(
      'responde 200 para el perfil %s (CA-39.6)',
      async (role) => {
        const created = expectData<CaseBody>(await register({ createFolder: false }), 201);
        const actor = loginAs({ userId: actors.userId, roles: [role] });

        const res = await requestFolder(app, actor, created.id);

        const folder = expectData<Record<string, unknown>>(res, 200);
        expect(Object.keys(folder).sort()).toEqual(FOLDER_KEYS);
        expect(folder.status).toBe('CREATED');
      },
    );

    it('el 502 lleva el código y el texto del contrato y details en null', async () => {
      const created = expectData<CaseBody>(await register({ createFolder: false }), 201);
      storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      const res = await requestFolder(app, actors.actor, created.id);

      expectError(res, 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
      expect(res.body.error.message).toBe(CONTRACT_502_MESSAGE);
    });

    it('CREATING: si todavía se está creando responde 200 con la carpeta en CREATING', async () => {
      storage.delayMs = 700;
      const created = expectData<CaseBody>(await register(), 201);
      expect(created.folder).toMatchObject({ status: 'CREATING' });

      const res = await requestFolder(app, actors.actor, created.id);

      expect(expectData<{ status: string }>(res, 200).status).toBe('CREATING');
      await waitForFolderStatus(created.id, 'CREATED');
    });

    it('404 CASE_NOT_FOUND si la causa no existe', async () => {
      expectError(await requestFolder(app, actors.actor, 999999), 404, 'CASE_NOT_FOUND');
    });

    it('400 INVALID_PATH_PARAMETER si el id no es un entero positivo', async () => {
      expectError(await requestFolder(app, actors.actor, 'abc'), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
      expectError(await requestFolder(app, actors.actor, 0), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
    });

    it('401 UNAUTHENTICATED sin token', async () => {
      const res = await request(app.getHttpServer()).post(`${CASES_URL}/1/folder`).send();

      expectError(res, 401, 'UNAUTHENTICATED');
    });

    it('si el abogado responsable fue dado de baja igual se crea la carpeta, con su nombre (RN12)', async () => {
      const created = expectData<CaseBody>(await register({ createFolder: false }), 201);
      await getPrisma().lawyer.update({ where: { id: actors.lawyerId }, data: { active: false } });

      const res = await requestFolder(app, actors.actor, created.id);

      const folder = expectData<{ status: string; path: string }>(res, 200);
      expect(folder.status).toBe('CREATED');
      expect(folder.path).toContain('Ríos, Malena');
    });
  });
});
