import { InMemoryDocumentStorage } from '../../../infrastructure/storage/in-memory/in-memory-document-storage';
import { aSetUpStudio } from '../../test-support/document-fixtures';
import { DocumentStorageUnavailableError } from '../../domain/errors/documents.errors';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { RecycleBin } from './recycle-bin';

/* HU21 y HU37: la Papelera que comparten la baja de causas y la de modelos. */

describe('RecycleBin', () => {
  async function aBin() {
    const studio = await aSetUpStudio();
    const mainId = (await studio.folders.findByKey(FolderKey.main()))!.cloudFolderId;
    const papeleras = () => studio.storage.folders.filter((f) => f.name === 'Papelera' && f.parentId === mainId);
    return { ...studio, mainId, papeleras, bin: new RecycleBin(studio.folders, studio.storage) };
  }

  it('la primera vez crea Papelera bajo la raíz del estudio; después la reutiliza', async () => {
    const { bin, papeleras } = await aBin();

    const first = await bin.folder();
    const second = await bin.folder();

    expect(second.id).toBe(first.id);
    expect(papeleras()).toHaveLength(1);
  });

  it('pedidas a la vez por quien dio de baja una causa y quien dio de baja un modelo, crea una sola', async () => {
    const { bin, papeleras } = await aBin();

    const [forCase, forTemplate] = await Promise.all([bin.folder(), bin.folder()]);

    expect(forCase.id).toBe(forTemplate.id);
    expect(papeleras()).toHaveLength(1);
  });

  // HU36, HU37
  describe('moveFiles', () => {
    const seedFiles = (storage: InMemoryDocumentStorage, parentId: string, ids: string[]) =>
      ids.forEach((id) =>
        storage.seedFile({ id, parentId, name: `${id}.docx`, mimeType: 'application/x', createdAt: new Date() }),
      );

    it('mueve cada archivo a la Papelera y es idempotente: repetirlo los deja ahí', async () => {
      const { bin, storage, mainId } = await aBin();
      seedFiles(storage, mainId, ['a', 'b']);

      await bin.moveFiles(['a', 'b']);
      await bin.moveFiles(['a', 'b']);

      const papelera = (await bin.folder()).id;
      expect(storage.files.map((file) => file.parentId)).toEqual([papelera, papelera]);
    });

    it('sin archivos no toca la nube, ni crea la Papelera', async () => {
      const { bin, storage, papeleras } = await aBin();
      storage.calls.length = 0;

      await bin.moveFiles([]);

      expect(storage.calls).toEqual([]);
      expect(papeleras()).toHaveLength(0);
    });

    it('si un archivo falla prueba con los demás y avisa el primer fallo', async () => {
      const { bin, storage, mainId } = await aBin();
      seedFiles(storage, mainId, ['a', 'b']);
      storage.failNextCallTo('moveFile', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      await expect(bin.moveFiles(['a', 'b'])).rejects.toBeInstanceOf(DocumentStorageUnavailableError);

      expect(storage.files.find((file) => file.id === 'a')?.parentId).toBe(mainId);
      expect(storage.files.find((file) => file.id === 'b')?.parentId).toBe((await bin.folder()).id);
    });
  });

  it('sin la carpeta raíz del estudio registrada, falla sin crear nada', async () => {
    const { folders, storage } = await aBin();
    const withoutRoot = Object.assign(Object.create(folders), { findByKey: async () => null });

    await expect(new RecycleBin(withoutRoot, storage).folder()).rejects.toMatchObject({
      code: 'STUDIO_ROOT_NOT_CONFIGURED',
    });
    expect(storage.calls.filter((c) => c.method === 'createFolder')).toEqual([]);
  });
});
