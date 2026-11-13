import { aSetUpStudio } from '../../test-support/document-fixtures';
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

  it('sin la carpeta raíz del estudio registrada, falla sin crear nada', async () => {
    const { folders, storage } = await aBin();
    const withoutRoot = Object.assign(Object.create(folders), { findByKey: async () => null });

    await expect(new RecycleBin(withoutRoot, storage).folder()).rejects.toMatchObject({
      code: 'STUDIO_ROOT_NOT_CONFIGURED',
    });
    expect(storage.calls.filter((c) => c.method === 'createFolder')).toEqual([]);
  });
});
