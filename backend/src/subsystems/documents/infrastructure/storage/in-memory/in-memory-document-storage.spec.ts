import { DocumentStorageUnavailableError } from '../../../core/domain/errors/documents.errors';
import { InMemoryDocumentStorage } from './in-memory-document-storage';

describe('InMemoryDocumentStorage', () => {
  let storage: InMemoryDocumentStorage;

  beforeEach(() => {
    storage = new InMemoryDocumentStorage();
  });

  it('crea una carpeta con id y enlace', async () => {
    const folder = await storage.createFolder({ parentId: 'root', name: 'Causas' });

    expect(folder.id).toBeTruthy();
    expect(folder.url).toContain(folder.id);
    expect(storage.folders).toHaveLength(1);
  });

  it('encuentra una carpeta por padre y nombre', async () => {
    const created = await storage.createFolder({ parentId: 'root', name: 'Causas' });

    expect(await storage.findFolderByReference({ parentId: 'root', name: 'Causas' })).toEqual(created);
  });

  it('devuelve null si el nombre existe bajo otro padre', async () => {
    await storage.createFolder({ parentId: 'root', name: 'Causas' });

    expect(await storage.findFolderByReference({ parentId: 'otro', name: 'Causas' })).toBeNull();
    expect(await storage.findFolderByReference({ parentId: 'root', name: 'Otra' })).toBeNull();
  });

  it('como un drive real, crear dos veces el mismo nombre genera dos carpetas', async () => {
    const a = await storage.createFolder({ parentId: 'root', name: 'GARCÍA' });
    const b = await storage.createFolder({ parentId: 'root', name: 'GARCÍA' });

    expect(a.id).not.toBe(b.id);
  });

  describe('copyFile (HU40)', () => {
    const upload = (content: string) =>
      storage.uploadFile({ parentId: 'modelos', name: 'modelo.docx', mimeType: 'application/x', content: Buffer.from(content) });

    it('copia el archivo a otra carpeta con el nombre pedido y otro id', async () => {
      const original = await upload('v1');

      const copy = await storage.copyFile({ fileId: original.id, parentId: 'causa', name: 'copia.docx' });

      expect(copy.id).not.toBe(original.id);
      expect(storage.files.find((f) => f.id === copy.id)).toMatchObject({ parentId: 'causa', name: 'copia.docx' });
      expect((await storage.downloadFile(copy.id)).toString()).toBe('v1');
    });

    it('la copia no cambia si el original cambia después (CA-40.6)', async () => {
      const original = await upload('v1');
      const copy = await storage.copyFile({ fileId: original.id, parentId: 'causa', name: 'copia.docx' });

      storage.files.find((f) => f.id === original.id)!.content.write('v2');

      expect((await storage.downloadFile(copy.id)).toString()).toBe('v1');
    });

    it('falla si el archivo a copiar no existe', async () => {
      await expect(storage.copyFile({ fileId: 'no-existe', parentId: 'causa', name: 'x.docx' })).rejects.toThrow();
    });
  });

  it('falla una sola vez cuando se le pide y vuelve a funcionar', async () => {
    storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(storage.createFolder({ parentId: 'root', name: 'X' })).rejects.toBeInstanceOf(
      DocumentStorageUnavailableError,
    );
    await expect(storage.createFolder({ parentId: 'root', name: 'X' })).resolves.toBeDefined();
    expect(storage.folders).toHaveLength(1);
  });

  it('registra las llamadas recibidas', async () => {
    await storage.findFolderByReference({ parentId: 'root', name: 'A' });
    await storage.createFolder({ parentId: 'root', name: 'A' });

    expect(storage.calls.map((c) => c.method)).toEqual(['findFolderByReference', 'createFolder']);
  });
  it('crea una carpeta en la raíz de la cuenta con padre null', async () => {
    const main = await storage.createFolder({ parentId: null, name: 'VZ Causas' });

    expect(await storage.findFolderByReference({ parentId: null, name: 'VZ Causas' })).toEqual(main);
  });

  it('getFolder devuelve la carpeta por id, o null si no existe', async () => {
    const created = await storage.createFolder({ parentId: 'root', name: 'Causas' });

    expect(await storage.getFolder(created.id)).toEqual(created);
    expect(await storage.getFolder('no-existe')).toBeNull();
  });

  it('deleteFolder borra la carpeta con todo lo que tiene adentro', async () => {
    const parent = await storage.createFolder({ parentId: null, name: 'VZ Causas' });
    const child = await storage.createFolder({ parentId: parent.id, name: 'Causas' });
    await storage.uploadFile({ parentId: child.id, name: 'a.docx', mimeType: 'x', content: Buffer.from('a') });
    const other = await storage.createFolder({ parentId: null, name: 'Otra' });

    await storage.deleteFolder(parent.id);

    expect(storage.folders.map((f) => f.id)).toEqual([other.id]);
    expect(storage.files).toHaveLength(0);
    expect(storage.deletedFolderIds).toEqual([parent.id]);
  });

  it('deleteFolder sobre una carpeta que ya no existe no es un error', async () => {
    await expect(storage.deleteFolder('no-existe')).resolves.toBeUndefined();
  });
});
