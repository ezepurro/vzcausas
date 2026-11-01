import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthClientService } from '@shared/infrastructure/google/google-oauth-client.service';
import { Readable } from 'node:stream';
import { DocumentStorageUnavailableError } from '../../../core/domain/errors/documents.errors';
import {
  DriveFilesClient,
  GoogleDriveDocumentStorage,
  escapeQueryValue,
} from './google-drive-document-storage.adapter';

// Never used when a fake Drive client is passed to the constructor.
const unusedOauth = {} as GoogleOAuthClientService;

function config(values: Record<string, string> = {}): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

const httpError = (status: number, reason?: string) => ({
  response: { status },
  errors: reason ? [{ reason }] : undefined,
});

function build(overrides: Partial<Record<'list' | 'create' | 'get' | 'delete' | 'copy', jest.Mock>> = {}, values = {}) {
  const files = {
    copy: jest.fn().mockResolvedValue({ data: { id: 'copy-id', webViewLink: 'https://drive/copy-id' } }),
    list: jest.fn().mockResolvedValue({ data: { files: [] } }),
    create: jest.fn().mockResolvedValue({ data: { id: 'new-id', webViewLink: 'https://drive/new-id' } }),
    get: jest.fn().mockResolvedValue({ data: { id: 'f-1', webViewLink: 'https://drive/f-1', trashed: false } }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    ...overrides,
  };
  const sleep = jest.fn().mockResolvedValue(undefined);
  const storage = new GoogleDriveDocumentStorage(
    unusedOauth,
    config(values),
    { files } as unknown as DriveFilesClient,
    sleep,
  );
  return { storage, files, sleep };
}

describe('GoogleDriveDocumentStorage', () => {
  let logged: string[];

  beforeEach(() => {
    logged = [];
    for (const level of ['debug', 'log', 'warn', 'error'] as const) {
      jest.spyOn(Logger.prototype, level).mockImplementation((...args: unknown[]) => {
        logged.push(String(args[0]));
      });
    }
  });

  afterEach(() => jest.restoreAllMocks());

  describe('createFolder', () => {
    it('crea una carpeta de tipo carpeta bajo su padre y devuelve id y enlace', async () => {
      const { storage, files } = build();

      const folder = await storage.createFolder({ parentId: 'parent-1', name: 'Penal' });

      expect(folder).toEqual({ id: 'new-id', url: 'https://drive/new-id' });
      expect(files.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            name: 'Penal',
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['parent-1'],
          },
        }),
        expect.objectContaining({ timeout: 15000 }),
      );
    });

    it('arma el enlace si Drive no lo devuelve', async () => {
      const { storage } = build({ create: jest.fn().mockResolvedValue({ data: { id: 'abc' } }) });

      expect((await storage.createFolder({ parentId: 'p', name: 'X' })).url).toBe(
        'https://drive.google.com/drive/folders/abc',
      );
    });
  });

  // La privacidad (CA-39.8) se mira con la biblioteca real en `test/subsystems/documents/google-stack.int.spec.ts`.

  it('con padre null crea y busca en la raíz de la cuenta', async () => {
    const { storage, files } = build();

    await storage.createFolder({ parentId: null, name: 'VZ Causas' });
    await storage.findFolderByReference({ parentId: null, name: 'VZ Causas' });

    expect(files.create.mock.calls[0][0].requestBody.parents).toEqual(['root']);
    expect(files.list.mock.calls[0][0].q).toContain("'root' in parents");
  });

  it('si la carpeta o el archivo ya no existen en la nube, crear, copiar y descargar fallan como error de configuración', async () => {
    const { storage } = build({
      create: jest.fn().mockRejectedValue(httpError(404)),
      copy: jest.fn().mockRejectedValue(httpError(404)),
      get: jest.fn().mockRejectedValue(httpError(404)),
    });

    for (const call of [
      storage.createFolder({ parentId: 'gone', name: 'X' }),
      storage.copyFile({ fileId: 'x', parentId: 'p', name: 'a.docx' }),
      storage.downloadFile('gone'),
    ]) {
      await expect(call).rejects.toMatchObject({ reason: 'CONFIGURATION' });
    }
  });

  describe('findFolderByReference', () => {
    it('busca por padre, nombre y tipo, sin carpetas en la papelera', async () => {
      const { storage, files } = build({
        list: jest.fn().mockResolvedValue({ data: { files: [{ id: 'f-9', webViewLink: 'https://drive/f-9' }] } }),
      });

      const found = await storage.findFolderByReference({ parentId: 'p-1', name: 'Penal' });

      expect(found).toEqual({ id: 'f-9', url: 'https://drive/f-9' });
      const query = files.list.mock.calls[0][0].q as string;
      expect(query).toContain("'p-1' in parents");
      expect(query).toContain("name = 'Penal'");
      expect(query).toContain("mimeType = 'application/vnd.google-apps.folder'");
      expect(query).toContain('trashed = false');
    });

    it('devuelve null si no hay resultados', async () => {
      const { storage } = build();

      expect(await storage.findFolderByReference({ parentId: 'p', name: 'Nada' })).toBeNull();
    });

    it('escapa las comillas y las barras del nombre en la consulta', async () => {
      const { storage, files } = build();

      await storage.findFolderByReference({ parentId: 'p', name: "O'Brien \\ Sons" });

      expect(files.list.mock.calls[0][0].q).toContain("name = 'O\\'Brien \\\\ Sons'");
      expect(escapeQueryValue('GÓMEZ, Ariel')).toBe('GÓMEZ, Ariel');
    });
  });

  describe('getFolder', () => {
    it('devuelve la carpeta si existe', async () => {
      const { storage } = build();

      expect(await storage.getFolder('f-1')).toEqual({ id: 'f-1', url: 'https://drive/f-1' });
    });

    it('devuelve null si Drive responde 404 o si está en la papelera', async () => {
      const notFound = build({ get: jest.fn().mockRejectedValue(httpError(404)) });
      const trashed = build({
        get: jest.fn().mockResolvedValue({ data: { id: 'f-1', trashed: true } }),
      });

      expect(await notFound.storage.getFolder('f-1')).toBeNull();
      expect(await trashed.storage.getFolder('f-1')).toBeNull();
    });
  });

  describe('deleteFolder y deleteFile', () => {
    it('borran por id', async () => {
      const { storage, files } = build();

      await storage.deleteFolder('folder-1');
      await storage.deleteFile('file-1');

      expect(files.delete.mock.calls.map((call) => call[0])).toEqual([
        { fileId: 'folder-1' },
        { fileId: 'file-1' },
      ]);
    });

    it('lo que ya no existe no es un error; otros fallos sí se informan', async () => {
      const gone = build({ delete: jest.fn().mockRejectedValue(httpError(404)) });
      const forbidden = build({ delete: jest.fn().mockRejectedValue(httpError(403, 'insufficientPermissions')) });

      await expect(gone.storage.deleteFolder('gone')).resolves.toBeUndefined();
      await expect(gone.storage.deleteFile('gone')).resolves.toBeUndefined();
      await expect(forbidden.storage.deleteFile('x')).rejects.toMatchObject({ reason: 'AUTHORIZATION' });
    });
  });

  describe('uploadFile', () => {
    it('sube el contenido como flujo, con su tipo, a la carpeta indicada', async () => {
      const { storage, files } = build();

      const stored = await storage.uploadFile({
        parentId: 'templates-1',
        name: 'designacion.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        content: Buffer.from('contenido'),
      });

      expect(stored).toEqual({ id: 'new-id', url: 'https://drive/new-id' });
      const args = files.create.mock.calls[0][0];
      expect(args.requestBody).toEqual({ name: 'designacion.docx', parents: ['templates-1'] });
      expect(args.media.mimeType).toContain('wordprocessingml');
      expect(args.media.body).toBeInstanceOf(Readable);
    });

    it('en cada reintento arma un flujo nuevo, porque el anterior ya se consumió', async () => {
      const create = jest
        .fn()
        .mockRejectedValueOnce(httpError(503))
        .mockResolvedValueOnce({ data: { id: 'ok', webViewLink: 'u' } });
      const { storage } = build({ create });

      await storage.uploadFile({ parentId: 'p', name: 'a.docx', mimeType: 'x', content: Buffer.from('a') });

      const first = create.mock.calls[0][0].media.body;
      const second = create.mock.calls[1][0].media.body;
      expect(second).not.toBe(first);
    });
  });

  describe('copyFile (HU40)', () => {
    it('copia dentro de Drive con files.copy, al destino y con el nombre indicados', async () => {
      const copy = jest.fn().mockResolvedValue({ data: { id: 'copy-1', webViewLink: 'https://drive/copy-1' } });
      const { storage, files } = build({ copy });

      const stored = await storage.copyFile({ fileId: 'template-1', parentId: 'case-folder', name: 'modelo.docx' });

      expect(stored).toEqual({ id: 'copy-1', url: 'https://drive/copy-1' });
      expect(copy.mock.calls[0][0]).toMatchObject({
        fileId: 'template-1',
        requestBody: { name: 'modelo.docx', parents: ['case-folder'] },
      });
      // Nothing is downloaded or uploaded: the copy happens inside Drive.
      expect(files.get).not.toHaveBeenCalled();
      expect(files.create).not.toHaveBeenCalled();
    });

  });

  describe('downloadFile', () => {
    it('devuelve el contenido como Buffer', async () => {
      const bytes = new TextEncoder().encode('hola').buffer;
      const { storage, files } = build({ get: jest.fn().mockResolvedValue({ data: bytes }) });

      const content = await storage.downloadFile('file-1');

      expect(content.toString()).toBe('hola');
      expect(files.get.mock.calls[0][0]).toEqual({ fileId: 'file-1', alt: 'media' });
      expect(files.get.mock.calls[0][1]).toMatchObject({ responseType: 'arraybuffer' });
    });

  });

  // Qué error se reintenta y cuál es de autorización lo decide `classifyDriveError`, con su
  // tabla en `drive-error.mapper.spec.ts`. Acá, un representante de cada rama.
  describe('reintentos y errores', () => {
    it('reintenta un error transitorio y termina bien si el segundo intento funciona', async () => {
      const create = jest
        .fn()
        .mockRejectedValueOnce(httpError(503))
        .mockResolvedValueOnce({ data: { id: 'ok', webViewLink: 'u' } });
      const { storage, sleep } = build({ create });

      await expect(storage.createFolder({ parentId: 'p', name: 'X' })).resolves.toEqual({ id: 'ok', url: 'u' });

      expect(create).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledWith(1000);
    });

    it('espera 1 s y 2 s entre intentos y se rinde al tercero con un error transitorio', async () => {
      const create = jest.fn().mockRejectedValue(httpError(503));
      const { storage, sleep } = build({ create });

      await expect(storage.createFolder({ parentId: 'p', name: 'X' })).rejects.toMatchObject({
        reason: 'TRANSIENT',
      });

      expect(create).toHaveBeenCalledTimes(3);
      expect(sleep.mock.calls.map((call) => call[0])).toEqual([1000, 2000]);
    });

    it('no reintenta un error de autorización y lo informa como tal', async () => {
      const create = jest.fn().mockRejectedValue(httpError(403, 'insufficientPermissions'));
      const { storage, sleep } = build({ create });

      const error = await storage.createFolder({ parentId: 'p', name: 'X' }).catch((e) => e);

      expect(error).toBeInstanceOf(DocumentStorageUnavailableError);
      expect(error.reason).toBe('AUTHORIZATION');
      expect(create).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });

    it('usa el tiempo de espera configurado', async () => {
      const { storage, files } = build({}, { DRIVE_REQUEST_TIMEOUT_MS: '4000' });

      await storage.getFolder('f-1');

      expect(files.get.mock.calls[0][1]).toMatchObject({ timeout: 4000 });
    });

    it('no escribe en el registro tokens ni nombres de carpeta fuera del nivel debug', async () => {
      const create = jest.fn().mockRejectedValue({
        response: { status: 500, data: { access_token: 'ya29.SECRET' } },
      });
      const { storage } = build({ create });

      await storage.createFolder({ parentId: 'p', name: 'GÓMEZ, Ariel c/ PÉREZ' }).catch(() => undefined);

      expect(logged.join('\n')).not.toContain('SECRET');
      const warningsAndErrors = [
        ...(Logger.prototype.warn as jest.Mock).mock.calls,
        ...(Logger.prototype.error as jest.Mock).mock.calls,
      ]
        .map((call) => String(call[0]))
        .join('\n');
      expect(warningsAndErrors).not.toContain('GÓMEZ');
    });
  });
});
