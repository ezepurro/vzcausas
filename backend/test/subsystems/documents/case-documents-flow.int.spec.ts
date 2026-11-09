import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';

import { EventPublisher } from '../../../src/shared/infrastructure/events/event-publisher.port';
import { createEventHeader } from '../../../src/shared/infrastructure/events/integration-event';
import {
  CASE_REGISTERED,
  CaseRegisteredEvent,
} from '../../../src/subsystems/cases/core/domain/ports/events/case-registered.event';
import { DocumentStorageUnavailableError } from '../../../src/subsystems/documents/core/domain/errors/documents.errors';
import { DOCUMENT_STORAGE, FileCopy } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import {
  DOCUMENT_SPACE_ASSIGNED,
  DocumentSpaceAssignedEvent,
} from '../../../src/subsystems/documents/core/domain/ports/events/document-space-assigned.event';
import {
  DOCUMENT_SPACE_CREATION_FAILED,
  DocumentSpaceCreationFailedEvent,
} from '../../../src/subsystems/documents/core/domain/ports/events/document-space-creation-failed.event';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { loginAs } from '../../shared/auth/login-as';
import { expectData } from '../../shared/contract/envelopes';
import { aCaseBody, createCase } from '../../shared/factories/case.factory';
import {
  clearCloudFolders,
  createCloudStructure,
  createTemplateJurisdictionFolders,
  TemplateJurisdictionFolders,
} from '../../shared/factories/cloud-structure.factory';
import { createClient } from '../../shared/factories/client.factory';
import { clearTemplates, createTemplate } from '../../shared/factories/document-template.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createInitialState } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

const CASES_URL = '/api/v1/cases';
const TEMPLATES_URL = '/api/v1/document-templates';
const WAIT_MS = 5000;

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

/** Las claves exactas del recurso `folder` (`API_CONTRACT_V5.md` §3.4, `folder`). */
const FOLDER_KEYS = ['path', 'status', 'templatesCopied', 'templatesPending', 'url'];

interface FolderBody {
  status: string;
  url: string | null;
  path: string | null;
  templatesCopied: number;
  templatesPending: number;
}

/*
 * Lo que pasa en `documents` cuando se registra una causa. La base es real; el
 * almacenamiento es el de memoria. La pila real de Google está en `google-stack`.
 *
 * - HU40, modelos en la carpeta de la causa: el alta pide la carpeta y la copia por
 *   eventos; `documents` copia y `cases` espera y lo informa en `folder`. Lo que fija
 *   cada test sale de `.claude/plans/tests-hu40-crear-modelos-en-carpeta.md`. CA-40.3 y
 *   CA-40.10 los cubren `cases/case-folder.int.spec.ts` y `document-templates.int.spec.ts`.
 * - El contrato de los eventos de integración (ADR-005): `CaseRegistered` publicado por
 *   el puerto y su resultado, correlacionado por `causedByEventId`. El vínculo lo hace
 *   el listener real de `cases` (`case-folder-outcome.listener.ts:42`). La
 *   idempotencia (CA-39.7) y la falla vista desde la causa están en `case-folder.int`.
 */
