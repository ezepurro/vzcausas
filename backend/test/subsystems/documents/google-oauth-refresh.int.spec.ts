import { INestApplication, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import {
  DOCUMENT_SPACE_CREATION_FAILED,
  DocumentSpaceCreationFailedEvent,
} from '../../../src/subsystems/documents/core/domain/ports/events/document-space-creation-failed.event';
import { expectData } from '../../shared/contract/envelopes';
import { clearCloudFolders, createCloudStructure } from '../../shared/factories/cloud-structure.factory';
import {
  CaseFolderActors,
  SwitchableStorage,
  registerCase,
  requestFolder,
  resetDatabaseForCaseFolders,
  seedCaseFolderActors,
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
  folder: { status: string; url: string | null };
}

/*
 * HU39 · El refresh token y la autorización con Google.
 *
 * `GoogleOAuthClientService` guarda el refresh token y el `OAuth2Client` de
 * Google lo canjea por un access token cuando hace falta. Acá corre ese cliente
 * REAL contra un Google falso que valida el canje, para ver: cuándo se canjea,
 * qué pasa cuando el token se revoca o el cliente es inválido, y que ningún
 * secreto llega a las respuestas ni al log.
 */
describe('Refresh token y autorización con Google (HU39)', () => {
  let app: INestApplication;
  let emitter: EventEmitter2;
  const storage = new SwitchableStorage();
  let stack: GoogleStack;
  let actors: CaseFolderActors;
  const failures: DocumentSpaceCreationFailedEvent[] = [];
  const onFailed = (event: DocumentSpaceCreationFailedEvent) => failures.push(event);
  let logged: string[];

  async function useStack(options: GoogleStackOptions = {}) {
    await clearCloudFolders();
    stack = buildGoogleStack(options);
    storage.current = stack;
    await createCloudStructure({ seed: (parent, name) => stack.fake.seedFolder(name, parent) });
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

    logged = [];
    for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
      jest.spyOn(Logger.prototype, level).mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(' '));
      });
    }
  });

  afterEach(() => {
    emitter.off(DOCUMENT_SPACE_CREATION_FAILED, onFailed);
    jest.restoreAllMocks();
  });

  const register = (overrides: Record<string, unknown> = {}) => registerCase(app, actors, overrides);

  describe('canje del refresh token', () => {
    it('el primer pedido canjea el refresh token con las credenciales configuradas, y Drive se llama con el access token', async () => {
      await register();

      const [exchange] = stack.fake.tokenRequests;
      expect(exchange.method).toBe('POST');
      expect(exchange.body).toEqual({
        grant_type: 'refresh_token',
        refresh_token: FAKE_GOOGLE_CREDENTIALS.refreshToken,
        client_id: FAKE_GOOGLE_CREDENTIALS.clientId,
        client_secret: FAKE_GOOGLE_CREDENTIALS.clientSecret,
      });
      expect(stack.fake.driveRequests.length).toBeGreaterThan(0);
      expect(new Set(stack.fake.driveRequests.map((r) => r.authorization))).toEqual(
        new Set(['Bearer ya29.fake-access-token-1']),
      );
    });

    it('con el access token vigente no se vuelve a canjear: varios pedidos, un solo canje', async () => {
      await register({ caption: 'UNO' });
      await register({ caption: 'DOS' });
      await register({ caption: 'TRES' });

      expect(stack.fake.driveRequests.length).toBeGreaterThan(6);
      expect(stack.fake.tokenExchanges).toBe(1);
    });

    it('si el access token está por vencer, cada pedido lo renueva y todo sigue funcionando', async () => {
      await useStack({ accessTokenLifetimeSeconds: 1 });

      const res = await register();

      expect(expectData<FolderBody>(res, 201).folder.status).toBe('CREATED');
      expect(stack.fake.tokenExchanges).toBe(stack.fake.driveRequests.length);
      expect(new Set(stack.fake.driveRequests.map((r) => r.authorization)).size).toBe(
        stack.fake.driveRequests.length,
      );
    });
  });

  describe('autorización perdida (invalid_grant e invalid_client)', () => {
    it('refresh token revocado: la causa se registra, la carpeta queda en ERROR y no se reintenta el canje', async () => {
      stack.fake.revokeRefreshToken();

      const res = await register();

      const data = expectData<FolderBody>(res, 201);
      expect(data.folder).toMatchObject({ status: 'ERROR', url: null });
      expect((await getPrisma().case.findUniqueOrThrow({ where: { id: data.id } })).folderStatus).toBe('ERROR');
      expect(failures.map((f) => f.reason)).toEqual(['AUTHORIZATION']);
      expect(stack.fake.tokenRequests).toHaveLength(1);
      expect(stack.fake.driveRequests).toEqual([]);
      expect(stack.sleeps).toEqual([]);
    });

    it('al reautorizar, POST /cases/{id}/folder deja la carpeta CREATED sin tocar la causa', async () => {
      stack.fake.revokeRefreshToken();
      const created = expectData<FolderBody>(await register(), 201);
      expect(created.folder.status).toBe('ERROR');

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

      const res = await register();

      expect(expectData<FolderBody>(res, 201).folder.status).toBe('ERROR');
      expect(failures.map((f) => f.reason)).toEqual(['AUTHORIZATION']);
      expect(stack.fake.tokenRequests).toHaveLength(1);
    });
  });

  describe('secretos', () => {
    it('ni el refresh token, ni el secreto del cliente, ni el access token aparecen en las respuestas ni en el log', async () => {
      const responses: string[] = [];
      const capture = (res: { text: string }) => responses.push(res.text);

      // Un alta que sale bien y, con el refresh token revocado, un alta fallida y su reintento.
      const ok = await register({ caption: 'BIEN' });
      capture(ok);
      stack.fake.revokeRefreshToken();
      const failed = await register({ caption: 'MAL' });
      capture(failed);
      const retry = await requestFolder(app, actors.actor, expectData<FolderBody>(failed, 201).id);
      capture(retry);

      const everything = [...responses, ...logged].join('\n');
      expect(everything).not.toContain(FAKE_GOOGLE_CREDENTIALS.refreshToken);
      expect(everything).not.toContain(FAKE_GOOGLE_CREDENTIALS.clientSecret);
      expect(everything).not.toContain('ya29.');
      expect(logged.length).toBeGreaterThan(0);
    });
  });
});
