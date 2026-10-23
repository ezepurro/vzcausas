import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import {
  DOCUMENT_SPACE_CREATION_FAILED,
  DocumentSpaceCreationFailedEvent,
} from '../../../src/subsystems/documents/core/domain/ports/events/document-space-creation-failed.event';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { clearCloudFolders, createCloudStructure } from '../../shared/factories/cloud-structure.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import {
  CaseFolderActors,
  SwitchableStorage,
  registerCase,
  requestFolder,
  resetDatabaseForCaseFolders,
  seedCaseFolderActors,
  waitForFolderStatus,
} from '../../shared/harness/case-folder-scenario';
import { buildGoogleStack, GoogleStack, GoogleStackOptions } from '../../shared/harness/google-stack';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

interface FolderBody {
  id: number;
  folder: { status: string; url: string | null; path: string | null };
}

const CAPTION = 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado';
const CASE_PATH = `/VZ Causas/Causas/Ríos, Malena/Penal/${CAPTION}`;

/*
 * HU39 · La carpeta de la causa, con la pila REAL de Google (`googleapis` +
 * `OAuth2Client` + `GoogleDriveDocumentStorage`) y un Google falso como
 * "internet" (`test/shared/fakes/fake-google.ts`). La base es PostgreSQL real.
 *
 * Cubre la creación y su jerarquía, la privacidad (CA-39.8), la idempotencia y
 * la concurrencia (CA-39.7), y los códigos de error de Google traducidos a
 * `ERROR` con su motivo. El refresh token está en `google-oauth-refresh`.
 */
