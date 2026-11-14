import { Logger } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ForbiddenActionError, ValidationError } from '@shared/domain/domain-error';
import { InMemoryCloudFolderRepository } from '../../../infrastructure/persistence/in-memory/in-memory-cloud-folder.repository';
import { InMemoryDocumentStorage } from '../../../infrastructure/storage/in-memory/in-memory-document-storage';
import { DOCX_MIME_TYPE, TemplateJurisdiction } from '../../domain/entities/document-template.entity';
import {
  DocumentStorageUnavailableError,
  DocumentTemplateAlreadyExistsError,
  DocumentTemplateNotFoundError,
} from '../../domain/errors/documents.errors';
import { CloudFolderFactory } from '../../domain/factories/cloud-folder.factory';
import { FakeClock, NOW } from '../../test-support/document-fixtures';
import { FakeDocumentTemplateRepository } from '../../test-support/fake-document-template.repository';
import { RecycleBin } from '../common/recycle-bin';
import { TemplateCloudFiles } from '../common/template-cloud-files';
import { SetupCloudStorage } from './setup-cloud-storage.use-case';
import { UpdateDocumentTemplate, UpdateDocumentTemplateCommand } from './update-document-template.use-case';

/* HU36 · Modificar un modelo formal. */

const actor = (roleNames: string[] = ['LAWYER'], userId = 9): AuthenticatedUser => ({
  userId,
  roleNames,
  lawyerId: roleNames.includes('LAWYER') ? 3 : null,
  permissions: [],
});

const LABELS: Record<TemplateJurisdiction, string> = {
  CRIMINAL: 'Penal',
  ADMINISTRATIVE: 'Administrativo',
  AMPARO: 'Amparo',
};
/** Los ids de fuero que da el fake: CRIMINAL 1, ADMINISTRATIVE 2, AMPARO 3. */
const JURISDICTION_IDS: Record<TemplateJurisdiction, number> = { CRIMINAL: 1, ADMINISTRATIVE: 2, AMPARO: 3 };
const BEFORE = new Date('2026-09-01T10:00:00.000Z');
const newFile = (name = 'nuevo.docx') => ({
  originalName: name,
  mimeType: DOCX_MIME_TYPE,
  content: Buffer.from(`contenido de ${name}`),
});

/** El estudio con "Modelos formales" y una subcarpeta por fuero, como la deja el script de puesta en marcha. */
async function aStudio() {
  const templates = new FakeDocumentTemplateRepository();
  const folders = new InMemoryCloudFolderRepository();
  const storage = new InMemoryDocumentStorage();
  const main = storage.seed('account-root', 'VZ Causas');
  const templatesFolder = storage.seed(main.id, 'Modelos formales');
  const saveFolder = (kind: 'MAIN' | 'TEMPLATES' | 'JURISDICTION', folder: { id: string; url: string }, name: string, extra = {}) =>
    folders.save(
      CloudFolderFactory.create({
        kind,
        cloudFolderId: folder.id,
        name,
        url: folder.url,
        parentCloudFolderId: kind === 'MAIN' ? null : kind === 'TEMPLATES' ? main.id : templatesFolder.id,
        createdAt: NOW,
        ...extra,
      }),
    );
  await saveFolder('MAIN', main, 'VZ Causas');
  await saveFolder('TEMPLATES', templatesFolder, 'Modelos formales');
  const folderOf = {} as Record<TemplateJurisdiction, string>;
  for (const code of Object.keys(LABELS) as TemplateJurisdiction[]) {
    const folder = storage.seed(templatesFolder.id, LABELS[code]);
    folderOf[code] = folder.id;
    await saveFolder('JURISDICTION', folder, LABELS[code], { jurisdictionId: JURISDICTION_IDS[code] });
  }

  const setup = new SetupCloudStorage(folders, storage, new FakeClock(), templates);
  const useCase = new UpdateDocumentTemplate(
    templates,
    new FakeClock(),
    new TemplateCloudFiles(templates, folders, storage, setup),
    new RecycleBin(folders, storage),
  );

  /** Un modelo con un archivo en la subcarpeta de cada fuero (id `f-{fuero}`); el principal es el del primero. */
  const aModernTemplate = (jurisdictions: TemplateJurisdiction[] = ['CRIMINAL', 'AMPARO'], id = 5) => {
    const placements = jurisdictions.map((jurisdiction) => {
      const cloudFileId = `f-${jurisdiction}-${id}`;
      storage.seedFile({
        id: cloudFileId,
        parentId: folderOf[jurisdiction],
        name: 'casacion.docx',
        mimeType: DOCX_MIME_TYPE,
        content: Buffer.from('contenido original'),
        createdAt: BEFORE,
      });
      return { jurisdiction, cloudFileId, cloudFolderId: folderOf[jurisdiction] };
    });
    return templates.add({
      id,
      name: 'Recurso de casación',
      fileName: 'casacion.docx',
      jurisdictions,
      lastVersionAt: BEFORE,
      cloudFileId: placements[0].cloudFileId,
      cloudFolderId: placements[0].cloudFolderId,
      placements,
    });
  };
  /** Un modelo anterior a las subcarpetas: su único archivo está suelto en "Modelos formales" y no tiene filas por fuero. */
  const aLegacyTemplate = (jurisdictions: TemplateJurisdiction[] = ['CRIMINAL'], id = 7) => {
    storage.seedFile({
      id: `f-viejo-${id}`,
      parentId: templatesFolder.id,
      name: 'viejo.docx',
      mimeType: DOCX_MIME_TYPE,
      content: Buffer.from('contenido viejo'),
      createdAt: BEFORE,
    });
    return templates.add({
      id,
      name: 'Modelo viejo',
      fileName: 'viejo.docx',
      jurisdictions,
      lastVersionAt: BEFORE,
      cloudFileId: `f-viejo-${id}`,
      cloudFolderId: templatesFolder.id,
      placements: [],
    });
  };

  const papelera = () => storage.folders.find((folder) => folder.name === 'Papelera' && folder.parentId === main.id);
  const parentOf = (fileId: string) => storage.files.find((file) => file.id === fileId)?.parentId;
  const filesIn = (folderId: string) => storage.files.filter((file) => file.parentId === folderId);
  const run = (overrides: Partial<UpdateDocumentTemplateCommand> = {}) =>
    useCase.execute({ actor: actor(), templateId: 5, ...overrides });

  return { templates, storage, folderOf, useCase, aModernTemplate, aLegacyTemplate, papelera, parentOf, filesIn, run };
}

