import { Logger } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ForbiddenActionError, ValidationError } from '@shared/domain/domain-error';
import { DOCX_MIME_TYPE } from '../../domain/entities/document-template.entity';
import {
  DocumentStorageUnavailableError,
  DocumentTemplateAlreadyExistsError,
} from '../../domain/errors/documents.errors';
import { CloudFolderFactory } from '../../domain/factories/cloud-folder.factory';
import { FakeClock, NOW } from '../../test-support/document-fixtures';
import { FakeDocumentTemplateRepository } from '../../test-support/fake-document-template.repository';
import { InMemoryCloudFolderRepository } from '../../../infrastructure/persistence/in-memory/in-memory-cloud-folder.repository';
import { InMemoryDocumentStorage } from '../../../infrastructure/storage/in-memory/in-memory-document-storage';
import { TemplateCloudFiles } from '../common/template-cloud-files';
import { RegisterDocumentTemplate, RegisterDocumentTemplateCommand } from './register-document-template.use-case';
import { SetupCloudStorage } from './setup-cloud-storage.use-case';

const actor = (roleNames: string[] = ['LAWYER']): AuthenticatedUser => ({
  userId: 6,
  roleNames,
  lawyerId: roleNames.includes('LAWYER') ? 3 : null,
  permissions: [],
});

const command = (overrides: Partial<RegisterDocumentTemplateCommand> = {}): RegisterDocumentTemplateCommand => ({
  actor: actor(),
  name: 'Recurso de casación',
  jurisdictions: ['CRIMINAL'],
  file: { originalName: 'casacion.docx', mimeType: DOCX_MIME_TYPE, content: Buffer.from('docx') },
  ...overrides,
});

