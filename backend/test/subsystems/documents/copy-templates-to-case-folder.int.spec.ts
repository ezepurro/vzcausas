import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { DocumentStorageUnavailableError } from '../../../src/subsystems/documents/core/domain/errors/documents.errors';
import { DOCUMENT_STORAGE, FileCopy } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { loginAs } from '../../shared/auth/login-as';
import { expectData } from '../../shared/contract/envelopes';
import { aCaseBody } from '../../shared/factories/case.factory';
import { clearCloudFolders, createCloudStructure } from '../../shared/factories/cloud-structure.factory';
import { createClient } from '../../shared/factories/client.factory';
import { clearTemplates, createTemplate } from '../../shared/factories/document-template.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createInitialState } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

const CASES_URL = '/api/v1/cases';
const TEMPLATES_URL = '/api/v1/document-templates';

/** Un almacenamiento al que se le puede hacer fallar la copia de un archivo por su nombre. */
class FlakyCopyStorage extends InMemoryDocumentStorage {
  failCopyOf = new Set<string>();

  override async copyFile(copy: FileCopy) {
    if (this.failCopyOf.has(copy.name)) {
      this.fileCalls.push({ method: 'copyFile', fileId: copy.fileId });
      throw new DocumentStorageUnavailableError('TRANSIENT', 'la copia falló');
    }
    return super.copyFile(copy);
  }
}

/** Las claves exactas del recurso `folder` (contrato V4 §3.4, `folder`). */
const FOLDER_KEYS = ['path', 'status', 'templatesCopied', 'templatesPending', 'url'];

/*
 * HU40 Crear modelos en la carpeta de la causa. El alta de una causa pide la
 * carpeta y la copia por eventos; `documents` copia y `cases` espera y lo
 * informa en `folder`. La base es real; el almacenamiento es el de memoria.
 * Lo que fija cada test sale de `.claude/plans/tests-hu40-crear-modelos-en-carpeta.md`.
 * CA-40.3 y CA-40.10 los cubren `case-folder.int.spec.ts` y
 * `consult-document-templates.int.spec.ts`.
 */