describe('UpdateDocumentTemplate', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('solo datos, sin tocar la nube', () => {
    // CA-36.1
    it('cambia el nombre y "copiar en las causas nuevas": devuelve el modelo, sin tocar Drive ni la última versión', async () => {
      const { run, aModernTemplate, templates, storage } = await aStudio();
      aModernTemplate();
      storage.fileCalls.length = 0;

      const view = await run({ name: 'Casación 2026', copyToNewCases: false });

      expect(view).toMatchObject({
        id: 5,
        name: 'Casación 2026',
        copyToNewCases: false,
        jurisdictions: ['CRIMINAL', 'AMPARO'],
        fileName: 'casacion.docx',
        lastVersionAt: BEFORE,
        lastVersionBy: expect.objectContaining({ id: 6 }),
        active: true,
      });
      expect(templates.updates).toHaveLength(1);
      expect(templates.updates[0].placements).toBeNull();
      expect(templates.updates[0].trash).toEqual([]);
      expect(storage.fileCalls).toEqual([]);
      expect(templates.pendingTrash.size).toBe(0);
    });

    // CA-36.2
    it('enviar los mismos fueros en otro orden no toca la nube', async () => {
      const { run, aModernTemplate, storage } = await aStudio();
      aModernTemplate();
      storage.fileCalls.length = 0;

      await run({ jurisdictions: ['AMPARO', 'CRIMINAL'] });

      expect(storage.fileCalls).toEqual([]);
    });

    it('un modelo anterior a las subcarpetas, si solo se cambia el nombre, no se migra', async () => {
      const { run, aLegacyTemplate, storage, templates } = await aStudio();
      aLegacyTemplate();
      storage.fileCalls.length = 0;

      await run({ templateId: 7, name: 'Nombre nuevo' });

      expect(storage.fileCalls).toEqual([]);
      expect(templates.updates[0].placements).toBeNull();
    });
  });

  describe('archivo nuevo (CA-36.4)', () => {
    it('queda en la subcarpeta de cada fuero, con el nombre del archivo y la fecha y el usuario del reemplazo; los anteriores van a la Papelera', async () => {
      const { run, aModernTemplate, storage, papelera, parentOf, folderOf, filesIn, templates } = await aStudio();
      aModernTemplate();

      const view = await run({ actor: actor(['LAWYER'], 9), file: newFile('casacion-2026.docx') });

      expect(view).toMatchObject({ fileName: 'casacion-2026.docx', lastVersionAt: NOW, lastVersionBy: expect.objectContaining({ id: 9 }) });
      expect(filesIn(folderOf.CRIMINAL).map((file) => file.name)).toEqual(['casacion-2026.docx']);
      expect(filesIn(folderOf.AMPARO).map((file) => file.name)).toEqual(['casacion-2026.docx']);
      expect(filesIn(folderOf.CRIMINAL)[0].content.toString()).toBe('contenido de casacion-2026.docx');
      // El principal es el del primer fuero, y es el archivo nuevo.
      expect(templates.rows[0].cloudFileId).toBe(filesIn(folderOf.CRIMINAL)[0].id);
      expect(parentOf('f-CRIMINAL-5')).toBe(papelera()!.id);
      expect(parentOf('f-AMPARO-5')).toBe(papelera()!.id);
      expect(storage.files).toHaveLength(4);
      // Mover salió bien: no queda nada pendiente.
      expect(templates.pendingTrash.size).toBe(0);
    });

    it('un modelo anterior a las subcarpetas: cada fuero recibe el archivo nuevo y el suelto va a la Papelera', async () => {
      const { run, aLegacyTemplate, parentOf, papelera, filesIn, folderOf } = await aStudio();
      aLegacyTemplate(['CRIMINAL', 'AMPARO']);

      await run({ templateId: 7, file: newFile() });

      expect(parentOf('f-viejo-7')).toBe(papelera()!.id);
      expect(filesIn(folderOf.CRIMINAL)).toHaveLength(1);
      expect(filesIn(folderOf.AMPARO)).toHaveLength(1);
    });
  });

  describe('cambio de fueros (CA-36.6)', () => {
    it('el fuero que se suma recibe una copia del archivo vigente; los demás no se tocan ni se mueven', async () => {
      const { run, aModernTemplate, storage, templates, papelera, filesIn, folderOf } = await aStudio();
      aModernTemplate();

      const view = await run({ jurisdictions: ['CRIMINAL', 'AMPARO', 'ADMINISTRATIVE'] });

      expect(view.jurisdictions).toEqual(['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO']);
      const [copy] = filesIn(folderOf.ADMINISTRATIVE);
      expect(copy).toMatchObject({ name: 'casacion.docx' });
      expect(copy.content.toString()).toBe('contenido original');
      expect(templates.updates[0].placements?.map((placement) => placement.jurisdiction)).toEqual([
        'CRIMINAL',
        'ADMINISTRATIVE',
        'AMPARO',
      ]);
      expect(templates.updates[0].placements?.[0].cloudFileId).toBe('f-CRIMINAL-5');
      expect(templates.updates[0].trash).toEqual([]);
      expect(papelera()).toBeUndefined();
      expect(storage.files).toHaveLength(3);
      // Sigue siendo un solo modelo (D-55).
      expect(templates.rows).toHaveLength(1);
    });

    it('la copia de un fuero que se quita va a la Papelera, y si era el primero el principal pasa al siguiente', async () => {
      const { run, aModernTemplate, templates, parentOf, papelera } = await aStudio();
      aModernTemplate();

      const view = await run({ jurisdictions: ['AMPARO'] });

      expect(view.jurisdictions).toEqual(['AMPARO']);
      expect(parentOf('f-CRIMINAL-5')).toBe(papelera()!.id);
      expect(parentOf('f-AMPARO-5')).not.toBe(papelera()!.id);
      expect(templates.rows[0]).toMatchObject({ cloudFileId: 'f-AMPARO-5', placements: [expect.objectContaining({ jurisdiction: 'AMPARO' })] });
    });

    it('un fuero que se suma antes del primero pasa a ser el principal', async () => {
      const { run, aModernTemplate, templates } = await aStudio();
      aModernTemplate(['AMPARO']);

      await run({ jurisdictions: ['CRIMINAL', 'AMPARO'] });

      expect(templates.rows[0].placements.map((placement) => placement.jurisdiction)).toEqual(['CRIMINAL', 'AMPARO']);
      expect(templates.rows[0].cloudFileId).toBe(templates.rows[0].placements[0].cloudFileId);
      expect(templates.rows[0].cloudFileId).not.toBe('f-AMPARO-5');
    });

    it('un modelo anterior a las subcarpetas se migra: cada fuero recibe su copia y el archivo suelto va a la Papelera', async () => {
      const { run, aLegacyTemplate, templates, parentOf, papelera, filesIn, folderOf } = await aStudio();
      aLegacyTemplate(['CRIMINAL']);

      await run({ templateId: 7, jurisdictions: ['CRIMINAL', 'AMPARO'] });

      expect(filesIn(folderOf.CRIMINAL).map((file) => file.content.toString())).toEqual(['contenido viejo']);
      expect(filesIn(folderOf.AMPARO).map((file) => file.content.toString())).toEqual(['contenido viejo']);
      expect(parentOf('f-viejo-7')).toBe(papelera()!.id);
      expect(templates.rows[0].cloudFileId).toBe(filesIn(folderOf.CRIMINAL)[0].id);
    });
  });

  describe('Drive no disponible (CA-36.8)', () => {
    it.each(['uploadFile', 'copyFile'] as const)(
      'si falla %s al guardar el archivo nuevo: 502, el modelo no cambia y no queda ningún archivo suelto',
      async (method) => {
        const { run, aModernTemplate, storage, templates, parentOf } = await aStudio();
        aModernTemplate();
        const filesBefore = storage.files.map((file) => file.id);
        storage.failNextCallTo(method, new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

        await expect(run({ name: 'Otro nombre', file: newFile() })).rejects.toBeInstanceOf(DocumentStorageUnavailableError);

        expect(storage.files.map((file) => file.id)).toEqual(filesBefore);
        expect(templates.rows[0]).toMatchObject({ name: 'Recurso de casación', fileName: 'casacion.docx', lastVersionAt: BEFORE });
        expect(templates.updates).toEqual([]);
        expect(templates.pendingTrash.size).toBe(0);
        expect(parentOf('f-CRIMINAL-5')).not.toBeUndefined();
      },
    );

    it('si falla la copia al fuero que se suma: 502 y el modelo conserva sus fueros', async () => {
      const { run, aModernTemplate, storage, templates } = await aStudio();
      aModernTemplate();
      storage.failNextCallTo('copyFile', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      await expect(run({ jurisdictions: ['CRIMINAL', 'AMPARO', 'ADMINISTRATIVE'] })).rejects.toBeInstanceOf(
        DocumentStorageUnavailableError,
      );

      expect(templates.rows[0].jurisdictions).toEqual(['CRIMINAL', 'AMPARO']);
      expect(storage.files).toHaveLength(2);
    });

    it('si falla guardar en la base, deshace los archivos que había subido', async () => {
      const { run, aModernTemplate, storage, templates } = await aStudio();
      aModernTemplate();
      templates.failOnUpdateWith = new Error('database down');

      await expect(run({ file: newFile() })).rejects.toThrow('database down');

      expect(storage.files.map((file) => file.id).sort()).toEqual(['f-AMPARO-5', 'f-CRIMINAL-5']);
    });

    it('si lo que falla es mover lo reemplazado a la Papelera, la modificación vale y los archivos quedan pendientes', async () => {
      const { run, aModernTemplate, storage, templates, parentOf, folderOf } = await aStudio();
      aModernTemplate();
      storage.failNextCallTo('moveFile', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      const view = await run({ file: newFile('casacion-2026.docx') });

      expect(view.fileName).toBe('casacion-2026.docx');
      expect(warn).toHaveBeenCalledTimes(1);
      // El pendiente se anotó junto con la modificación, y no se borra porque no se pudo mover.
      expect([...templates.pendingTrash].sort()).toEqual(['f-AMPARO-5', 'f-CRIMINAL-5']);
      expect(parentOf('f-CRIMINAL-5')).toBe(folderOf.CRIMINAL);
    });
  });

  describe('nombre único (CA-36.3, D-139)', () => {
    it('el nombre de otro modelo vigente, sin distinguir mayúsculas, es 409 y no sube ni escribe nada', async () => {
      const { run, aModernTemplate, templates, storage } = await aStudio();
      aModernTemplate();
      templates.add({ id: 6, name: 'Escrito de apelación' });
      storage.fileCalls.length = 0;

      await expect(run({ name: 'ESCRITO DE APELACIÓN', file: newFile() })).rejects.toBeInstanceOf(
        DocumentTemplateAlreadyExistsError,
      );

      expect(storage.fileCalls).toEqual([]);
      expect(templates.updates).toEqual([]);
    });

    it('conservar su propio nombre, aunque cambie solo las mayúsculas, no es un conflicto', async () => {
      const { run, aModernTemplate } = await aStudio();
      aModernTemplate();

      await expect(run({ name: 'Recurso de casación' })).resolves.toMatchObject({ name: 'Recurso de casación' });
      await expect(run({ name: 'RECURSO DE CASACIÓN' })).resolves.toMatchObject({ name: 'RECURSO DE CASACIÓN' });
    });

    it('el nombre de un modelo dado de baja se puede usar', async () => {
      const { run, aModernTemplate, templates } = await aStudio();
      aModernTemplate();
      templates.add({ id: 6, name: 'Escrito de apelación', active: false });

      await expect(run({ name: 'Escrito de apelación' })).resolves.toMatchObject({ name: 'Escrito de apelación' });
    });

    it('si otro lo tomó mientras tanto, el índice único lo detecta: 409 y se deshacen los archivos', async () => {
      const { run, aModernTemplate, templates, storage } = await aStudio();
      aModernTemplate();
      templates.failOnUpdateWith = new DocumentTemplateAlreadyExistsError();

      await expect(run({ name: 'Otro', file: newFile() })).rejects.toBeInstanceOf(DocumentTemplateAlreadyExistsError);

      expect(storage.files).toHaveLength(2);
    });
  });

  describe('rechazos: no escriben ni suben nada', () => {
    // CA-36.9: el 403 va antes que el 404 y no lee el modelo
    it('la secretaría recibe 403, exista o no el modelo, sin leerlo ni tocar la nube', async () => {
      const { run, aModernTemplate, templates, storage } = await aStudio();
      aModernTemplate();
      const find = jest.spyOn(templates, 'findForModification');
      storage.fileCalls.length = 0;

      for (const templateId of [5, 999]) {
        await expect(run({ actor: actor(['SECRETARY']), templateId, name: 'X' })).rejects.toBeInstanceOf(
          ForbiddenActionError,
        );
      }

      expect(find).not.toHaveBeenCalled();
      expect(storage.fileCalls).toEqual([]);
    });

    it.each([[['ADMINISTRATOR']], [['LAWYER']], [['SECRETARY', 'LAWYER']]])('un usuario con %j puede', async (roles) => {
      const { run, aModernTemplate } = await aStudio();
      aModernTemplate();

      await expect(run({ actor: actor(roles), name: 'Otro nombre' })).resolves.toBeDefined();
    });

    // CA-36.10
    it('un modelo inexistente o dado de baja es 404 y no toca la nube', async () => {
      const { run, aModernTemplate, templates, storage } = await aStudio();
      aModernTemplate();
      templates.add({ id: 6, name: 'De baja', active: false });
      storage.fileCalls.length = 0;

      for (const templateId of [999, 6]) {
        await expect(run({ templateId, name: 'X', file: newFile() })).rejects.toBeInstanceOf(DocumentTemplateNotFoundError);
      }

      expect(storage.fileCalls).toEqual([]);
    });

    // CA-36.10: baja (HU37) mientras se modifica
    it('si se dio de baja mientras tanto, el 404 deshace los archivos que se habían subido', async () => {
      const { run, aModernTemplate, templates, storage } = await aStudio();
      aModernTemplate();
      jest.spyOn(templates, 'update').mockResolvedValue(null);

      await expect(run({ file: newFile() })).rejects.toBeInstanceOf(DocumentTemplateNotFoundError);

      expect(storage.files.map((file) => file.id).sort()).toEqual(['f-AMPARO-5', 'f-CRIMINAL-5']);
    });

    // CA-36.1
    it('un pedido sin ningún campo es 400 VALIDATION_ERROR', async () => {
      const { run, aModernTemplate, templates } = await aStudio();
      aModernTemplate();

      await expect(run()).rejects.toBeInstanceOf(ValidationError);

      expect(templates.updates).toEqual([]);
    });

    // CA-36.2, CA-36.5: el archivo inválido no sube nada
    it('un archivo que no es .docx o un fuero inválido es 400 y no sube nada', async () => {
      const { run, aModernTemplate, storage, templates } = await aStudio();
      aModernTemplate();
      storage.fileCalls.length = 0;

      await expect(
        run({ file: { originalName: 'casacion.pdf', mimeType: 'application/pdf', content: Buffer.from('x') } }),
      ).rejects.toMatchObject({ details: { file: 'El archivo tiene que ser .docx.' } });
      await expect(run({ jurisdictions: [] })).rejects.toMatchObject({
        details: { jurisdictions: 'Elegí al menos un fuero.' },
      });

      expect(storage.fileCalls).toEqual([]);
      expect(templates.updates).toEqual([]);
    });
  });

  // Un lock por modelo: dos modificaciones a la vez no se pisan ni dejan archivos huérfanos.
  it('dos reemplazos a la vez se aplican uno detrás del otro: el segundo manda a la Papelera lo que dejó el primero', async () => {
    const { run, aModernTemplate, storage, papelera, filesIn, folderOf } = await aStudio();
    aModernTemplate(['CRIMINAL']);

    await Promise.all([run({ file: newFile('uno.docx') }), run({ file: newFile('dos.docx') })]);

    const outside = filesIn(folderOf.CRIMINAL);
    expect(outside).toHaveLength(1);
    expect(filesIn(papelera()!.id)).toHaveLength(2);
    expect(storage.files).toHaveLength(3);
  });
});