describe('documents al registrar una causa', () => {
  let app: INestApplication;
  let storage: FlakyCopyStorage;
  let publisher: EventPublisher;
  let emitter: EventEmitter2;
  let actor: { Authorization: string };
  let lawyerActor: { Authorization: string };
  let lawyerId: number;
  let clientId: number;
  let userId: number;
  let templatesFolderId: string;
  let jurisdictionFolders: TemplateJurisdictionFolders;
  let sixTemplates: Array<{ id: number; name: string; cloudFileId: string }>;

  beforeAll(async () => {
    app = await startTestApp((builder) => builder.overrideProvider(DOCUMENT_STORAGE).useClass(FlakyCopyStorage));
    storage = app.get(DOCUMENT_STORAGE);
    publisher = app.get(EventPublisher);
    emitter = app.get(EventEmitter2);
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
    jurisdictionFolders = await createTemplateJurisdictionFolders(storage, templatesFolderId);

    lawyerId = (await createLawyer({ lastName: 'Ríos', firstName: 'Malena' })).id;
    userId = (await createUser({ roles: ['SECRETARY'] })).id;
    clientId = (await createClient()).id;
    actor = loginAs({ userId, roles: ['SECRETARY'] });
    const lawyerUser = await createUser({ roles: ['LAWYER'] });
    lawyerActor = loginAs({ userId: lawyerUser.id, roles: ['LAWYER'] });

    // Seis modelos penales que se copian, y tres que no: de otro fuero, sin marcar y dado de baja (CA-40.5).
    const context = { templatesFolderId, userId, jurisdictionFolders };
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

  const usageCountOfFirst = async () =>
    expectData<{ usageCount: number }>(
      await request(app.getHttpServer()).get(`${TEMPLATES_URL}/${sixTemplates[0].id}`).set(lawyerActor),
      200,
    ).usageCount;

  /** Los archivos que hay dentro de la carpeta de la causa, en el almacenamiento. */
  async function filesInFolderOf(caseId: number) {
    const row = await getPrisma().case.findUniqueOrThrow({ where: { id: caseId }, select: { cloudFolderId: true } });
    return storage.files.filter((file) => file.parentId === row.cloudFolderId);
  }

  const copyAttempts = () => storage.fileCalls.filter((call) => call.method === 'copyFile').length;

  describe('alta de la causa con modelos (HU40)', () => {
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

    // F5 — CA-40.1, CA-40.5, CA-40.6: se copia el archivo del modelo en la subcarpeta del fuero de la causa
    // (no el principal), y un modelo anterior a las subcarpetas se sigue copiando desde su archivo.
    it('copia el archivo del modelo de su fuero, y desde el principal si el modelo es anterior a las subcarpetas', async () => {
      const prisma = getPrisma();
      // Principal en Penal; la causa es administrativa, así que debe copiarse el archivo de Administrativo.
      const both = await createTemplate(
        storage,
        { templatesFolderId, userId, jurisdictionFolders },
        { name: 'De dos fueros', jurisdictions: ['CRIMINAL', 'ADMINISTRATIVE'] },
      );
      const ofAdministrative = await prisma.documentTemplateFile.findFirstOrThrow({
        where: { templateId: both.id, cloudFolderId: jurisdictionFolders.ADMINISTRATIVE.id },
      });
      expect(ofAdministrative.cloudFileId).not.toBe(both.cloudFileId);
      const legacy = await createTemplate(storage, { templatesFolderId, userId }, { name: 'Anterior', jurisdictions: ['ADMINISTRATIVE'] });
      storage.fileCalls.length = 0;

      const data = expectData<{ id: number; folder: FolderBody }>(
        await register({
          jurisdiction: 'ADMINISTRATIVE',
          proceduralRole: 'RECURRENTE',
          subjectMatter: 'Se impugna la resolución que deniega la cobertura.',
        }),
        201,
      );

      expect(data.folder).toMatchObject({ status: 'CREATED', templatesCopied: 2, templatesPending: 0 });
      const copied = storage.fileCalls.flatMap((call) => (call.method === 'copyFile' ? [call.fileId] : []));
      expect(copied.sort()).toEqual([ofAdministrative.cloudFileId, legacy.cloudFileId].sort());
      expect((await filesInFolderOf(data.id)).map((file) => file.name).sort()).toEqual(['Anterior.docx', 'De dos fueros.docx']);
    });

    // CA-40.4, CA-40.9
    it('con copyTemplates en false, o en un fuero sin modelos, la carpeta se crea vacía', async () => {
      const unmarked = expectData<{ id: number; folder: FolderBody }>(await register({ copyTemplates: false }), 201);
      const withoutTemplates = expectData<{ id: number; folder: FolderBody }>(
        await register({
          jurisdiction: 'ADMINISTRATIVE',
          proceduralRole: 'RECURRENTE',
          subjectMatter: 'Se impugna la resolución que deniega la cobertura.',
        }),
        201,
      );

      for (const data of [unmarked, withoutTemplates]) {
        expect(data.folder).toMatchObject({ status: 'CREATED', templatesCopied: 0, templatesPending: 0 });
        expect(await filesInFolderOf(data.id)).toEqual([]);
      }
      expect(await getPrisma().documentTemplateCopy.count()).toBe(0);
    });
  });

  describe('fallas y reintento (HU40)', () => {
    async function aCaseWithOneTemplatePending() {
      storage.failCopyOf.add('Modelo 3.docx');
      const created = expectData<{ id: number; folder: FolderBody }>(await register(), 201);
      storage.failCopyOf.clear();
      storage.fileCalls.length = 0;
      return created;
    }

    // CA-39.5, `API_CONTRACT_V5.md` §3.4 (`folder` en ERROR)
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
    it('si falla la copia de un modelo queda pendiente, y el reintento copia solo el que falta', async () => {
      const created = await aCaseWithOneTemplatePending();
      expect(created.folder).toMatchObject({ status: 'CREATED', templatesCopied: 5, templatesPending: 1 });
      expect(await filesInFolderOf(created.id)).toHaveLength(5);

      const data = expectData<FolderBody>(await retry(created.id), 200);

      expect(Object.keys(data).sort()).toEqual(FOLDER_KEYS);
      expect(data).toMatchObject({ status: 'CREATED', templatesCopied: 6, templatesPending: 0 });
      expect(copyAttempts()).toBe(1);
      expect(await filesInFolderOf(created.id)).toHaveLength(6);
    });

    // CA-40.7
    it('dos reintentos a la vez no repiten ninguna copia', async () => {
      const { id: caseId } = await aCaseWithOneTemplatePending();

      await Promise.all([retry(caseId), retry(caseId)]);

      expect(await filesInFolderOf(caseId)).toHaveLength(6);
      expect(await getPrisma().documentTemplateCopy.count({ where: { caseId, status: 'COPIED' } })).toBe(6);
    });

    // CA-40.8
    it('cada copia suma uno al contador de usos, y reintentar sobre una carpeta completa no copia ni suma', async () => {
      expect(await usageCountOfFirst()).toBe(0);
      await register();
      const created = expectData<{ id: number }>(await register(), 201);
      expect(await usageCountOfFirst()).toBe(2);
      storage.fileCalls.length = 0;

      const data = expectData<FolderBody>(await retry(created.id), 200);

      expect(data).toMatchObject({ templatesCopied: 6, templatesPending: 0 });
      expect(copyAttempts()).toBe(0);
      expect(await usageCountOfFirst()).toBe(2);
    });
  });

  /**
   * Los eventos son asíncronos: cada test registra PRIMERO la espera del evento de
   * resultado y recién después publica, así nunca depende de tiempos fijos.
   */
  describe('eventos de integración: CaseRegistered → resultado (HU39, ADR-005)', () => {
    async function aRegisteredCase(caption = 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado'): Promise<CaseRegisteredEvent> {
      const created = await createCase({ clientId, responsibleLawyerId: lawyerId, createdByUserId: userId, caption });
      return {
        ...createEventHeader(CASE_REGISTERED, new Date()),
        caseId: created.id,
        caption,
        lawyer: { id: lawyerId, lastName: 'Ríos', firstName: 'Malena' },
        jurisdiction: { id: created.jurisdictionId, label: 'Penal' },
        copyTemplates: false,
      };
    }

    function expectOutcome<T>(type: string, caseId: number): Promise<T> {
      return emitter
        .waitFor(type, {
          timeout: WAIT_MS,
          filter: (event: { caseId: number }) => event.caseId === caseId,
          handleError: false,
          Promise,
          overload: false,
        })
        .then(([event]) => event as T);
    }

    it('crea la carpeta de la causa y anuncia DocumentSpaceAssigned con el id del evento que la causó', async () => {
      const event = await aRegisteredCase();
      const outcome = expectOutcome<DocumentSpaceAssignedEvent>(DOCUMENT_SPACE_ASSIGNED, event.caseId);

      await publisher.publish(event);
      const assigned = await outcome;

      expect(assigned).toMatchObject({
        caseId: event.caseId,
        causedByEventId: event.eventId,
        path: 'Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
      });
      const persisted = await getPrisma().cloudFolder.findUnique({ where: { cloudFolderId: assigned.cloudFolderId } });
      expect(persisted).toMatchObject({ kind: 'CASE', url: assigned.url });
    });

    it('anuncia DocumentSpaceCreationFailed (TRANSIENT) si el almacenamiento falla, y no deja carpetas de más', async () => {
      const event = await aRegisteredCase();
      storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));
      const outcome = expectOutcome<DocumentSpaceCreationFailedEvent>(DOCUMENT_SPACE_CREATION_FAILED, event.caseId);

      await publisher.publish(event);

      expect(await outcome).toMatchObject({ caseId: event.caseId, reason: 'TRANSIENT', causedByEventId: event.eventId });
      expect(await getPrisma().cloudFolder.count({ where: { kind: 'CASE' } })).toBe(0);
    });
  });
});
