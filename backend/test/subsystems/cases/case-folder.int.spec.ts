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
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createUser } from '../../shared/factories/user.factory';
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
  const folderOf = async (caseId: number) => expectData<CaseBody>(await request(app.getHttpServer()).get(`${CASES_URL}/${caseId}`).set(actors.actor), 200).folder;
  const caseFolderRow = () => getPrisma().cloudFolder.findFirstOrThrow({ where: { kind: 'CASE' } });

  async function waitUntil(condition: () => Promise<boolean>, timeoutMs = 5000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await condition()) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error('La carpeta no llegó al estado esperado');
  }

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
      // Las tres JURISDICTION de modelos (Modelos formales/{fuero}) más la del fuero de la causa.
      expect(kinds).toEqual(['CASE', 'JURISDICTION', 'JURISDICTION', 'JURISDICTION', 'JURISDICTION', 'LAWYER', 'MAIN', 'ROOT_CASES', 'TEMPLATES']);
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

    // CA-39.6, D-110: la piden quien opera la causa (el abogado, solo si es el responsable).
    it.each(['ADMINISTRATOR', 'LAWYER', 'SECRETARY'] as const)('responde 200 al perfil %s', async (role) => {
      const created = expectData<CaseBody>(await register({ createFolder: false }), 201);
      const lawyerId = role === 'LAWYER' ? actors.lawyerId : null;

      const res = await requestFolder(app, loginAs({ userId: actors.userId, roles: [role], lawyerId }), created.id);

      expect(expectData<FolderBody>(res, 200).status).toBe('CREATED');
    });

    it('si el abogado responsable fue dado de baja igual se crea la carpeta, con su nombre (RN12)', async () => {
      const created = expectData<CaseBody>(await register({ createFolder: false }), 201);
      await getPrisma().lawyer.update({ where: { id: actors.lawyerId }, data: { active: false } });

      const folder = expectData<FolderBody>(await retry(created.id), 200);

      expect(folder.status).toBe('CREATED');
      expect(folder.path).toContain('Ríos, Malena');
    });

    // D-110
    it('otro abogado: 403 con el texto del contrato y no se pide carpeta; la secretaría ajena sí puede', async () => {
      const created = expectData<CaseBody>(await register({ createFolder: false }), 201);
      const otherLawyer = loginAs({ roles: ['LAWYER'], lawyerId: actors.lawyerId + 1000 });

      const res = await requestFolder(app, otherLawyer, created.id);

      expectError(res, 403, 'FORBIDDEN');
      expect(res.body.error.message).toBe('Solo el abogado responsable de la causa puede operar su carpeta.');
      expect(res.body.error.details).toBeNull();
      expect((await savedCase(created.id)).folderStatus).toBe('PENDING');
      expect(await caseFolders()).toBe(0);

      expectData<FolderBody>(await retry(created.id), 200);
    });

    // D-110: primero 404, después 403
    it('una causa inexistente es 404 aunque pida otro abogado', async () => {
      const otherLawyer = loginAs({ roles: ['LAWYER'], lawyerId: actors.lawyerId + 1000 });

      expectError(await requestFolder(app, otherLawyer, 999999), 404, 'CASE_NOT_FOUND');
    });

    it('responde 404 CASE_NOT_FOUND si la causa no existe y 400 INVALID_PATH_PARAMETER si el id no es un entero positivo', async () => {
      expectError(await retry(999999), 404, 'CASE_NOT_FOUND');
      expectError(await retry('abc'), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
      expectError(await retry(0), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
    });
  });

  /*
   * HU19 (CA-19.9, CA-19.10, D-104): la carpeta sigue a la causa. `cases` publica
   * `CaseModified` después de guardar y `documents` renombra o mueve la carpeta por
   * un suscriptor asíncrono: se espera a ver la fila en la base, sin pausas fijas.
   * El resto de HU19 está en `update-case.int.spec.ts`.
   */
  describe('PATCH /api/v1/cases/{caseId}: la carpeta sigue a la causa (HU19)', () => {
    const patch = (caseId: number, body: Record<string, unknown>) =>
      request(app.getHttpServer()).patch(`${CASES_URL}/${caseId}`).set(actors.actor).send(body);
    // CA-19.9: la carátula renombra la carpeta con las reglas de nombre; el id y el padre no cambian
    it('cambiar la carátula renombra la carpeta en la nube y en la base, y folder.path informa el nombre nuevo', async () => {
      const created = expectData<CaseBody>(await register({ caption: 'GÓMEZ, Ariel p.s.a. Robo' }), 201);
      const before = await caseFolderRow();

      expectData(await patch(created.id, { caption: 'RUIZ c/ LÓPEZ: amparo' }), 200);
      await waitUntil(async () => (await caseFolderRow()).name === 'RUIZ c LÓPEZ amparo');

      const after = await caseFolderRow();
      expect(after.cloudFolderId).toBe(before.cloudFolderId);
      expect(after.parentCloudFolderId).toBe(before.parentCloudFolderId);
      expect(storage.folders.find((f) => f.id === before.cloudFolderId)?.name).toBe('RUIZ c LÓPEZ amparo');
      expect((await folderOf(created.id))?.path).toBe('/VZ Causas/Causas/Ríos, Malena/Penal/RUIZ c LÓPEZ amparo');
    });

    // CA-19.9: el responsable mueve la carpeta, y se crean las carpetas del abogado y del fuero que falten
    it('cambiar el responsable mueve la carpeta bajo el abogado nuevo, creando sus carpetas, y la causa sigue siendo una', async () => {
      const created = expectData<CaseBody>(await register({ caption: 'GÓMEZ, Ariel p.s.a. Robo' }), 201);
      const before = await caseFolderRow();
      const other = await createLawyer({ lastName: 'Peralta', firstName: 'Ignacio' });

      expectData(await patch(created.id, { responsibleLawyerId: other.id }), 200);
      await waitUntil(async () => (await caseFolderRow()).lawyerId === other.id);

      const after = await caseFolderRow();
      expect(after.cloudFolderId).toBe(before.cloudFolderId);
      expect(after.name).toBe('GÓMEZ, Ariel p.s.a. Robo');
      expect(storage.relocations).toHaveLength(1);
      expect((await folderOf(created.id))?.path).toBe('/VZ Causas/Causas/Peralta, Ignacio/Penal/GÓMEZ, Ariel p.s.a. Robo');
      expect(await getPrisma().cloudFolder.count({ where: { kind: 'LAWYER', lawyerId: other.id } })).toBe(1);
      expect(await getPrisma().cloudFolder.count({ where: { kind: 'CASE' } })).toBe(1);
    });

    // CA-19.10: Drive no hace fallar la modificación; la carpeta queda como estaba y el path dice dónde está
    it('si Drive falla, la modificación se guarda igual (200) y la carpeta queda con su nombre anterior', async () => {
      const created = expectData<CaseBody>(await register({ caption: 'GÓMEZ, Ariel p.s.a. Robo' }), 201);
      const before = await caseFolderRow();
      storage.failNextCallTo('relocateFolder', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      const res = await patch(created.id, { caption: 'RUIZ s/ amparo' });

      expect(expectData<{ caption: string }>(res, 200).caption).toBe('RUIZ s/ amparo');
      await waitUntil(async () => storage.relocations.length === 1);
      expect((await savedCase(created.id)).caption).toBe('RUIZ s/ amparo');
      expect((await caseFolderRow()).name).toBe(before.name);
      expect((await folderOf(created.id))?.path).toBe('/VZ Causas/Causas/Ríos, Malena/Penal/GÓMEZ, Ariel p.s.a. Robo');
    });
  });

  /*
   * HU21 (D-104 revisado): al dar de baja una causa, su carpeta se mueve a la carpeta
   * `Papelera`, en la raíz del estudio, con lo que tiene adentro. No se borra, y la fila de
   * `cloud_folders` y el vínculo de la causa se conservan (RN12). `Papelera` se crea la
   * primera vez que hace falta. `documents` actúa por un suscriptor asíncrono. El resto de
   * HU21 está en el spec de la baja.
   */
  describe('DELETE /api/v1/cases/{caseId}: la carpeta va a la Papelera (HU21)', () => {
    const remove = (caseId: number) =>
      request(app.getHttpServer()).delete(`${CASES_URL}/${caseId}`).set(actors.actor).send();
    const bin = () => storage.folders.find((f) => f.name === 'Papelera');

    it('responde 204, la causa deja de existir para el cliente y su carpeta se mueve a la Papelera, creada en ese momento', async () => {
      const created = expectData<CaseBody>(await register({ caption: 'GÓMEZ, Ariel p.s.a. Robo' }), 201);
      const before = await caseFolderRow();
      const root = await getPrisma().cloudFolder.findFirstOrThrow({ where: { kind: 'MAIN' } });
      expect(bin()).toBeUndefined();

      expect((await remove(created.id)).status).toBe(204);
      await waitUntil(async () => storage.folders.find((f) => f.id === before.cloudFolderId)?.parentId === bin()?.id);

      expect(bin()?.parentId).toBe(root.cloudFolderId);
      expect(storage.folders.find((f) => f.id === before.cloudFolderId)).toMatchObject({ name: before.name });
      expect(storage.deletedFolderIds).toEqual([]);
      expectError(await request(app.getHttpServer()).get(`${CASES_URL}/${created.id}`).set(actors.actor), 404, 'CASE_NOT_FOUND');
      // La fila y el vínculo se conservan: la causa se conserva (RN12).
      expect((await caseFolderRow()).cloudFolderId).toBe(before.cloudFolderId);
      expect(await savedCase(created.id)).toMatchObject({ active: false, cloudFolderId: before.cloudFolderId });
    });

    it('otra baja reutiliza la Papelera: queda una sola', async () => {
      const first = expectData<CaseBody>(await register({ caption: 'GÓMEZ, Ariel p.s.a. Robo' }), 201);
      const second = expectData<CaseBody>(await register({ caption: 'RUIZ s/ amparo' }), 201);

      expect((await remove(first.id)).status).toBe(204);
      await waitUntil(async () => storage.relocations.length === 1);
      expect((await remove(second.id)).status).toBe(204);
      await waitUntil(async () => storage.relocations.length === 2);

      expect(storage.folders.filter((f) => f.name === 'Papelera')).toHaveLength(1);
      expect(storage.folders.filter((f) => f.parentId === bin()?.id)).toHaveLength(2);
    });

    it('si Drive falla, la baja se guarda igual (204) y la carpeta queda donde estaba', async () => {
      const created = expectData<CaseBody>(await register({ caption: 'GÓMEZ, Ariel p.s.a. Robo' }), 201);
      const before = await caseFolderRow();
      storage.failNextCallTo('relocateFolder', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      expect((await remove(created.id)).status).toBe(204);
      await waitUntil(async () => storage.relocations.length === 1);

      expect((await savedCase(created.id)).active).toBe(false);
      expect(storage.folders.find((f) => f.id === before.cloudFolderId)?.parentId).toBe(before.parentCloudFolderId);
    });
  });

  /*
   * HU14 (CA-14.12, CA-14.13, D-104): al cambiar el nombre de un abogado, `people`
   * publica `LawyerRenamed` y `documents` renombra su carpeta; las de sus causas
   * quedan adentro y `folder.path` las sigue. El resto de HU14 está en
   * `people/update-lawyer.int.spec.ts`.
   */
  describe('PATCH /api/v1/lawyers/{lawyerId}: la carpeta del abogado se renombra (HU14)', () => {
    const rename = async (body: Record<string, unknown>) => {
      const admin = await createUser({ roles: ['ADMINISTRATOR'] });
      return request(app.getHttpServer())
        .patch(`/api/v1/lawyers/${actors.lawyerId}`)
        .set(loginAs({ userId: admin.id, roles: ['ADMINISTRATOR'], permissions: ['lawyer:update'] }))
        .send(body);
    };
    const lawyerFolderRow = () => getPrisma().cloudFolder.findFirstOrThrow({ where: { kind: 'LAWYER' } });

    it('cambiar el apellido renombra la carpeta del abogado y las carpetas de sus causas siguen adentro', async () => {
      const created = expectData<CaseBody>(await register({ caption: 'GÓMEZ, Ariel p.s.a. Robo' }), 201);
      const before = await lawyerFolderRow();

      expect((await rename({ lastName: 'Ríos Castro' })).status).toBe(200);
      await waitUntil(async () => (await lawyerFolderRow()).name === 'Ríos Castro, Malena');

      const after = await lawyerFolderRow();
      expect(after.cloudFolderId).toBe(before.cloudFolderId);
      expect(after.parentCloudFolderId).toBe(before.parentCloudFolderId);
      expect(storage.folders.find((f) => f.id === before.cloudFolderId)?.name).toBe('Ríos Castro, Malena');
      expect(storage.relocations).toHaveLength(1);
      expect((await folderOf(created.id))?.path).toBe(
        '/VZ Causas/Causas/Ríos Castro, Malena/Penal/GÓMEZ, Ariel p.s.a. Robo',
      );
    });

    it('si Drive falla, la modificación se guarda igual (200) y la carpeta conserva su nombre', async () => {
      expectData<CaseBody>(await register({ caption: 'GÓMEZ, Ariel p.s.a. Robo' }), 201);
      storage.failNextCallTo('relocateFolder', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      expect((await rename({ lastName: 'Ríos Castro' })).status).toBe(200);
      await waitUntil(async () => storage.relocations.length === 1);

      expect((await getPrisma().lawyer.findUniqueOrThrow({ where: { id: actors.lawyerId } })).lastName).toBe('Ríos Castro');
      expect((await lawyerFolderRow()).name).toBe('Ríos, Malena');
    });
  });
});
