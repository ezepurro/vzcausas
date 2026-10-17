import { DocumentStorageUnavailableError } from '../../../core/domain/errors/documents.errors';
import { InMemoryDocumentStorage } from './in-memory-document-storage';

describe('InMemoryDocumentStorage', () => {
  let storage: InMemoryDocumentStorage;

  beforeEach(() => {
    storage = new InMemoryDocumentStorage();
  });

  it('crea una carpeta con id y enlace', async () => {
    const folder = await storage.create({ parentId: 'root', name: 'Causas' });

    expect(folder.id).toBeTruthy();
    expect(folder.url).toContain(folder.id);
    expect(storage.folders).toHaveLength(1);
  });

  it('encuentra una carpeta por padre y nombre', async () => {
    const created = await storage.create({ parentId: 'root', name: 'Causas' });

    expect(await storage.findByReference({ parentId: 'root', name: 'Causas' })).toEqual(created);
  });

  it('devuelve null si el nombre existe bajo otro padre', async () => {
    await storage.create({ parentId: 'root', name: 'Causas' });

    expect(await storage.findByReference({ parentId: 'otro', name: 'Causas' })).toBeNull();
    expect(await storage.findByReference({ parentId: 'root', name: 'Otra' })).toBeNull();
  });

  it('como un drive real, crear dos veces el mismo nombre genera dos carpetas', async () => {
    const a = await storage.create({ parentId: 'root', name: 'GARCÍA' });
    const b = await storage.create({ parentId: 'root', name: 'GARCÍA' });

    expect(a.id).not.toBe(b.id);
  });

  it('falla una sola vez cuando se le pide y vuelve a funcionar', async () => {
    storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    await expect(storage.create({ parentId: 'root', name: 'X' })).rejects.toBeInstanceOf(
      DocumentStorageUnavailableError,
    );
    await expect(storage.create({ parentId: 'root', name: 'X' })).resolves.toBeDefined();
    expect(storage.folders).toHaveLength(1);
  });

  it('registra las llamadas recibidas', async () => {
    await storage.findByReference({ parentId: 'root', name: 'A' });
    await storage.create({ parentId: 'root', name: 'A' });

    expect(storage.calls.map((c) => c.method)).toEqual(['findByReference', 'create']);
  });
});