describe('Carpeta de la causa con la pila real de Google (HU39)', () => {
  let app: INestApplication;
  let emitter: EventEmitter2;
  const storage = new SwitchableStorage();
  let stack: GoogleStack;
  let structure: Awaited<ReturnType<typeof createCloudStructure>>;
  let actors: CaseFolderActors;
  const failures: DocumentSpaceCreationFailedEvent[] = [];
  const onFailed = (event: DocumentSpaceCreationFailedEvent) => failures.push(event);

  /** Un Google falso nuevo, con la estructura base sembrada tanto en él como en la base. */
  async function useStack(options: GoogleStackOptions = {}) {
    await clearCloudFolders();
    stack = buildGoogleStack(options);
    storage.current = stack;
    structure = await createCloudStructure({ seed: (parent, name) => stack.fake.seedFolder(name, parent) });
  }

  beforeAll(async () => {
    app = await startTestApp((builder) => builder.overrideProvider(DOCUMENT_STORAGE).useValue(storage));
    emitter = app.get(EventEmitter2);
  });

  afterAll(async () => {
    await resetDatabaseForCaseFolders();
    await stopTestApp();
  });

  beforeEach(async () => {
    await resetDatabaseForCaseFolders();
    actors = await seedCaseFolderActors();
    await useStack();
    failures.length = 0;
    emitter.on(DOCUMENT_SPACE_CREATION_FAILED, onFailed);
  });

  afterEach(() => {
    emitter.off(DOCUMENT_SPACE_CREATION_FAILED, onFailed);
  });

  const register = (overrides: Record<string, unknown> = {}) => registerCase(app, actors, overrides);

  describe('creación y jerarquía (CA-39.1, CA-39.2, CA-39.3)', () => {
    it('crea VZ Causas/Causas/{abogado}/{fuero}/{carátula} en Drive y vincula la carpeta a la causa', async () => {
      const res = await register();

      const data = expectData<FolderBody>(res, 201);
      expect(data.folder).toEqual({
        status: 'CREATED',
        url: expect.stringMatching(/^https:\/\/drive\.google\.com\/drive\/folders\/fake-folder-\d+$/),
        path: CASE_PATH,
        templatesCopied: 0,
        templatesPending: 0,
      });
      expect(stack.fake.folderPaths()).toEqual(
        expect.arrayContaining([
          '/VZ Causas/Causas/Ríos, Malena',
          '/VZ Causas/Causas/Ríos, Malena/Penal',
          CASE_PATH,
        ]),
      );
      const saved = await getPrisma().case.findUniqueOrThrow({ where: { id: data.id } });
      expect(saved.folderStatus).toBe('CREATED');
      expect(data.folder.url).toBe(`https://drive.google.com/drive/folders/${saved.cloudFolderId}`);
    });

    it('la carpeta de la causa cuelga de la carpeta de causas del estudio, nunca de la raíz de la cuenta', async () => {
      await register();

      const rootCases = await getPrisma().cloudFolder.findFirstOrThrow({ where: { kind: 'ROOT_CASES' } });
      const lawyerFolder = await getPrisma().cloudFolder.findFirstOrThrow({ where: { kind: 'LAWYER' } });
      expect(lawyerFolder.parentCloudFolderId).toBe(rootCases.cloudFolderId);
      expect(stack.fake.folderPaths().filter((path) => path.split('/').length === 2)).toEqual(['/VZ Causas']);
    });

    it('el nombre es solo la carátula, sin los caracteres que Drive no admite', async () => {
      const res = await register({ caption: 'GÓMEZ, Ariel c/ PÉREZ: daños' });

      expect(expectData<FolderBody>(res, 201).folder.path).toBe(
        '/VZ Causas/Causas/Ríos, Malena/Penal/GÓMEZ, Ariel c PÉREZ daños',
      );
    });

    it.each([
      ['AMPARO', 'Amparo', { proceduralRole: 'ACTORA', counterparty: 'APROSS', subjectMatter: 'Cobertura integral.' }],
      [
        'ADMINISTRATIVE',
        'Administrativo',
        { proceduralRole: 'RECURRENTE', counterparty: 'APROSS', subjectMatter: 'Se impugna la resolución.' },
      ],
    ])('el fuero %s se llama «%s» en la carpeta', async (jurisdiction, label, extra) => {
      const res = await register({ jurisdiction, ...extra, caption: 'CAUSA DE PRUEBA' });

      expect(expectData<FolderBody>(res, 201).folder.path).toBe(
        `/VZ Causas/Causas/Ríos, Malena/${label}/CAUSA DE PRUEBA`,
      );
    });

    it('un apellido con comilla simple se busca bien y la carpeta del abogado se reutiliza', async () => {
      const lawyer = await createLawyer({ lastName: "D'Angelo", firstName: 'Ana' });

      await register({ responsibleLawyerId: lawyer.id, caption: 'UNO' });
      await register({ responsibleLawyerId: lawyer.id, caption: 'DOS' });

      expect(stack.fake.foldersNamed("D'Angelo, Ana")).toHaveLength(1);
    });
  });

  describe('privacidad (CA-39.8)', () => {
    it('no comparte nada: ningún pedido a permissions, ni a ninguna ruta distinta de files', async () => {
      const created = expectData<FolderBody>(await register(), 201);
      await requestFolder(app, actors.actor, created.id);

      expect(stack.fake.permissionsRequests).toEqual([]);
      const paths = new Set(stack.fake.driveRequests.map((r) => r.path.replace(/\/files\/[^/]+$/, '/files/:id')));
      expect([...paths].every((path) => path.startsWith('/drive/v3/files'))).toBe(true);
    });
  });

  describe('idempotencia y concurrencia (CA-39.7)', () => {
    it('repetir POST /cases/{id}/folder sobre una carpeta creada no hace ningún pedido a Drive', async () => {
      const created = expectData<FolderBody>(await register(), 201);
      const before = stack.fake.requests.length;

      const first = await requestFolder(app, actors.actor, created.id);
      const second = await requestFolder(app, actors.actor, created.id);

      expect(expectData<{ url: string }>(first, 200).url).toBe(created.folder.url);
      expect(expectData<{ url: string }>(second, 200).url).toBe(created.folder.url);
      expect(stack.fake.requests.length).toBe(before);
    });

    it('dos causas del mismo abogado y fuero registradas a la vez comparten las carpetas intermedias', async () => {
      const [a, b] = await Promise.all([register({ caption: 'UNO' }), register({ caption: 'DOS' })]);

      expect(expectData<FolderBody>(a, 201).folder.status).toBe('CREATED');
      expect(expectData<FolderBody>(b, 201).folder.status).toBe('CREATED');
      expect(stack.fake.foldersNamed('Ríos, Malena')).toHaveLength(1);
      expect(stack.fake.foldersNamed('Penal')).toHaveLength(1);
      expect(stack.fake.foldersNamed('UNO')).toHaveLength(1);
      expect(stack.fake.foldersNamed('DOS')).toHaveLength(1);
    });

    it('dos pedidos simultáneos de la carpeta de una misma causa crean una sola', async () => {
      const created = expectData<FolderBody>(await register({ createFolder: false }), 201);

      await Promise.all([requestFolder(app, actors.actor, created.id), requestFolder(app, actors.actor, created.id)]);

      await waitForFolderStatus(created.id, 'CREATED');
      expect(stack.fake.foldersNamed(CAPTION)).toHaveLength(1);
      expect(await getPrisma().cloudFolder.count({ where: { kind: 'CASE' } })).toBe(1);
    });

    it('dos causas con la misma carátula tienen carpetas distintas', async () => {
      await register({ caption: 'GARCÍA' });
      await register({ caption: 'GARCÍA' });

      const folders = stack.fake.foldersNamed('GARCÍA');
      expect(folders).toHaveLength(2);
      expect(new Set(folders.map((f) => f.id)).size).toBe(2);
    });

    it('si no se puede guardar la fila, la carpeta recién creada se borra de Drive', async () => {
      // Se ocupa de antemano el id que Drive le va a dar a la carpeta de la causa (abogado, fuero, causa).
      const taken = stack.fake.nextNodeId('folder', 2);
      const other = await createLawyer();
      await getPrisma().cloudFolder.create({
        data: {
          cloudFolderId: taken,
          kind: 'LAWYER',
          name: 'otro',
          url: 'https://example.invalid/otro',
          parentCloudFolderId: structure.rootCases.id,
          lawyerId: other.id,
        },
      });

      const res = await register();

      expect(expectData<FolderBody>(res, 201).folder.status).toBe('ERROR');
      expect(stack.fake.driveRequests.some((r) => r.method === 'DELETE' && r.path.endsWith(`/${taken}`))).toBe(true);
      expect(stack.fake.folderPaths()).not.toContain(CASE_PATH);
    });
  });

  describe('códigos de error de Google (CA-39.5)', () => {
    async function expectErrorFolder(reason: DocumentSpaceCreationFailedEvent['reason']) {
      const res = await register();
      const data = expectData<FolderBody>(res, 201);
      expect(data.folder).toMatchObject({ status: 'ERROR', url: null, path: null });
      expect((await getPrisma().case.findUniqueOrThrow({ where: { id: data.id } })).folderStatus).toBe('ERROR');
      expect(failures.map((f) => f.reason)).toEqual([reason]);
      return data;
    }

    it('503 en todos los intentos: reintenta 3 veces con espera de 1 s y 2 s y deja ERROR transitorio', async () => {
      stack.fake.failNext({ status: 503, times: 99 });

      await expectErrorFolder('TRANSIENT');

      expect(stack.fake.driveRequests).toHaveLength(3);
      expect(stack.sleeps).toEqual([1000, 2000]);
    });

    it.each([
      ['429', { status: 429 }],
      ['403 rateLimitExceeded', { status: 403, reason: 'rateLimitExceeded' }],
      ['403 userRateLimitExceeded', { status: 403, reason: 'userRateLimitExceeded' }],
      ['503', { status: 503 }],
      ['un corte de red', { networkError: 'ECONNRESET' }],
    ])('%s una sola vez: reintenta y la carpeta se crea', async (_label, failure) => {
      stack.fake.failNext({ ...failure, times: 1 });

      const res = await register();

      expect(expectData<FolderBody>(res, 201).folder.status).toBe('CREATED');
      expect(stack.sleeps).toEqual([1000]);
      expect(failures).toEqual([]);
    });

    it.each([
      ['401', { status: 401, reason: 'authError' }],
      ['403 por permisos', { status: 403, reason: 'insufficientPermissions' }],
    ])('%s: no reintenta y deja ERROR de autorización', async (_label, failure) => {
      stack.fake.failNext({ ...failure, times: 99 });

      await expectErrorFolder('AUTHORIZATION');

      expect(stack.fake.driveRequests).toHaveLength(1);
      expect(stack.sleeps).toEqual([]);
    });

    it('404 sobre la carpeta de causas (alguien la borró a mano): ERROR de configuración, sin reintentos', async () => {
      stack.fake.deleteNode(structure.rootCases.id);

      await expectErrorFolder('CONFIGURATION');

      expect(stack.sleeps).toEqual([]);
    });

    it('un corte de red persistente: 3 intentos y ERROR transitorio', async () => {
      stack.fake.failNext({ networkError: 'ECONNRESET', times: 99 });

      await expectErrorFolder('TRANSIENT');

      expect(stack.fake.driveRequests).toHaveLength(3);
    });

    it('una respuesta que tarda más que el tiempo de espera: ERROR transitorio por timeout', async () => {
      await useStack({ driveTimeoutMs: 80 });
      stack.fake.driveDelayMs = 1000;

      await expectErrorFolder('TRANSIENT');

      expect(stack.fake.driveRequests).toHaveLength(3);
    });

    // CA-39.3, con el cambio del 22/10/2026: la estructura base faltante se crea en Drive.
    it('sin la estructura base del estudio: la crea en Drive y la carpeta de la causa queda CREATED', async () => {
      await clearCloudFolders();

      const res = await register();

      expect(expectData<FolderBody>(res, 201).folder.status).toBe('CREATED');
      expect(failures).toEqual([]);
      const kinds = (await getPrisma().cloudFolder.findMany({ select: { kind: true } })).map((f) => f.kind).sort();
      expect(kinds).toEqual(['CASE', 'JURISDICTION', 'LAWYER', 'MAIN', 'ROOT_CASES', 'TEMPLATES']);
    });

    it('se registra igual la causa y, cuando Google vuelve, POST /folder la deja CREATED (CA-39.6)', async () => {
      stack.fake.failNext({ status: 503, times: 99 });
      const created = await expectErrorFolder('TRANSIENT');

      const stillFailing = await requestFolder(app, actors.actor, created.id);
      expectError(stillFailing, 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
      expect((await getPrisma().case.findUniqueOrThrow({ where: { id: created.id } })).folderStatus).toBe('ERROR');

      stack.fake.clearFailures();
      const recovered = await requestFolder(app, actors.actor, created.id);

      expect(expectData<{ status: string; url: string }>(recovered, 200)).toMatchObject({
        status: 'CREATED',
        url: expect.stringContaining('fake-folder-'),
      });
    });
  });
});