describe('Modelos en la carpeta de la causa (HU40)', () => {
  let app: INestApplication;
  let storage: FlakyCopyStorage;
  let actor: { Authorization: string };
  let lawyerActor: { Authorization: string };
  let lawyerId: number;
  let clientId: number;
  let userId: number;
  let templatesFolderId: string;
  let sixTemplates: Array<{ id: number; name: string; cloudFileId: string }>;

  beforeAll(async () => {
    app = await startTestApp((builder) => builder.overrideProvider(DOCUMENT_STORAGE).useClass(FlakyCopyStorage));
    storage = app.get(DOCUMENT_STORAGE);
  });

  afterAll(async () => {
    await clearTemplates();
    await getPrisma().case.deleteMany();
    await clearCloudFolders();
    await stopTestApp();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await clearTemplates();
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
    await createInitialState('ADMINISTRATIVE');

    storage.reset();
    storage.failCopyOf.clear();
    ({
      templates: { id: templatesFolderId },
    } = await createCloudStructure(storage));

    lawyerId = (await createLawyer({ lastName: 'Ríos', firstName: 'Malena' })).id;
    userId = (await createUser({ roles: ['SECRETARY'] })).id;
    clientId = (await createClient()).id;
    actor = loginAs({ userId, roles: ['SECRETARY'] });
    const lawyerUser = await createUser({ roles: ['LAWYER'] });
    lawyerActor = loginAs({ userId: lawyerUser.id, roles: ['LAWYER'] });

    // Seis modelos penales que se copian, y tres que no: de otro fuero, sin marcar y dado de baja (CA-40.5).
    const context = { templatesFolderId, userId };
    sixTemplates = [];
    for (let n = 1; n <= 6; n += 1) {
      const template = await createTemplate(storage, context, { name: `Modelo ${n}` });
      sixTemplates.push({ id: template.id, name: template.name, cloudFileId: template.cloudFileId });
    }
    await createTemplate(storage, context, { name: 'De amparo', jurisdictions: ['AMPARO'] });
    await createTemplate(storage, context, { name: 'Sin marcar', copyToNewCases: false });
    await createTemplate(storage, context, { name: 'Dado de baja', active: false });
    storage.fileCalls.length = 0;
  });

  const register = (overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post(CASES_URL)
      .set(actor)
      .send({ ...aCaseBody({ clientId, responsibleLawyerId: lawyerId }), ...overrides });

  const retry = (caseId: number) => request(app.getHttpServer()).post(`${CASES_URL}/${caseId}/folder`).set(actor).send();

  interface FolderBody {
    status: string;
    url: string | null;
    path: string | null;
    templatesCopied: number;
    templatesPending: number;
  }

  /** Los archivos que hay dentro de la carpeta de la causa, en el almacenamiento. */
  async function filesInFolderOf(caseId: number) {
    const row = await getPrisma().case.findUniqueOrThrow({ where: { id: caseId }, select: { cloudFolderId: true } });
    return storage.files.filter((file) => file.parentId === row.cloudFolderId);
  }

  const copyAttempts = () => storage.fileCalls.filter((call) => call.method === 'copyFile').length;

  describe('alta de la causa con modelos', () => {
    // CA-40.1, CA-40.2, CA-40.5
    it('copia los seis modelos penales marcados, ni más ni menos, e informa cuántos', async () => {
      const data = expectData<{ id: number; folder: FolderBody }>(await register(), 201);

      expect(Object.keys(data.folder).sort()).toEqual(FOLDER_KEYS);
      expect(data.folder).toMatchObject({ status: 'CREATED', templatesCopied: 6, templatesPending: 0 });
      expect((await filesInFolderOf(data.id)).map((file) => file.name).sort()).toEqual(
        sixTemplates.map((template) => `${template.name}.docx`),
      );
      const rows = await getPrisma().documentTemplateCopy.findMany({ where: { caseId: data.id } });
      expect(rows).toHaveLength(6);
      expect(rows.every((row) => row.status === 'COPIED' && row.cloudFileId !== null && row.copiedAt !== null)).toBe(true);
    });

    // CA-40.6
    it('la causa conserva el modelo como estaba el día en que se abrió', async () => {
      const first = expectData<{ id: number }>(await register(), 201);
      const original = storage.files.find((file) => file.id === sixTemplates[0].cloudFileId)!;
      original.content.write('XX'); // el modelo cambia después de abierta la primera causa

      const second = expectData<{ id: number }>(await register(), 201);

      const contentOf = async (caseId: number) =>
        (await filesInFolderOf(caseId)).find((file) => file.name === 'Modelo 1.docx')!.content.toString();
      expect(await contentOf(first.id)).toBe('PK Modelo 1 v1');
      expect(await contentOf(second.id)).toBe('XX Modelo 1 v1');
    });

    // CA-40.8
    it('cada copia suma uno al contador de usos del modelo', async () => {
      const usageCount = async () =>
        expectData<{ usageCount: number }>(
          await request(app.getHttpServer()).get(`${TEMPLATES_URL}/${sixTemplates[0].id}`).set(lawyerActor),
          200,
        ).usageCount;
      expect(await usageCount()).toBe(0);

      await register();
      await register();

      expect(await usageCount()).toBe(2);
    });
  });

  describe('alta de la causa sin modelos', () => {
    // CA-40.4
    it('con copyTemplates en false la carpeta se crea vacía', async () => {
      const data = expectData<{ id: number; folder: FolderBody }>(await register({ copyTemplates: false }), 201);

      expect(data.folder).toMatchObject({ status: 'CREATED', templatesCopied: 0, templatesPending: 0 });
      expect(await filesInFolderOf(data.id)).toEqual([]);
      expect(await getPrisma().documentTemplateCopy.count()).toBe(0);
    });

    // CA-40.9
    it('si el fuero no tiene modelos la carpeta se crea igual, vacía', async () => {
      const data = expectData<{ id: number; folder: FolderBody }>(
        await register({
          jurisdiction: 'ADMINISTRATIVE',
          proceduralRole: 'RECURRENTE',
          subjectMatter: 'Se impugna la resolución que deniega la cobertura.',
        }),
        201,
      );

      expect(data.folder).toMatchObject({ status: 'CREATED', templatesCopied: 0, templatesPending: 0 });
      expect(await filesInFolderOf(data.id)).toEqual([]);
    });
  });

  describe('fallas', () => {
    // CA-39.5, contrato `:3593-3601`
    it('si el almacenamiento está caído, la causa se registra y los seis modelos quedan pendientes', async () => {
      storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      const data = expectData<{ folder: FolderBody }>(await register(), 201);

      expect(data.folder).toEqual({
        status: 'ERROR',
        url: null,
        path: null,
        templatesCopied: 0,
        templatesPending: 6,
      });
    });

    // CA-40.7
    it('si falla la copia de un modelo, la carpeta queda creada con ese modelo pendiente', async () => {
      storage.failCopyOf.add('Modelo 3.docx');

      const data = expectData<{ id: number; folder: FolderBody }>(await register(), 201);

      expect(data.folder).toMatchObject({ status: 'CREATED', templatesCopied: 5, templatesPending: 1 });
      expect(await filesInFolderOf(data.id)).toHaveLength(5);
    });
  });

  describe('reintento (CA-40.7)', () => {
    async function aCaseWithOneTemplatePending() {
      storage.failCopyOf.add('Modelo 3.docx');
      const created = expectData<{ id: number }>(await register(), 201);
      storage.failCopyOf.clear();
      storage.fileCalls.length = 0;
      return created.id;
    }

    it('copia solo el que falta, sin repetir los ya copiados', async () => {
      const caseId = await aCaseWithOneTemplatePending();

      const data = expectData<FolderBody>(await retry(caseId), 200);

      expect(Object.keys(data).sort()).toEqual(FOLDER_KEYS);
      expect(data).toMatchObject({ status: 'CREATED', templatesCopied: 6, templatesPending: 0 });
      expect(copyAttempts()).toBe(1);
      expect(await filesInFolderOf(caseId)).toHaveLength(6);
    });

    it('dos reintentos a la vez no repiten ninguna copia', async () => {
      const caseId = await aCaseWithOneTemplatePending();

      await Promise.all([retry(caseId), retry(caseId)]);

      expect(await filesInFolderOf(caseId)).toHaveLength(6);
      expect(await getPrisma().documentTemplateCopy.count({ where: { caseId, status: 'COPIED' } })).toBe(6);
    });

    it('sobre una carpeta completa no copia nada ni suma usos', async () => {
      const created = expectData<{ id: number }>(await register(), 201);
      storage.fileCalls.length = 0;

      const data = expectData<FolderBody>(await retry(created.id), 200);

      expect(data).toMatchObject({ templatesCopied: 6, templatesPending: 0 });
      expect(copyAttempts()).toBe(0);
      expect(
        expectData<{ usageCount: number }>(
          await request(app.getHttpServer()).get(`${TEMPLATES_URL}/${sixTemplates[0].id}`).set(lawyerActor),
          200,
        ).usageCount,
      ).toBe(1);
    });
  });
});
