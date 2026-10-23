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

  beforeEach(async () => {
    templates = new FakeDocumentTemplateRepository();
    folders = new InMemoryCloudFolderRepository();
    storage = new InMemoryDocumentStorage();
    useCase = new RegisterDocumentTemplate(
      templates,
      folders,
      storage,
      new FakeClock(),
      new SetupCloudStorage(folders, storage, new FakeClock()),
    );

    // "Modelos formales", armada por el script de puesta en marcha (ADR-003).
    const main = storage.seed('account-root', 'VZ Causas');
    const templatesFolder = storage.seed(main.id, 'Modelos formales');
    templatesFolderId = templatesFolder.id;
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

  it('sube el archivo a "Modelos formales" y registra el modelo (CA-34.1, CA-34.11)', async () => {
    const view = await useCase.execute(command());

    expect(storage.files).toEqual([
      expect.objectContaining({ parentId: templatesFolderId, name: 'casacion.docx', mimeType: DOCX_MIME_TYPE }),
    ]);
    expect(templates.saved).toHaveLength(1);
    expect(templates.saved[0].file).toEqual({ cloudFileId: storage.files[0].id, cloudFolderId: templatesFolderId });
    expect(view).toMatchObject({ name: 'Recurso de casación', lastVersionAt: NOW, lastVersionBy: { id: 6 } });
  });

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
        bareFolders,
        bareStorage,
        new FakeClock(),
        new SetupCloudStorage(bareFolders, bareStorage, new FakeClock()),
      );
    });

    afterEach(() => jest.restoreAllMocks());

    it('la crea y sube el modelo en la carpeta nueva', async () => {
      await useCase.execute(command());

      const created = bareStorage.folders.find((f) => f.name === 'Modelos formales')!;
      expect(bareStorage.files).toEqual([expect.objectContaining({ parentId: created.id, name: 'casacion.docx' })]);
      expect(templates.saved[0].file.cloudFolderId).toBe(created.id);
    });

    it('si Drive falla al armarla, responde 502 y no sube ni registra nada', async () => {
      bareStorage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      await expect(useCase.execute(command())).rejects.toBeInstanceOf(DocumentStorageUnavailableError);
      expect(bareStorage.fileCalls).toEqual([]);
      expect(templates.saved).toEqual([]);
    });

    it('con la estructura completa no llama al setup', async () => {
      const execute = jest.fn();
      useCase = new RegisterDocumentTemplate(templates, folders, storage, new FakeClock(), {
        execute,
      } as unknown as SetupCloudStorage);

      await useCase.execute(command());

      expect(execute).not.toHaveBeenCalled();
      expect(templates.saved).toHaveLength(1);
    });
  });
});
