import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ForbiddenActionError } from '@shared/domain/domain-error';
import { DOCX_MIME_TYPE } from '../../domain/entities/document-template.entity';
import {
  DocumentStorageUnavailableError,
  DocumentTemplateNotFoundError,
  InvalidTemplateJurisdictionFilterError,
} from '../../domain/errors/documents.errors';
import { FakeDocumentTemplateRepository } from '../../test-support/fake-document-template.repository';
import { InMemoryDocumentStorage } from '../../../infrastructure/storage/in-memory/in-memory-document-storage';
import { DownloadDocumentTemplate } from './download-document-template.use-case';
import { GetDocumentTemplate } from './get-document-template.use-case';
import { ListDocumentTemplates } from './list-document-templates.use-case';

/* HU35 · Consultar modelos formales: listado, detalle y descarga. */

const actor = (roleNames: string[] = ['LAWYER']): AuthenticatedUser => ({
  userId: 6,
  roleNames,
  lawyerId: roleNames.includes('LAWYER') ? 3 : null,
  permissions: [],
});
const SECRETARY = actor(['SECRETARY']);
const page = { page: 1, limit: 20 };

describe('ListDocumentTemplates', () => {
  let templates: FakeDocumentTemplateRepository;
  let useCase: ListDocumentTemplates;

  beforeEach(() => {
    templates = new FakeDocumentTemplateRepository();
    useCase = new ListDocumentTemplates(templates);
  });

  it('pasa los filtros y la página al repositorio', async () => {
    await useCase.execute({ actor: actor(), jurisdiction: 'AMPARO', copyToNewCases: true, ...page });

    expect(templates.searches).toEqual([{ jurisdiction: 'AMPARO', copyToNewCases: true, ...page }]);
  });

  // CA-35.2, CA-35.4, CA-35.5
  it('un modelo de varios fueros cuenta en cada uno; un fuero sin modelos devuelve lista vacía', async () => {
    templates.add({ name: 'Común', jurisdictions: ['CRIMINAL', 'AMPARO'] });
    templates.add({ name: 'Solo penal', jurisdictions: ['CRIMINAL'] });

    const criminal = await useCase.execute({ actor: actor(), jurisdiction: 'CRIMINAL', ...page });
    const amparo = await useCase.execute({ actor: actor(), jurisdiction: 'AMPARO', ...page });
    const administrative = await useCase.execute({ actor: actor(), jurisdiction: 'ADMINISTRATIVE', ...page });

    expect(criminal.totalItems).toBe(2);
    expect(amparo.items.map((t) => t.name)).toEqual(['Común']);
    expect(administrative).toEqual({ items: [], totalItems: 0 });
  });

  it('un fuero que no existe es INVALID_REQUEST, no una lista vacía', async () => {
    await expect(useCase.execute({ actor: actor(), jurisdiction: 'PENAL', ...page })).rejects.toBeInstanceOf(
      InvalidTemplateJurisdictionFilterError,
    );
  });

  // CA-35.7
  it('la secretaría recibe 403 sin consultar nada', async () => {
    await expect(useCase.execute({ actor: SECRETARY, ...page })).rejects.toBeInstanceOf(ForbiddenActionError);
    expect(templates.searches).toEqual([]);
  });

  it.each([[['ADMINISTRATOR']], [['LAWYER']], [['SECRETARY', 'LAWYER']]])('un usuario con %j puede', async (roles) => {
    await expect(useCase.execute({ actor: actor(roles), ...page })).resolves.toBeDefined();
  });
});

describe('GetDocumentTemplate', () => {
  let templates: FakeDocumentTemplateRepository;
  let useCase: GetDocumentTemplate;

  beforeEach(() => {
    templates = new FakeDocumentTemplateRepository();
    useCase = new GetDocumentTemplate(templates);
  });

  it('devuelve el modelo', async () => {
    const { id } = templates.add({ name: 'Recurso de casación' });

    expect(await useCase.execute({ actor: actor(), templateId: id })).toMatchObject({ id, name: 'Recurso de casación' });
  });

  it('uno inexistente o dado de baja es 404', async () => {
    const { id } = templates.add({ active: false });

    await expect(useCase.execute({ actor: actor(), templateId: id })).rejects.toBeInstanceOf(DocumentTemplateNotFoundError);
    await expect(useCase.execute({ actor: actor(), templateId: 999 })).rejects.toBeInstanceOf(DocumentTemplateNotFoundError);
  });

  it('la secretaría recibe 403, aunque el modelo exista (CA-35.7)', async () => {
    const { id } = templates.add();

    await expect(useCase.execute({ actor: SECRETARY, templateId: id })).rejects.toBeInstanceOf(ForbiddenActionError);
  });
});

describe('DownloadDocumentTemplate', () => {
  let templates: FakeDocumentTemplateRepository;
  let storage: InMemoryDocumentStorage;
  let useCase: DownloadDocumentTemplate;

  beforeEach(() => {
    templates = new FakeDocumentTemplateRepository();
    storage = new InMemoryDocumentStorage();
    useCase = new DownloadDocumentTemplate(templates, storage);
  });

  const aTemplateWithFile = async (content = Buffer.from('contenido del docx')) => {
    const stored = await storage.uploadFile({ parentId: 'templates', name: 'casacion.docx', mimeType: DOCX_MIME_TYPE, content });
    storage.fileCalls.length = 0;
    return templates.add({ fileName: 'casacion.docx', cloudFileId: stored.id });
  };

  // CA-35.6
  it('devuelve el archivo con su nombre y su tipo', async () => {
    const { id } = await aTemplateWithFile(Buffer.from('PK versión 1'));

    const downloaded = await useCase.execute({ actor: actor(), templateId: id });

    expect(downloaded.file.fileName).toBe('casacion.docx');
    expect(downloaded.file.mimeType).toBe(DOCX_MIME_TYPE);
    expect(downloaded.content).toEqual(Buffer.from('PK versión 1'));
  });

  it('si Drive no responde, el error es el 502 de "intentá de nuevo"', async () => {
    const { id } = await aTemplateWithFile();
    storage.failNextWith(new DocumentStorageUnavailableError());

    await expect(useCase.execute({ actor: actor(), templateId: id })).rejects.toBeInstanceOf(DocumentStorageUnavailableError);
  });

  it('de un modelo inexistente o dado de baja no pide nada a Drive', async () => {
    templates.add({ id: 7, active: false });

    await expect(useCase.execute({ actor: actor(), templateId: 7 })).rejects.toBeInstanceOf(DocumentTemplateNotFoundError);
    expect(storage.fileCalls).toEqual([]);
  });

  // CA-35.7
  it('la secretaría no puede descargar, y no se pide nada a Drive', async () => {
    const { id } = await aTemplateWithFile();

    await expect(useCase.execute({ actor: SECRETARY, templateId: id })).rejects.toBeInstanceOf(ForbiddenActionError);
    expect(storage.fileCalls).toEqual([]);
  });
});
