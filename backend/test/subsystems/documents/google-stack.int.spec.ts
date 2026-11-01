import { INestApplication, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';

import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import {
  DOCUMENT_SPACE_CREATION_FAILED,
  DocumentSpaceCreationFailedEvent,
} from '../../../src/subsystems/documents/core/domain/ports/events/document-space-creation-failed.event';
import { loginAs } from '../../shared/auth/login-as';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { clearCloudFolders, createCloudStructure } from '../../shared/factories/cloud-structure.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createUser } from '../../shared/factories/user.factory';
import {
  CaseFolderActors,
  SwitchableStorage,
  registerCase,
  requestFolder,
  resetDatabaseForCaseFolders,
  seedCaseFolderActors,
  waitForFolderStatus,
} from '../../shared/harness/case-folder-scenario';
import {
  FAKE_GOOGLE_CREDENTIALS,
  GoogleStack,
  GoogleStackOptions,
  buildGoogleStack,
} from '../../shared/harness/google-stack';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

interface FolderBody {
  id: number;
  folder: { status: string; url: string | null; path: string | null };
}

const CAPTION = 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado';
const CASE_PATH = `/VZ Causas/Causas/Ríos, Malena/Penal/${CAPTION}`;
const TEMPLATES_URL = '/api/v1/document-templates';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/*
 * La pila REAL de Google (`@googleapis/drive` + `OAuth2Client` +
 * `GoogleDriveDocumentStorage`) contra un Google falso como "internet"
 * (`test/shared/fakes/fake-google.ts`), con PostgreSQL real. Una sola app: cada test
 * arma un Google falso nuevo y lo enchufa en el `SwitchableStorage`.
 *
 * Lo que sólo se ve con la biblioteca de verdad: la jerarquía y las consultas a Drive,
 * la privacidad, la concurrencia, la forma real de los errores que llegan al
 * clasificador, la subida multipart y el canje del refresh token. La tabla completa
 * de códigos de Google está en `drive-error.mapper.spec.ts`; el nombre de la carpeta,
 * en `folder-name.vo.spec.ts`; la estructura faltante y el reintento de una carpeta en
 * ERROR (CA-39.6), en `cases/case-folder.int.spec.ts`.
 */
describe('Pila real de Google', () => {
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

  async function resetDatabase() {
    // Los modelos apuntan al usuario de su última versión: van antes que los usuarios.
    const prisma = getPrisma();
    await prisma.documentTemplateJurisdiction.deleteMany();
    await prisma.documentTemplate.deleteMany();
    await resetDatabaseForCaseFolders();
  }

  beforeAll(async () => {
    app = await startTestApp((builder) => builder.overrideProvider(DOCUMENT_STORAGE).useValue(storage));
    emitter = app.get(EventEmitter2);
  });

  afterAll(async () => {
    await resetDatabase();
    await stopTestApp();
  });

  beforeEach(async () => {
    await resetDatabase();
    actors = await seedCaseFolderActors();
    await useStack();
    failures.length = 0;
    emitter.on(DOCUMENT_SPACE_CREATION_FAILED, onFailed);
  });

  afterEach(() => {
    emitter.off(DOCUMENT_SPACE_CREATION_FAILED, onFailed);
  });

  const register = (overrides: Record<string, unknown> = {}) => registerCase(app, actors, overrides);

  async function expectErrorFolder(reason: DocumentSpaceCreationFailedEvent['reason']) {
    const data = expectData<FolderBody>(await register(), 201);
    expect(data.folder).toMatchObject({ status: 'ERROR', url: null, path: null });
    expect((await getPrisma().case.findUniqueOrThrow({ where: { id: data.id } })).folderStatus).toBe('ERROR');
    expect(failures.map((f) => f.reason)).toEqual([reason]);
    return data;
  }

  describe('carpeta de la causa: creación y jerarquía (HU39, CA-39.1, CA-39.2, CA-39.3)', () => {
    it('crea VZ Causas/Causas/{abogado}/{fuero}/{carátula} bajo la carpeta de causas, nunca en la raíz', async () => {
      const data = expectData<FolderBody>(await register(), 201);

      expect(data.folder).toEqual({
        status: 'CREATED',
        url: expect.stringMatching(/^https:\/\/drive\.google\.com\/drive\/folders\/fake-folder-\d+$/),
        path: CASE_PATH,
        templatesCopied: 0,
        templatesPending: 0,
      });
      expect(stack.fake.folderPaths()).toEqual(
        expect.arrayContaining(['/VZ Causas/Causas/Ríos, Malena', '/VZ Causas/Causas/Ríos, Malena/Penal', CASE_PATH]),
      );
      expect(stack.fake.folderPaths().filter((path) => path.split('/').length === 2)).toEqual(['/VZ Causas']);
      const saved = await getPrisma().case.findUniqueOrThrow({ where: { id: data.id } });
      expect(saved.folderStatus).toBe('CREATED');
      expect(data.folder.url).toBe(`https://drive.google.com/drive/folders/${saved.cloudFolderId}`);
      const rootCases = await getPrisma().cloudFolder.findFirstOrThrow({ where: { kind: 'ROOT_CASES' } });
      const lawyerFolder = await getPrisma().cloudFolder.findFirstOrThrow({ where: { kind: 'LAWYER' } });
      expect(lawyerFolder.parentCloudFolderId).toBe(rootCases.cloudFolderId);
    });

    // `jurisdiction-folder-label.ts:10` no tiene spec propio: se mira acá.
    it('los fueros AMPARO y ADMINISTRATIVE se llaman «Amparo» y «Administrativo» en la carpeta', async () => {
      const amparo = await register({
        jurisdiction: 'AMPARO',
        proceduralRole: 'ACTORA',
        counterparty: 'APROSS',
        subjectMatter: 'Cobertura integral.',
        caption: 'UNO',
      });
      const administrative = await register({
        jurisdiction: 'ADMINISTRATIVE',
        proceduralRole: 'RECURRENTE',
        counterparty: 'APROSS',
        subjectMatter: 'Se impugna la resolución.',
        caption: 'DOS',
      });

      expect(expectData<FolderBody>(amparo, 201).folder.path).toBe('/VZ Causas/Causas/Ríos, Malena/Amparo/UNO');
      expect(expectData<FolderBody>(administrative, 201).folder.path).toBe(
        '/VZ Causas/Causas/Ríos, Malena/Administrativo/DOS',
      );
    });

    it('un apellido con comilla simple se busca bien en Drive y la carpeta del abogado se reutiliza', async () => {
      const lawyer = await createLawyer({ lastName: "D'Angelo", firstName: 'Ana' });

      await register({ responsibleLawyerId: lawyer.id, caption: 'UNO' });
      await register({ responsibleLawyerId: lawyer.id, caption: 'DOS' });

      expect(stack.fake.foldersNamed("D'Angelo, Ana")).toHaveLength(1);
    });
  });

  describe('carpeta de la causa: privacidad, idempotencia y concurrencia (CA-39.7, CA-39.8)', () => {
    it('no comparte nada y repetir POST /cases/{id}/folder sobre una carpeta creada no hace ningún pedido', async () => {
      const created = expectData<FolderBody>(await register(), 201);
      const before = stack.fake.requests.length;

      const first = await requestFolder(app, actors.actor, created.id);
      const second = await requestFolder(app, actors.actor, created.id);

      expect(expectData<{ url: string }>(first, 200).url).toBe(created.folder.url);
      expect(expectData<{ url: string }>(second, 200).url).toBe(created.folder.url);
      expect(stack.fake.requests.length).toBe(before);
      expect(stack.fake.permissionsRequests).toEqual([]);
      const paths = new Set(stack.fake.driveRequests.map((r) => r.path.replace(/\/files\/[^/]+$/, '/files/:id')));
      expect([...paths].every((path) => path.startsWith('/drive/v3/files'))).toBe(true);
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

  /**
   * Un representante por clase de error, para ver que la forma real del error de la
   * biblioteca llega bien al clasificador. Cada código, en `drive-error.mapper.spec.ts`.
   */
  describe('carpeta de la causa: errores de Google (CA-39.5)', () => {
    it('503 en todos los intentos: reintenta 3 veces con espera de 1 s y 2 s y deja ERROR transitorio', async () => {
      stack.fake.failNext({ status: 503, times: 99 });

      await expectErrorFolder('TRANSIENT');

      expect(stack.fake.driveRequests).toHaveLength(3);
      expect(stack.sleeps).toEqual([1000, 2000]);
    });

    it.each([
      ['403 rateLimitExceeded (el motivo viene en el cuerpo)', { status: 403, reason: 'rateLimitExceeded' }],
      ['un corte de red', { networkError: 'ECONNRESET' }],
    ])('%s una sola vez: reintenta y la carpeta se crea', async (_label, failure) => {
      stack.fake.failNext({ ...failure, times: 1 });

      const res = await register();

      expect(expectData<FolderBody>(res, 201).folder.status).toBe('CREATED');
      expect(stack.sleeps).toEqual([1000]);
      expect(failures).toEqual([]);
    });

    it('403 por permisos: no reintenta y deja ERROR de autorización', async () => {
      stack.fake.failNext({ status: 403, reason: 'insufficientPermissions', times: 99 });

      await expectErrorFolder('AUTHORIZATION');

      expect(stack.fake.driveRequests).toHaveLength(1);
      expect(stack.sleeps).toEqual([]);
    });

    it('404 sobre la carpeta de causas (alguien la borró a mano): ERROR de configuración, sin reintentos', async () => {
      stack.fake.deleteNode(structure.rootCases.id);

      await expectErrorFolder('CONFIGURATION');

      expect(stack.sleeps).toEqual([]);
    });

    it('una respuesta que tarda más que el tiempo de espera: ERROR transitorio por timeout', async () => {
      await useStack({ driveTimeoutMs: 80 });
      stack.fake.driveDelayMs = 1000;

      await expectErrorFolder('TRANSIENT');

      expect(stack.fake.driveRequests).toHaveLength(3);
    });
  });

  /** HU34 y HU35: el archivo del modelo sube a "Modelos formales" por la subida multipart. */
  describe('modelos formales (HU34, HU35)', () => {
    let asLawyer: { Authorization: string };

    beforeEach(async () => {
      const user = await createUser({ roles: ['LAWYER'] });
      asLawyer = loginAs({ userId: user.id, roles: ['LAWYER'] });
    });

    const registerTemplate = (content: Buffer) =>
      request(app.getHttpServer())
        .post(TEMPLATES_URL)
        .set(asLawyer)
        .field('name', 'Recurso de casación')
        .field('jurisdictions', 'CRIMINAL')
        .attach('file', content, { filename: 'casacion.docx', contentType: DOCX });

    it('un archivo de casi 10 MB (el máximo del contrato) sube a "Modelos formales" y baja con los mismos bytes', async () => {
      const content = Buffer.alloc(9 * 1024 * 1024 + 512 * 1024);
      for (let i = 0; i < content.length; i++) content[i] = i % 251; // no repetitivo

      const created = expectData<{ id: number }>(await registerTemplate(content), 201);
      const res = await request(app.getHttpServer())
        .get(`${TEMPLATES_URL}/${created.id}/file`)
        .set(asLawyer)
        .buffer(true)
        .parse((response, done) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => done(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect((res.body as Buffer).equals(content)).toBe(true);
      const [file] = stack.fake.files;
      expect(file.name).toBe('casacion.docx');
      expect(file.parentId).toBe(structure.templates.id);
    });

    it('si Drive falla al subir responde 502 con el texto del contrato y no registra el modelo (CA-34.7)', async () => {
      stack.fake.failNext({ status: 503, times: 99 });

      const res = await registerTemplate(Buffer.from('contenido'));

      expectError(res, 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
      expect(res.body.error.message).toBe(
        'No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.',
      );
      expect(await getPrisma().documentTemplate.count()).toBe(0);
      expect(stack.fake.files).toEqual([]);
      expect(stack.fake.driveRequests).toHaveLength(3);
    });
  });

  /**
   * HU39 · El refresh token. `GoogleOAuthClientService` lo guarda y el `OAuth2Client`
   * de Google lo canjea por un access token cuando hace falta; el Google falso valida
   * el canje.
   */
  describe('refresh token y autorización con Google (HU39)', () => {
    let logged: string[];

    beforeEach(() => {
      logged = [];
      for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
        jest.spyOn(Logger.prototype, level).mockImplementation((...args: unknown[]) => {
          logged.push(args.map(String).join(' '));
        });
      }
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('canjea el refresh token con las credenciales configuradas una sola vez mientras el access token sigue vigente', async () => {
      await register({ caption: 'UNO' });
      await register({ caption: 'DOS' });
      await register({ caption: 'TRES' });

      const [exchange] = stack.fake.tokenRequests;
      expect(exchange.method).toBe('POST');
      expect(exchange.body).toEqual({
        grant_type: 'refresh_token',
        refresh_token: FAKE_GOOGLE_CREDENTIALS.refreshToken,
        client_id: FAKE_GOOGLE_CREDENTIALS.clientId,
        client_secret: FAKE_GOOGLE_CREDENTIALS.clientSecret,
      });
      expect(stack.fake.tokenExchanges).toBe(1);
      expect(stack.fake.driveRequests.length).toBeGreaterThan(6);
      expect(new Set(stack.fake.driveRequests.map((r) => r.authorization))).toEqual(
        new Set(['Bearer ya29.fake-access-token-1']),
      );
    });

    it('si el access token está por vencer, cada pedido lo renueva y todo sigue funcionando', async () => {
      await useStack({ accessTokenLifetimeSeconds: 1 });

      const res = await register();

      expect(expectData<FolderBody>(res, 201).folder.status).toBe('CREATED');
      expect(stack.fake.tokenExchanges).toBe(stack.fake.driveRequests.length);
      expect(new Set(stack.fake.driveRequests.map((r) => r.authorization)).size).toBe(stack.fake.driveRequests.length);
    });

    it('refresh token revocado: la causa se registra con la carpeta en ERROR, sin reintentos, y al reautorizar POST /folder la deja CREATED', async () => {
      stack.fake.revokeRefreshToken();

      const created = await expectErrorFolder('AUTHORIZATION');

      expect(stack.fake.tokenRequests).toHaveLength(1);
      expect(stack.fake.driveRequests).toEqual([]);
      expect(stack.sleeps).toEqual([]);

      stack.fake.restoreRefreshToken(FAKE_GOOGLE_CREDENTIALS.refreshToken);
      const res = await requestFolder(app, actors.actor, created.id);

      expect(expectData<{ status: string; url: string }>(res, 200)).toMatchObject({
        status: 'CREATED',
        url: expect.stringContaining('fake-folder-'),
      });
      expect(stack.fake.tokenExchanges).toBe(1);
    });

    it('cliente OAuth inválido (secreto rotado): ERROR de autorización', async () => {
      stack.fake.rotateClientSecret();

      await expectErrorFolder('AUTHORIZATION');

      expect(stack.fake.tokenRequests).toHaveLength(1);
    });

    it('ni el refresh token, ni el secreto del cliente, ni el access token aparecen en las respuestas ni en el log', async () => {
      const responses: string[] = [];

      // Un alta que sale bien y, con el refresh token revocado, un alta fallida y su reintento.
      const ok = await register({ caption: 'BIEN' });
      responses.push(ok.text);
      stack.fake.revokeRefreshToken();
      const failed = await register({ caption: 'MAL' });
      responses.push(failed.text);
      const retry = await requestFolder(app, actors.actor, expectData<FolderBody>(failed, 201).id);
      responses.push(retry.text);

      const everything = [...responses, ...logged].join('\n');
      expect(everything).not.toContain(FAKE_GOOGLE_CREDENTIALS.refreshToken);
      expect(everything).not.toContain(FAKE_GOOGLE_CREDENTIALS.clientSecret);
      expect(everything).not.toContain('ya29.');
      expect(logged.length).toBeGreaterThan(0);
    });
  });
});