describe('RegisterDocumentTemplate', () => {
  let templates: FakeDocumentTemplateRepository;
  let folders: InMemoryCloudFolderRepository;
  let storage: InMemoryDocumentStorage;
  let useCase: RegisterDocumentTemplate;
  let templatesFolderId: string;
  /** Id de la subcarpeta de cada fuero, por el id del fuero que da el fake. */
  const jurisdictionFolderIds: Record<number, string> = {};

  beforeEach(async () => {
    templates = new FakeDocumentTemplateRepository();
    folders = new InMemoryCloudFolderRepository();
    storage = new InMemoryDocumentStorage();
    useCase = new RegisterDocumentTemplate(
      templates,
      new FakeClock(),
      new TemplateCloudFiles(
        templates,
        folders,
        storage,
        new SetupCloudStorage(folders, storage, new FakeClock(), templates),
      ),
    );

    // "Modelos formales", armada por el script de puesta en marcha (ADR-003).
    const main = storage.seed('account-root', 'VZ Causas');
    const templatesFolder = storage.seed(main.id, 'Modelos formales');
    templatesFolderId = templatesFolder.id;
    // Una subcarpeta por fuero debajo de "Modelos formales", con los ids que da el fake (CRIMINAL 1, ADMINISTRATIVE 2, AMPARO 3).
    for (const [jurisdictionId, label] of [[1, 'Penal'], [2, 'Administrativo'], [3, 'Amparo']] as const) {
      const folder = storage.seed(templatesFolder.id, label);
      jurisdictionFolderIds[jurisdictionId] = folder.id;
      await folders.save(
        CloudFolderFactory.create({
          kind: 'JURISDICTION',
          cloudFolderId: folder.id,
          name: label,
          url: folder.url,
          parentCloudFolderId: templatesFolder.id,
          jurisdictionId,
          createdAt: NOW,
        }),
      );
    }
    await folders.save(
      CloudFolderFactory.create({
        kind: 'MAIN',
        cloudFolderId: main.id,
        name: 'VZ Causas',
        url: main.url,
        parentCloudFolderId: null,
        createdAt: NOW,
      }),
    );
    await folders.save(
      CloudFolderFactory.create({
        kind: 'TEMPLATES',
        cloudFolderId: templatesFolder.id,
        name: 'Modelos formales',
        url: templatesFolder.url,
        parentCloudFolderId: main.id,
        createdAt: NOW,
      }),
    );
  });

  // R1
  it('un fuero: sube el archivo a la subcarpeta del fuero, sin copias, y registra el modelo (CA-34.1)', async () => {
    const view = await useCase.execute(command());

    expect(storage.files).toEqual([
      expect.objectContaining({ parentId: jurisdictionFolderIds[1], name: 'casacion.docx', mimeType: DOCX_MIME_TYPE }),
    ]);
    expect(storage.fileCalls.map((call) => call.method)).toEqual(['uploadFile']);
    expect(templates.saved).toHaveLength(1);
    expect(templates.saved[0].placements).toEqual([
      { jurisdiction: 'CRIMINAL', cloudFileId: storage.files[0].id, cloudFolderId: jurisdictionFolderIds[1] },
    ]);
    expect(view).toMatchObject({ name: 'Recurso de casación', lastVersionAt: NOW, lastVersionBy: { id: 6 } });
  });

  // R2, R3 (CA-34.2, D-55)
  it.each([
    [['AMPARO', 'CRIMINAL'], ['CRIMINAL', 'AMPARO'], [1, 3]],
    [['AMPARO', 'ADMINISTRATIVE', 'CRIMINAL'], ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'], [1, 2, 3]],
  ])(
    'varios fueros (%j): sube a la subcarpeta del primero y copia dentro de la nube a las demás, un solo modelo',
    async (sent, inOrder, folderIds) => {
      await useCase.execute(command({ jurisdictions: sent }));

      expect(storage.fileCalls.map((call) => call.method)).toEqual(['uploadFile', ...inOrder.slice(1).map(() => 'copyFile')]);
      expect(storage.files.map((file) => file.parentId)).toEqual(folderIds.map((id) => jurisdictionFolderIds[id]));
      expect(storage.files.every((file) => file.name === 'casacion.docx')).toBe(true);
      expect(templates.saved).toHaveLength(1);
      expect(templates.saved[0].placements.map(({ jurisdiction }) => jurisdiction)).toEqual(inOrder);
      // La primera ubicación es el archivo principal: el que se subió.
      expect(templates.saved[0].placements[0].cloudFileId).toBe(storage.files[0].id);
      expect(templates.rows).toHaveLength(1);
    },
  );

  // CA-34.8
  it.each([[['ADMINISTRATOR']], [['LAWYER']], [['SECRETARY', 'LAWYER']]])(
    'lo puede registrar un usuario con %j',
    async (roles) => {
      await expect(useCase.execute(command({ actor: actor(roles) }))).resolves.toBeDefined();
    },
  );

  it('la secretaría no puede, y no se sube nada', async () => {
    const error = await useCase.execute(command({ actor: actor(['SECRETARY']) })).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenActionError);
    expect((error as Error).message).toBe('Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.');
    expect(storage.fileCalls).toEqual([]);
  });

  it('con datos inválidos no sube nada (CA-34.4)', async () => {
    await expect(useCase.execute(command({ name: '' }))).rejects.toBeInstanceOf(ValidationError);
    expect(storage.fileCalls).toEqual([]);
  });

  // CA-34.9
  it('un nombre repetido, aunque cambien las mayúsculas, da 409 antes de subir el archivo', async () => {
    templates.add({ name: 'RECURSO DE CASACIÓN' });

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(DocumentTemplateAlreadyExistsError);
    expect(storage.fileCalls).toEqual([]);
  });

  // CA-34.7
  it('si Drive falla, no registra el modelo', async () => {
    storage.failNextWith(new DocumentStorageUnavailableError());

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(DocumentStorageUnavailableError);
    expect(templates.saved).toEqual([]);
  });

  // R4, R5 (CA-34.7)
  it.each([
    ['segundo', 2, 1],
    ['tercero', 3, 2],
  ])('si falla la copia al %s fuero, borra los archivos ya creados y no registra nada', async (_, failingCall, created) => {
    const realCopy = storage.copyFile.bind(storage);
    let calls = 0;
    storage.copyFile = async (copy) => {
      calls += 1;
      if (calls === failingCall - 1) {
        throw new DocumentStorageUnavailableError('TRANSIENT', 'timeout');
      }
      return realCopy(copy);
    };

    await expect(
      useCase.execute(command({ jurisdictions: ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] })),
    ).rejects.toBeInstanceOf(DocumentStorageUnavailableError);

    expect(storage.fileCalls.filter((call) => call.method === 'deleteFile')).toHaveLength(created);
    expect(storage.files).toEqual([]);
    expect(templates.saved).toEqual([]);
  });

  // R6
  it('si el registro falla después de subir y copiar, borra todos los archivos', async () => {
    templates.failOnSaveWith = new DocumentTemplateAlreadyExistsError();

    await expect(
      useCase.execute(command({ jurisdictions: ['CRIMINAL', 'AMPARO'] })),
    ).rejects.toBeInstanceOf(DocumentTemplateAlreadyExistsError);

    expect(storage.files).toEqual([]);
  });

  it('si el registro falla después de subir, borra el archivo: nunca queda uno suelto', async () => {
    templates.failOnSaveWith = new DocumentTemplateAlreadyExistsError();

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(DocumentTemplateAlreadyExistsError);
    expect(storage.fileCalls.map((call) => call.method)).toEqual(['uploadFile', 'deleteFile']);
    expect(storage.files).toEqual([]);
  });

  it('si además el borrado falla, devuelve el error original', async () => {
    templates.failOnSaveWith = new DocumentTemplateAlreadyExistsError();
    const deleteFile = jest.spyOn(storage, 'deleteFile').mockRejectedValue(new DocumentStorageUnavailableError());

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(DocumentTemplateAlreadyExistsError);
    expect(deleteFile).toHaveBeenCalled();
  });

  // CA-34.11 (cambiado el 22/10/2026: la estructura faltante se arma sola)
  describe('sin la carpeta "Modelos formales" registrada', () => {
    let bareFolders: InMemoryCloudFolderRepository;
    let bareStorage: InMemoryDocumentStorage;

    beforeEach(() => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      jest.spyOn(Logger.prototype, 'log').mockImplementation();
      bareFolders = new InMemoryCloudFolderRepository();
      bareStorage = new InMemoryDocumentStorage();
      useCase = new RegisterDocumentTemplate(
        templates,
        new FakeClock(),
        new TemplateCloudFiles(
          templates,
          bareFolders,
          bareStorage,
          new SetupCloudStorage(bareFolders, bareStorage, new FakeClock(), templates),
        ),
      );
    });

    afterEach(() => jest.restoreAllMocks());

    // R7
    it('la arma con las subcarpetas de los fueros y sube el modelo en la del fuero', async () => {
      await useCase.execute(command());

      const templatesFolder = bareStorage.folders.find((f) => f.name === 'Modelos formales')!;
      const penal = bareStorage.folders.find((f) => f.name === 'Penal' && f.parentId === templatesFolder.id)!;
      expect(bareStorage.files).toEqual([expect.objectContaining({ parentId: penal.id, name: 'casacion.docx' })]);
      expect(templates.saved[0].placements[0].cloudFolderId).toBe(penal.id);
    });

    it('si solo falta una subcarpeta (estudio anterior a las subcarpetas), arma la estructura y sube', async () => {
      const execute = jest.spyOn(SetupCloudStorage.prototype, 'execute');
      await useCase.execute(command({ jurisdictions: ['AMPARO'] }));

      expect(execute).toHaveBeenCalledTimes(1);
      const amparo = bareStorage.folders.find((f) => f.name === 'Amparo')!;
      expect(bareStorage.files).toEqual([expect.objectContaining({ parentId: amparo.id })]);
    });

    it('si Drive falla al armarla, responde 502 y no sube ni registra nada', async () => {
      bareStorage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      await expect(useCase.execute(command())).rejects.toBeInstanceOf(DocumentStorageUnavailableError);
      expect(bareStorage.fileCalls).toEqual([]);
      expect(templates.saved).toEqual([]);
    });

    it('con la estructura completa no llama al setup', async () => {
      const execute = jest.fn();
      useCase = new RegisterDocumentTemplate(
        templates,
        new FakeClock(),
        new TemplateCloudFiles(templates, folders, storage, { execute } as unknown as SetupCloudStorage),
      );

      await useCase.execute(command());

      expect(execute).not.toHaveBeenCalled();
      expect(templates.saved).toHaveLength(1);
    });
  });
});
