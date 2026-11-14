import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { MoveTemplateFilesToTrash } from '../../../src/subsystems/documents/core/application/use-cases/move-template-files-to-trash.use-case';
import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { DocumentStorageUnavailableError } from '../../../src/subsystems/documents/core/domain/errors/documents.errors';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import {
  clearCloudFolders,
  createTemplateJurisdictionFolders,
  TemplateJurisdictionFolders,
} from '../../shared/factories/cloud-structure.factory';
import { createJurisdiction } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

/*
 * Recurso modelos formales: HU34 (POST /document-templates), HU35 (GET
 * /document-templates, /{templateId} y /{templateId}/file), HU36 (PATCH /{templateId})
 * y HU37 (DELETE /{templateId}). Contrato: API_CONTRACT_V6.md §3.10.
 *
 * La base es real. El almacenamiento es el `InMemoryDocumentStorage`; la carpeta
 * "Modelos formales" se carga como la deja el script de puesta en marcha (ADR-003). Lo
 * que se prueba contra la pila de Google está en `google-stack.int.spec.ts`. El 401 sin
 * token está en `test/smoke/app.int.spec.ts`.
 */
type Body = Record<string, any>;
const URL = '/api/v1/document-templates';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const STORAGE_DOWN_MESSAGE = 'No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.';
const FORBIDDEN_MESSAGE = 'Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.';

/** supertest no junta los binarios por su cuenta: este parser arma el Buffer. */
function binary(res: any, done: (error: Error | null, body: Buffer) => void): void {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
}

let app: INestApplication;
let storage: InMemoryDocumentStorage;
let templatesFolderId: string;
/** Las subcarpetas `Modelos formales/{fuero}`, como las deja `SetupCloudStorage`. */
let jurisdictionFolders: TemplateJurisdictionFolders;
let lawyer: { id: number; lastName: string; firstName: string };
let asLawyer: { Authorization: string };

const server = () => request(app.getHttpServer());

/** Un alta por la API; cada test cambia lo que le importa. */
const register = (
  options: {
    actor?: { Authorization: string };
    name?: string | null;
    jurisdictions?: string[];
    copyToNewCases?: boolean;
    file?: { content: Buffer; fileName: string; contentType: string } | null;
  } = {},
) => {
  const req = server().post(URL).set(options.actor ?? asLawyer);
  const name = options.name === undefined ? 'Recurso de casación' : options.name;
  if (name !== null) req.field('name', name);
  for (const code of options.jurisdictions ?? ['CRIMINAL']) req.field('jurisdictions', code);
  if (options.copyToNewCases !== undefined) req.field('copyToNewCases', String(options.copyToNewCases));
  const file =
    options.file === undefined
      ? { content: Buffer.from(`PK ${name ?? ''}`), fileName: 'casacion.docx', contentType: DOCX }
      : options.file;
  if (file) req.attach('file', file.content, { filename: file.fileName, contentType: file.contentType });
  return req;
};

/** Registra un modelo y devuelve el recurso: así el archivo que se descarga es el que se subió. */
const registered = async (name: string, jurisdictions: string[] = ['CRIMINAL'], copyToNewCases?: boolean): Promise<Body> =>
  expectData<Body>(await register({ name, jurisdictions, copyToNewCases }), 201);

const templatesInDb = () =>
  getPrisma().documentTemplate.findMany({ include: { jurisdictions: { include: { jurisdiction: true } } } });

async function cleanUp(): Promise<void> {
  const prisma = getPrisma();
  await prisma.templateFilePendingTrash.deleteMany();
  await prisma.documentTemplateFile.deleteMany();
  await prisma.documentTemplateJurisdiction.deleteMany();
  await prisma.documentTemplate.deleteMany();
  // También ROOT_CASES: registrar un modelo sin estructura arma las tres carpetas base.
  await clearCloudFolders();
}

beforeAll(async () => {
  app = await startTestApp();
  storage = app.get(DOCUMENT_STORAGE);
});

afterAll(async () => {
  await cleanUp();
  await stopTestApp();
});

beforeEach(async () => {
  await cleanUp();
  storage.reset();
  for (const code of ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] as const) await createJurisdiction(code);

  const user = await createUser({ roles: ['LAWYER'], lastName: 'Ferreyra', firstName: 'Matías' });
  lawyer = { id: user.id, lastName: user.lastName, firstName: user.firstName };
  asLawyer = loginAs({ userId: user.id, roles: ['LAWYER'] });

  // La estructura del estudio, como la deja el script de puesta en marcha (ADR-003).
  const main = storage.seed('account-root', 'VZ Causas');
  const templatesFolder = storage.seed(main.id, 'Modelos formales');
  templatesFolderId = templatesFolder.id;
  await getPrisma().cloudFolder.create({
    data: { cloudFolderId: main.id, kind: 'MAIN', name: 'VZ Causas', url: main.url },
  });
  await getPrisma().cloudFolder.create({
    data: {
      cloudFolderId: templatesFolder.id,
      kind: 'TEMPLATES',
      name: 'Modelos formales',
      url: templatesFolder.url,
      parentCloudFolderId: main.id,
    },
  });
  jurisdictionFolders = await createTemplateJurisdictionFolders(storage, templatesFolder.id);
});

describe('POST /api/v1/document-templates', () => {
  // F1 — CA-34.1, CA-34.6: forma del contrato, el archivo en la subcarpeta de SU fuero (no suelto en
  // "Modelos formales") y el nombre del archivo con sus acentos.
  it.each([
    ['CRIMINAL', 'Penal'],
    ['ADMINISTRATIVE', 'Administrativo'],
    ['AMPARO', 'Amparo'],
  ] as const)('registra un modelo de %s, con su archivo en "Modelos formales/%s", en la forma del contrato', async (code, label) => {
    const file = { content: Buffer.from('PK contenido'), fileName: 'designación-defensor.docx', contentType: DOCX };

    const data = expectData<Body>(await register({ jurisdictions: [code], file }), 201);

    expect(data).toEqual({
      id: expect.any(Number),
      name: 'Recurso de casación',
      jurisdictions: [code],
      fileName: 'designación-defensor.docx',
      copyToNewCases: true,
      lastVersionAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/),
      lastVersionBy: lawyer,
      usageCount: 0,
      active: true,
    });
    const [row] = await templatesInDb();
    const folderId = jurisdictionFolders[code].id;
    expect(row).toMatchObject({ id: data.id, cloudFolderId: folderId, lastVersionByUserId: lawyer.id });
    expect(storage.files.find((f) => f.id === row.cloudFileId)).toMatchObject({
      parentId: folderId,
      name: 'designación-defensor.docx',
      mimeType: DOCX,
    });
    // Ni un archivo suelto en "Modelos formales" ni uno en otro fuero.
    expect(storage.files.map((f) => f.parentId)).toEqual([folderId]);
    expect((await getPrisma().cloudFolder.findUniqueOrThrow({ where: { cloudFolderId: folderId } })).name).toBe(label);
    const files = await getPrisma().documentTemplateFile.findMany({ include: { jurisdiction: true } });
    expect(files.map((f) => [f.templateId, f.jurisdiction.name, f.cloudFileId, f.cloudFolderId])).toEqual([
      [data.id, code, row.cloudFileId, folderId],
    ]);
  });

  // F2 — CA-34.2, CA-34.5, D-55, CA-35.6: un solo modelo, un archivo en la subcarpeta de cada fuero
  // (el mismo contenido) y la descarga entrega el principal.
  it('un modelo de varios fueros es uno solo, con un archivo idéntico en la subcarpeta de cada fuero, y se descarga', async () => {
    const content = Buffer.from('PK contenido de varios fueros');

    const data = expectData<Body>(
      await register({
        jurisdictions: ['AMPARO', 'CRIMINAL'],
        copyToNewCases: false,
        file: { content, fileName: 'casacion.docx', contentType: DOCX },
      }),
      201,
    );

    expect(data.jurisdictions).toEqual(['CRIMINAL', 'AMPARO']);
    expect(data.copyToNewCases).toBe(false);
    const rows = await templatesInDb();
    expect(rows).toHaveLength(1);
    expect(rows[0].jurisdictions).toHaveLength(2);
    // Un archivo en Penal y otro en Amparo, con los mismos bytes y nombres de archivo distintos en la nube.
    expect(storage.files.map((f) => f.parentId)).toEqual([jurisdictionFolders.CRIMINAL.id, jurisdictionFolders.AMPARO.id]);
    expect(storage.files.every((f) => Buffer.compare(Buffer.from(f.content), content) === 0)).toBe(true);
    const files = await getPrisma().documentTemplateFile.findMany({ include: { jurisdiction: true }, orderBy: { jurisdictionId: 'asc' } });
    expect(files.map((f) => [f.jurisdiction.name, f.cloudFolderId]).sort()).toEqual([
      ['AMPARO', jurisdictionFolders.AMPARO.id],
      ['CRIMINAL', jurisdictionFolders.CRIMINAL.id],
    ]);
    expect(new Set(files.map((f) => f.cloudFileId)).size).toBe(2);
    // El archivo principal del modelo es el del primer fuero del contrato: el de Penal.
    expect(rows[0]).toMatchObject({ cloudFolderId: jurisdictionFolders.CRIMINAL.id });
    expect(files.find((f) => f.cloudFolderId === jurisdictionFolders.CRIMINAL.id)!.cloudFileId).toBe(rows[0].cloudFileId);

    const downloaded = await server().get(`${URL}/${data.id}/file`).set(asLawyer).buffer().parse(binary);
    expect(downloaded.status).toBe(200);
    expect(Buffer.compare(downloaded.body as Buffer, content)).toBe(0);
  });

  it('para todos los fueros deja un archivo en cada una de las tres subcarpetas, y un solo modelo', async () => {
    const data = expectData<Body>(await register({ jurisdictions: ['AMPARO', 'CRIMINAL', 'ADMINISTRATIVE'] }), 201);

    expect(data.jurisdictions).toEqual(['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO']);
    expect(await templatesInDb()).toHaveLength(1);
    expect(storage.files.map((f) => f.parentId).sort()).toEqual(
      Object.values(jurisdictionFolders).map((folder) => folder.id).sort(),
    );
  });

  // CA-34.3 y CA-34.4
  it('responde 400 con los campos que faltan, o con un archivo que no es .docx, y no registra nada', async () => {
    const missing = await register({ name: null, jurisdictions: [], file: null });
    const notDocx = await register({ file: { content: Buffer.from('%PDF'), fileName: 'casacion.pdf', contentType: 'application/pdf' } });

    expectError(missing, 400, 'VALIDATION_ERROR', ['name', 'jurisdictions', 'file']);
    expect(missing.body.error.details).toEqual({
      name: 'El nombre del modelo es obligatorio.',
      jurisdictions: 'Elegí al menos un fuero.',
      file: 'El archivo del modelo es obligatorio.',
    });
    expectError(notDocx, 400, 'VALIDATION_ERROR', ['file']);
    expect(notDocx.body.error.details).toEqual({ file: 'El archivo tiene que ser .docx.' });
    expect(await templatesInDb()).toEqual([]);
  });

  // CA-34.9
  it('no admite dos modelos con el mismo nombre, aunque cambien las mayúsculas, y no sube el archivo', async () => {
    expectData(await register(), 201);
    const before = storage.files.length;

    const res = await register({ name: 'RECURSO DE CASACIÓN' });

    expectError(res, 409, 'DOCUMENT_TEMPLATE_ALREADY_EXISTS');
    expect(storage.files.length).toBe(before);
    expect(await templatesInDb()).toHaveLength(1);
  });

  // CA-34.10
  it('rechaza un archivo de más de 10 MB', async () => {
    const big = { content: Buffer.alloc(10 * 1024 * 1024 + 1), fileName: 'grande.docx', contentType: DOCX };

    const res = await register({ file: big });

    expectError(res, 413, 'FILE_TOO_LARGE');
    expect(res.body.error.message).toBe('El archivo supera el tamaño máximo de 10 MB.');
    expect(await templatesInDb()).toEqual([]);
  });

  // CA-34.7 y CA-34.11: con la carpeta registrada y sin ella.
  it('si Drive no responde, responde 502 con el aviso del contrato y no registra nada', async () => {
    storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));
    const withFolder = await register();
    await clearCloudFolders();
    storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));
    const withoutFolder = await register();

    for (const res of [withFolder, withoutFolder]) {
      expectError(res, 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
      expect(res.body.error.message).toBe(STORAGE_DOWN_MESSAGE);
    }
    expect(await templatesInDb()).toEqual([]);
  });

  // F4 — CA-34.7: si falla la copia a otro fuero no queda nada, ni en la base ni en las subcarpetas.
  it('si falla la copia al segundo fuero, responde 502 y no queda ningún archivo ni registro', async () => {
    const before = { files: storage.files.map((f) => f.id), rows: await templatesInDb() };
    storage.failNextCallTo('copyFile', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    const res = await register({ jurisdictions: ['CRIMINAL', 'AMPARO'] });

    expectError(res, 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
    expect(res.body.error.message).toBe(STORAGE_DOWN_MESSAGE);
    expect(res.body.error.details).toBeNull();
    expect(storage.files.map((f) => f.id)).toEqual(before.files);
    expect(await templatesInDb()).toEqual(before.rows);
    expect(await getPrisma().documentTemplateFile.count()).toBe(0);
    expect(await getPrisma().documentTemplateJurisdiction.count()).toBe(0);
  });

  // F3 — CA-34.11, con el cambio del 22/10/2026: la estructura faltante se arma sola, ahora con las
  // subcarpetas por fuero, y el archivo queda en la de su fuero.
  it('sin la estructura registrada, la arma con las subcarpetas, sube el modelo a la de su fuero y responde 201', async () => {
    await clearCloudFolders();

    expectData(await register({ jurisdictions: ['AMPARO'] }), 201);

    const folders = await getPrisma().cloudFolder.findMany({ orderBy: { createdAt: 'asc' } });
    expect(folders.map((f) => f.kind).sort()).toEqual(['JURISDICTION', 'JURISDICTION', 'JURISDICTION', 'MAIN', 'ROOT_CASES', 'TEMPLATES']);
    const templates = folders.find((f) => f.kind === 'TEMPLATES')!;
    const subfolders = folders.filter((f) => f.kind === 'JURISDICTION');
    expect(subfolders.map((f) => [f.name, f.parentCloudFolderId, f.lawyerId]).sort()).toEqual([
      ['Administrativo', templates.cloudFolderId, null],
      ['Amparo', templates.cloudFolderId, null],
      ['Penal', templates.cloudFolderId, null],
    ]);
    const amparo = subfolders.find((f) => f.name === 'Amparo')!;
    expect(storage.files.map((f) => f.parentId)).toEqual([amparo.cloudFolderId]);
    expect(await templatesInDb()).toHaveLength(1);
  });
});

describe('GET /api/v1/document-templates', () => {
  const list = (query = '') => server().get(`${URL}${query}`).set(asLawyer);

  // CA-35.1, CA-35.8
  it('lista los modelos vigentes en la forma del contrato, sin los dados de baja', async () => {
    const casacion = await registered('Recurso de casación');
    const old = await registered('Modelo viejo');
    await getPrisma().documentTemplate.update({ where: { id: old.id }, data: { active: false } });

    const data = expectPaginated<Body>(await list(), { totalItems: 1 });

    expect(data).toEqual([casacion]);
  });

  // CA-35.2, CA-35.4, CA-35.5: el fuero también en minúsculas.
  it('un modelo de varios fueros aparece en cada uno y una sola vez sin filtro; un fuero sin modelos da la lista vacía', async () => {
    const all = await registered('Poder general', ['CRIMINAL', 'AMPARO']);
    const criminal = await registered('Recurso de casación', ['CRIMINAL']);

    expect(expectPaginated<Body>(await list('?jurisdiction=criminal'), { totalItems: 2 }).map((t) => t.id)).toEqual([
      all.id,
      criminal.id,
    ]);
    expect(expectPaginated<Body>(await list('?jurisdiction=AMPARO')).map((t) => t.id)).toEqual([all.id]);
    expect(expectPaginated<Body>(await list(), { totalItems: 2 })).toHaveLength(2);
    expect(expectPaginated(await list('?jurisdiction=ADMINISTRATIVE'), { totalItems: 0 })).toEqual([]);
  });

  // CA-35.3: el orden lo resuelve la base, y la paginación va sobre ese orden.
  it('los ordena alfabéticamente sin importar el orden de carga ni los acentos, y pagina sobre ese orden', async () => {
    for (const name of ['Recurso de casación', 'Apelación', 'Ámbito del amparo', 'Desistimiento', 'beta']) {
      await registered(name);
    }

    const names = expectPaginated<Body>(await list()).map((t) => t.name);
    const second = expectPaginated<Body>(await list('?page=2&limit=2'), { page: 2, limit: 2, totalItems: 5, totalPages: 3 });

    expect(names).toEqual(['Ámbito del amparo', 'Apelación', 'beta', 'Desistimiento', 'Recurso de casación']);
    expect(second.map((t) => t.name)).toEqual(['beta', 'Desistimiento']);
  });

  it('filtra los que se copian a las causas nuevas', async () => {
    await registered('Se copia');
    await registered('No se copia', ['CRIMINAL'], false);

    const data = expectPaginated<Body>(await list('?jurisdiction=CRIMINAL&copyToNewCases=true'));

    expect(data.map((t) => t.name)).toEqual(['Se copia']);
  });

  it('un fuero que no existe es 400 INVALID_REQUEST; una paginación inválida, INVALID_PAGINATION', async () => {
    const wrongJurisdiction = await list('?jurisdiction=PENAL');

    expectError(wrongJurisdiction, 400, 'INVALID_REQUEST', ['jurisdiction']);
    expect(wrongJurisdiction.body.error.details).toEqual({ jurisdiction: 'No existe un fuero procesal con ese nombre.' });
    expectError(await list('?page=0'), 400, 'INVALID_PAGINATION', ['page', 'limit']);
  });
});

describe('GET /api/v1/document-templates/{templateId} y /file', () => {
  const download = (id: number | string) => server().get(`${URL}/${id}/file`).set(asLawyer).buffer(true).parse(binary);

  it('el detalle devuelve el mismo recurso que el alta', async () => {
    const created = await registered('Recurso de casación');

    expect(expectData(await server().get(`${URL}/${created.id}`).set(asLawyer), 200)).toEqual(created);
  });

  it('uno inexistente o dado de baja es 404, también al descargar y con el error en JSON; un id inválido, 400', async () => {
    const old = await registered('Modelo viejo');
    await getPrisma().documentTemplate.update({ where: { id: old.id }, data: { active: false } });

    // CA-23.3: también el archivo de uno dado de baja.
    for (const path of [`/${old.id}`, '/999999', '/999999/file', `/${old.id}/file`]) {
      const res = await server().get(`${URL}${path}`).set(asLawyer);
      expectError(res, 404, 'DOCUMENT_TEMPLATE_NOT_FOUND');
      expect(res.body.error.message).toBe('No se encontró el modelo formal solicitado.');
    }
    // CA-23.6: también al descargar.
    for (const path of ['/abc', '/abc/file']) {
      const res = await server().get(`${URL}${path}`).set(asLawyer);
      expectError(res, 400, 'INVALID_PATH_PARAMETER', ['templateId']);
      expect(res.body.error).toEqual({
        code: 'INVALID_PATH_PARAMETER',
        message: 'El identificador del modelo formal no es válido.',
        details: { templateId: 'Debe ser un número entero válido.' },
      });
    }
  });

  // CA-35.6
  it('la descarga entrega el mismo archivo que se subió, con su tipo y su nombre con acentos', async () => {
    const content = Buffer.from('PK contenido real del modelo');
    const created = expectData<Body>(
      await register({ name: 'Designación de defensor', file: { content, fileName: 'designación-defensor.docx', contentType: DOCX } }),
      201,
    );

    const res = await download(created.id);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe(DOCX);
    expect(res.headers['content-length']).toBe(String(content.length));
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="designacion-defensor.docx"; filename*=UTF-8''${encodeURIComponent('designación-defensor.docx')}`,
    );
    expect(Buffer.compare(res.body as Buffer, content)).toBe(0);
  });

  it('si Drive no responde, la descarga es 502 con el aviso de intentar de nuevo', async () => {
    const created = await registered('Recurso de casación');
    storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    const res = await server().get(`${URL}/${created.id}/file`).set(asLawyer);

    expectError(res, 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
    expect(res.body.error.message).toBe(STORAGE_DOWN_MESSAGE);
  });
});

/** CA-34.8 y CA-35.7, con login real: lo que se verifica es el seed de cada perfil. */
describe('Permisos de /api/v1/document-templates', () => {
  const loginWith = async (roles: TestRole[]) => {
    const user = await createUser({ roles, passwordHash: await bcrypt.hash('password1', 4) });
    const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: 'password1' });
    return { Authorization: `Bearer ${login.body.data.accessToken}` };
  };

  it.each<[TestRole[]]>([[['ADMINISTRATOR']], [['LAWYER']]])('un usuario con %j registra, consulta y descarga', async (roles) => {
    const actor = await loginWith(roles);

    const created = expectData<Body>(await register({ actor, name: `Modelo de ${roles.join('-')}` }), 201);
    expectPaginated(await server().get(URL).set(actor));
    expectData(await server().get(`${URL}/${created.id}`).set(actor), 200);
    expect((await server().get(`${URL}/${created.id}/file`).set(actor)).status).toBe(200);
  });

  it('la secretaría no puede registrar, ver ni descargar modelos, y no se registra nada', async () => {
    const created = await registered('Recurso de casación');
    const secretary = await loginWith(['SECRETARY']);

    const responses = [
      await register({ actor: secretary, name: 'De la secretaría' }),
      ...(await Promise.all(['', `/${created.id}`, `/${created.id}/file`].map((path) => server().get(`${URL}${path}`).set(secretary)))),
    ];

    for (const res of responses) {
      expectError(res, 403, 'FORBIDDEN');
      expect(res.body.error.message).toBe(FORBIDDEN_MESSAGE);
    }
    expect(await templatesInDb()).toHaveLength(1);
  });
});

/** HU37 · baja de un modelo formal. Contrato V6 §3.10, `DELETE /document-templates/{templateId}`. */
describe('DELETE /api/v1/document-templates/{templateId}', () => {
  const NOT_FOUND = {
    code: 'DOCUMENT_TEMPLATE_NOT_FOUND',
    message: 'No se encontró el modelo formal solicitado.',
    details: null,
  };
  const remove = (id: number | string) => server().delete(`${URL}/${id}`).set(asLawyer);
  /** Dónde está hoy cada archivo del modelo (el principal y el de cada fuero), por su id en el almacenamiento. */
  const fileParents = async (templateId: number) => {
    const row = await getPrisma().documentTemplate.findUniqueOrThrow({
      where: { id: templateId },
      include: { files: true },
    });
    const ids = [...new Set([row.cloudFileId, ...row.files.map((file) => file.cloudFileId)])];
    return ids.map((id) => storage.files.find((file) => file.id === id)?.parentId);
  };
  const papelera = () => storage.folders.filter((folder) => folder.name === 'Papelera');

  // CA-37.1, CA-37.2, CA-37.4, CA-37.5
  it('204 sin cuerpo: la fila queda con active=false, el modelo deja de existir para el cliente, sus archivos van a la Papelera y su nombre queda libre', async () => {
    const doomed = await registered('Escrito de apelación', ['CRIMINAL', 'AMPARO']);
    const other = await registered('Otro escrito', ['CRIMINAL']);
    const otherFiles = await fileParents(other.id);

    const res = await remove(doomed.id);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    // CA-37.1: no se elimina físicamente.
    expect(await getPrisma().documentTemplate.findUnique({ where: { id: doomed.id } })).toMatchObject({
      active: false,
      trashPending: false,
    });
    // CA-37.1 y CA-37.2: no está en el listado con ningún filtro, ni marcado como "dado de baja".
    for (const query of ['', '?jurisdiction=CRIMINAL', '?jurisdiction=AMPARO', '?copyToNewCases=true']) {
      const names = expectPaginated<Body>(await server().get(`${URL}${query}`).set(asLawyer)).map((t) => t.name);
      expect(names).not.toContain('Escrito de apelación');
    }
    for (const path of [`/${doomed.id}`, `/${doomed.id}/file`]) {
      const missing = await server().get(`${URL}${path}`).set(asLawyer);
      expectError(missing, 404, 'DOCUMENT_TEMPLATE_NOT_FOUND');
      expect(missing.body.error).toEqual(NOT_FOUND);
    }
    // CA-37.4: uno por cada fuero de su lista, todos en la única Papelera, bajo la raíz del estudio.
    const [bin] = papelera();
    expect(papelera()).toHaveLength(1);
    expect(bin.parentId).toBe(storage.folders.find((folder) => folder.name === 'VZ Causas')!.id);
    expect(await fileParents(doomed.id)).toEqual([bin.id, bin.id]);
    expect(await fileParents(other.id)).toEqual(otherFiles);
    // CA-37.5: el nombre es único solo entre los vigentes.
    expectData(await register({ name: 'Escrito de apelación', jurisdictions: ['CRIMINAL'] }), 201);
  });

  // CA-37.4, D-131
  it('si Drive no responde la baja vale (204): queda marcado y los archivos siguen donde estaban hasta que se repite el movimiento', async () => {
    const doomed = await registered('Escrito de apelación', ['CRIMINAL', 'AMPARO']);
    const before = await fileParents(doomed.id);
    storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    const res = await remove(doomed.id);

    expect(res.status).toBe(204);
    expect(await getPrisma().documentTemplate.findUnique({ where: { id: doomed.id } })).toMatchObject({
      active: false,
      trashPending: true,
    });
    expect(await fileParents(doomed.id)).toEqual(before);
    expectError(await server().get(`${URL}/${doomed.id}`).set(asLawyer), 404, 'DOCUMENT_TEMPLATE_NOT_FOUND');

    // Lo que hará el proceso diario con lo que quedó pendiente.
    await app.get(MoveTemplateFilesToTrash).execute({ templateId: doomed.id });

    const [bin] = papelera();
    expect(await fileParents(doomed.id)).toEqual([bin.id, bin.id]);
    expect(await getPrisma().documentTemplate.findUnique({ where: { id: doomed.id } })).toMatchObject({
      trashPending: false,
    });
  });
});

describe('DELETE /api/v1/document-templates/{templateId}: errores', () => {
  const remove = (id: number | string, actor = asLawyer) => server().delete(`${URL}/${id}`).set(actor);

  // CA-37.6: 403 antes que 404 (el permiso no depende del modelo) y un pedido rechazado no escribe nada.
  it('la secretaría recibe 403 con el texto del contrato, exista o no el modelo, y no cambia nada', async () => {
    const created = await registered('Escrito de apelación');
    const secretary = await createUser({ roles: ['SECRETARY'] });
    const asSecretary = loginAs({ userId: secretary.id, roles: ['SECRETARY'] });
    const filesBefore = storage.files.map((file) => ({ id: file.id, parentId: file.parentId }));

    for (const id of [created.id, 999999]) {
      const res = await remove(id, asSecretary);
      expectError(res, 403, 'FORBIDDEN');
      expect(res.body.error.message).toBe(FORBIDDEN_MESSAGE);
    }

    expect(await getPrisma().documentTemplate.findUnique({ where: { id: created.id } })).toMatchObject({
      active: true,
      trashPending: false,
    });
    expect(storage.files.map((file) => ({ id: file.id, parentId: file.parentId }))).toEqual(filesBefore);
  });

  // CA-37.7
  it('un modelo inexistente o ya dado de baja es 404 y un id que no es entero, 400, con los textos del contrato', async () => {
    const created = await registered('Escrito de apelación');
    expect((await remove(created.id)).status).toBe(204);

    for (const id of [999999, created.id]) {
      const res = await remove(id);
      expectError(res, 404, 'DOCUMENT_TEMPLATE_NOT_FOUND');
      expect(res.body.error).toEqual({
        code: 'DOCUMENT_TEMPLATE_NOT_FOUND',
        message: 'No se encontró el modelo formal solicitado.',
        details: null,
      });
    }
    const invalid = await remove('abc');
    expectError(invalid, 400, 'INVALID_PATH_PARAMETER', ['templateId']);
    expect(invalid.body.error).toEqual({
      code: 'INVALID_PATH_PARAMETER',
      message: 'El identificador del modelo formal no es válido.',
      details: { templateId: 'Debe ser un número entero válido.' },
    });
  });
});

/** HU36 · modificación de un modelo formal. Contrato V6 §3.10, `PATCH /document-templates/{templateId}`. */
describe('PATCH /api/v1/document-templates/{templateId}', () => {
  const RESOURCE_KEYS = [
    'active',
    'copyToNewCases',
    'fileName',
    'id',
    'jurisdictions',
    'lastVersionAt',
    'lastVersionBy',
    'name',
    'usageCount',
  ];
  type DocxFile = { content: Buffer; fileName: string; contentType: string };
  const docx = (fileName: string, text = fileName): DocxFile => ({ content: Buffer.from(`PK ${text}`), fileName, contentType: DOCX });
  /** La modificación por la API; cada test envía solo lo que le importa. */
  const modify = (
    id: number | string,
    options: {
      actor?: { Authorization: string };
      name?: string;
      jurisdictions?: string[];
      copyToNewCases?: boolean;
      file?: DocxFile;
    } = {},
  ) => {
    const req = server().patch(`${URL}/${id}`).set(options.actor ?? asLawyer);
    if (options.name !== undefined) req.field('name', options.name);
    for (const code of options.jurisdictions ?? []) req.field('jurisdictions', code);
    if (options.copyToNewCases !== undefined) req.field('copyToNewCases', String(options.copyToNewCases));
    if (options.file) req.attach('file', options.file.content, { filename: options.file.fileName, contentType: options.file.contentType });
    return req;
  };
  const filesOf = (templateId: number) =>
    getPrisma().documentTemplateFile.findMany({ where: { templateId }, include: { jurisdiction: true } });
  const papelera = () => storage.folders.filter((folder) => folder.name === 'Papelera');
  const parentOf = (fileId: string) => storage.files.find((file) => file.id === fileId)?.parentId;
  const inFolder = (folderId: string) => storage.files.filter((file) => file.parentId === folderId);

  // CA-36.1, CA-36.7
  it('cambia el nombre y "copiar en las causas nuevas": 200 con el modelo completo, sin tocar Drive ni la última versión', async () => {
    const created = await registered('Recurso de casación', ['CRIMINAL', 'AMPARO']);
    const filesBefore = storage.files.map((file) => ({ id: file.id, parentId: file.parentId }));

    const data = expectData<Body>(await modify(created.id, { name: 'Casación 2026', copyToNewCases: false }), 200);

    expect(Object.keys(data).sort()).toEqual(RESOURCE_KEYS);
    expect(data).toEqual({ ...created, name: 'Casación 2026', copyToNewCases: false });
    expect(expectData(await server().get(`${URL}/${created.id}`).set(asLawyer), 200)).toEqual(data);
    expect(storage.files.map((file) => ({ id: file.id, parentId: file.parentId }))).toEqual(filesBefore);
    expect(papelera()).toHaveLength(0);
  });

  // CA-36.4, CA-36.7
  it('un archivo nuevo queda en la subcarpeta de cada fuero, con la fecha y el usuario del reemplazo; el anterior y sus copias van a la Papelera', async () => {
    const admin = await createUser({ roles: ['ADMINISTRATOR'], lastName: 'Ríos', firstName: 'Malena' });
    const asAdmin = loginAs({ userId: admin.id, roles: ['ADMINISTRATOR'] });
    const created = await registered('Recurso de casación', ['CRIMINAL', 'AMPARO']);
    const oldIds = (await filesOf(created.id)).map((file) => file.cloudFileId);
    const before = (await getPrisma().documentTemplate.findUniqueOrThrow({ where: { id: created.id } })).lastVersionAt;
    const file = docx('casación-2026.docx', 'contenido de casación 2026');

    const data = expectData<Body>(await modify(created.id, { actor: asAdmin, file }), 200);

    expect(data).toEqual({
      ...created,
      fileName: 'casación-2026.docx',
      lastVersionAt: expect.any(String),
      lastVersionBy: { id: admin.id, lastName: 'Ríos', firstName: 'Malena' },
    });
    const after = (await getPrisma().documentTemplate.findUniqueOrThrow({ where: { id: created.id } })).lastVersionAt;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
    for (const code of ['CRIMINAL', 'AMPARO'] as const) {
      const placed = inFolder(jurisdictionFolders[code].id);
      expect(placed.map((f) => f.name)).toEqual(['casación-2026.docx']);
      expect(Buffer.compare(placed[0].content, file.content)).toBe(0);
    }
    const download = await server().get(`${URL}/${created.id}/file`).set(asLawyer).buffer(true).parse(binary);
    expect(Buffer.compare(download.body as Buffer, file.content)).toBe(0);
    // CA-36.4: el anterior, con todas sus copias, a la única Papelera; nada pendiente porque salió bien.
    const [bin] = papelera();
    expect(papelera()).toHaveLength(1);
    expect(oldIds.map(parentOf)).toEqual([bin.id, bin.id]);
    expect(await getPrisma().templateFilePendingTrash.count()).toBe(0);
  });

  // CA-36.2, CA-36.6
  it('los fueros son una lista que reemplaza a la anterior: el que se suma recibe una copia, el que se quita va a la Papelera, y sigue siendo un modelo', async () => {
    const created = await registered('Recurso de casación', ['CRIMINAL', 'AMPARO']);
    const before = await filesOf(created.id);
    const penal = before.find((file) => file.jurisdiction.name === 'CRIMINAL')!.cloudFileId;
    const amparo = before.find((file) => file.jurisdiction.name === 'AMPARO')!.cloudFileId;

    const data = expectData<Body>(await modify(created.id, { jurisdictions: ['AMPARO', 'ADMINISTRATIVE'] }), 200);

    expect(data.jurisdictions).toEqual(['ADMINISTRATIVE', 'AMPARO']);
    const added = inFolder(jurisdictionFolders.ADMINISTRATIVE.id);
    expect(added.map((file) => file.name)).toEqual(['casacion.docx']);
    expect(added[0].content.toString()).toBe(storage.files.find((file) => file.id === amparo)!.content.toString());
    expect(parentOf(penal)).toBe(papelera()[0].id);
    expect(parentOf(amparo)).toBe(jurisdictionFolders.AMPARO.id);
    // Un solo modelo, con una fila por fuero y el principal en el primero.
    expect(await templatesInDb()).toHaveLength(1);
    const rows = await filesOf(created.id);
    expect(rows.map((row) => row.jurisdiction.name).sort()).toEqual(['ADMINISTRATIVE', 'AMPARO']);
    const row = await getPrisma().documentTemplate.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.cloudFileId).toBe(rows.find((r) => r.jurisdiction.name === 'ADMINISTRATIVE')!.cloudFileId);
  });
});

describe('PATCH /api/v1/document-templates/{templateId}: errores', () => {
  const modify = (
    id: number | string,
    fields: Record<string, string> = {},
    file?: { content: Buffer; fileName: string; contentType: string },
    actor = asLawyer,
  ) => {
    const req = server().patch(`${URL}/${id}`).set(actor);
    for (const [name, value] of Object.entries(fields)) req.field(name, value);
    if (file) req.attach('file', file.content, { filename: file.fileName, contentType: file.contentType });
    return req;
  };
  const row = (id: number) => getPrisma().documentTemplate.findUniqueOrThrow({ where: { id } });
  const snapshotFiles = () => storage.files.map((file) => ({ id: file.id, parentId: file.parentId }));
  const aDocx = { content: Buffer.from('PK nuevo'), fileName: 'nuevo.docx', contentType: DOCX };

  // CA-36.1, CA-36.2, CA-36.3, CA-36.5, CA-36.10
  it('un pedido inválido es 400 con los textos del contrato, un archivo de más de 10 MB es 413, y no se escribe ni se sube nada', async () => {
    const created = await registered('Recurso de casación');
    const before = await row(created.id);
    const filesBefore = snapshotFiles();
    const validation = (details: Record<string, string>) => ({
      code: 'VALIDATION_ERROR',
      message: 'Los datos enviados no son válidos.',
      details,
    });

    // CA-36.1: sin ningún campo.
    const empty = await server().patch(`${URL}/${created.id}`).set(asLawyer);
    expectError(empty, 400, 'VALIDATION_ERROR', ['body']);
    expect(empty.body.error).toEqual(validation({ body: 'Debe enviarse al menos un campo para modificar.' }));
    // CA-36.2, CA-36.3, CA-36.5: cada campo con su texto, todos juntos.
    const all = await modify(
      created.id,
      { name: '   ', jurisdictions: 'LABORAL' },
      { content: Buffer.from('%PDF'), fileName: 'casacion.pdf', contentType: 'application/pdf' },
    );
    expect(all.body.error).toEqual(
      validation({
        name: 'El nombre del modelo es obligatorio.',
        jurisdictions: 'Los fueros válidos son CRIMINAL, ADMINISTRATIVE y AMPARO.',
        file: 'El archivo tiene que ser .docx.',
      }),
    );
    expect((await modify(created.id, { name: 'x'.repeat(151) })).body.error).toEqual(
      validation({ name: 'Debe tener hasta 150 caracteres.' }),
    );
    // CA-36.2: sin repetir.
    const repeated = await server()
      .patch(`${URL}/${created.id}`)
      .set(asLawyer)
      .field('jurisdictions', 'CRIMINAL')
      .field('jurisdictions', 'CRIMINAL');
    expect(repeated.body.error).toEqual(validation({ jurisdictions: 'Cada fuero se elige una sola vez.' }));
    // CA-36.10: un id que no es entero.
    const invalidId = await modify('abc', { name: 'X' });
    expectError(invalidId, 400, 'INVALID_PATH_PARAMETER', ['templateId']);
    expect(invalidId.body.error).toEqual({
      code: 'INVALID_PATH_PARAMETER',
      message: 'El identificador del modelo formal no es válido.',
      details: { templateId: 'Debe ser un número entero válido.' },
    });
    // CA-36.5: más de 10 MB.
    const big = await modify(created.id, {}, { content: Buffer.alloc(10 * 1024 * 1024 + 1), fileName: 'grande.docx', contentType: DOCX });
    expectError(big, 413, 'FILE_TOO_LARGE');
    expect(big.body.error.message).toBe('El archivo supera el tamaño máximo de 10 MB.');

    expect(await row(created.id)).toEqual(before);
    expect(snapshotFiles()).toEqual(filesBefore);
  });

  // CA-36.3, D-139
  it('el nombre de otro modelo vigente es 409 sin mayúsculas y sin subir nada; el propio y el de uno dado de baja se aceptan', async () => {
    const mine = await registered('Recurso de casación');
    await registered('Escrito de apelación');
    const old = await registered('Modelo viejo');
    await getPrisma().documentTemplate.update({ where: { id: old.id }, data: { active: false } });
    const filesBefore = snapshotFiles();

    const taken = await modify(mine.id, { name: 'ESCRITO DE APELACIÓN' }, aDocx);

    expectError(taken, 409, 'DOCUMENT_TEMPLATE_ALREADY_EXISTS');
    expect(taken.body.error.message).toBe('Ya existe un modelo formal con ese nombre.');
    expect(snapshotFiles()).toEqual(filesBefore);
    expect((await row(mine.id)).name).toBe('Recurso de casación');
    expectData(await modify(mine.id, { name: 'RECURSO DE CASACIÓN' }), 200);
    expectData(await modify(mine.id, { name: 'Modelo viejo' }), 200);
  });

  // CA-36.9, CA-36.10
  it('la secretaría recibe 403 exista o no el modelo; uno inexistente o dado de baja es 404; nada se escribe ni se sube', async () => {
    const created = await registered('Recurso de casación');
    const old = await registered('Modelo viejo');
    await getPrisma().documentTemplate.update({ where: { id: old.id }, data: { active: false } });
    const secretary = await createUser({ roles: ['SECRETARY'] });
    const asSecretary = loginAs({ userId: secretary.id, roles: ['SECRETARY'] });
    const before = await row(created.id);
    const filesBefore = snapshotFiles();

    for (const id of [created.id, 999999]) {
      const forbidden = await modify(id, { name: 'X' }, aDocx, asSecretary);
      expectError(forbidden, 403, 'FORBIDDEN');
      expect(forbidden.body.error.message).toBe(FORBIDDEN_MESSAGE);
    }
    for (const id of [999999, old.id]) {
      const missing = await modify(id, { name: 'X' }, aDocx);
      expectError(missing, 404, 'DOCUMENT_TEMPLATE_NOT_FOUND');
      expect(missing.body.error).toEqual({
        code: 'DOCUMENT_TEMPLATE_NOT_FOUND',
        message: 'No se encontró el modelo formal solicitado.',
        details: null,
      });
    }

    expect(await row(created.id)).toEqual(before);
    expect(snapshotFiles()).toEqual(filesBefore);
  });
});

describe('PATCH /api/v1/document-templates/{templateId}: Drive', () => {
  const modifyFile = (id: number, name?: string) => {
    const req = server().patch(`${URL}/${id}`).set(asLawyer);
    if (name) req.field('name', name);
    return req.attach('file', Buffer.from('PK contenido nuevo'), { filename: 'nuevo.docx', contentType: DOCX });
  };

  // CA-36.8: guardar el archivo nuevo es parte de la operación
  it('si Drive no responde al guardar el archivo nuevo o la copia de un fuero: 502, el modelo no cambia y no queda ningún archivo suelto', async () => {
    const created = await registered('Recurso de casación', ['CRIMINAL', 'AMPARO']);
    const before = await getPrisma().documentTemplate.findUniqueOrThrow({ where: { id: created.id } });
    const filesBefore = storage.files.map((file) => file.id);
    // El archivo se sube a Penal y la copia a Amparo falla: lo ya subido se borra.
    storage.failNextCallTo('copyFile', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    const res = await modifyFile(created.id, 'Otro nombre');

    expectError(res, 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
    expect(res.body.error.message).toBe(STORAGE_DOWN_MESSAGE);
    expect(await getPrisma().documentTemplate.findUniqueOrThrow({ where: { id: created.id } })).toEqual(before);
    expect(storage.files.map((file) => file.id)).toEqual(filesBefore);
    expect(await getPrisma().templateFilePendingTrash.count()).toBe(0);
  });

  // CA-36.8: mover lo reemplazado a la Papelera no lo es
  it('si lo que falla es mover lo reemplazado a la Papelera, la modificación vale (200) y los archivos quedan pendientes para el proceso diario', async () => {
    const created = await registered('Recurso de casación', ['CRIMINAL', 'AMPARO']);
    const oldIds = (await getPrisma().documentTemplateFile.findMany({ where: { templateId: created.id } })).map(
      (file) => file.cloudFileId,
    );
    storage.failNextCallTo('moveFile', new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    const data = expectData<Body>(await modifyFile(created.id), 200);

    expect(data.fileName).toBe('nuevo.docx');
    expect(
      (await getPrisma().templateFilePendingTrash.findMany())
        .map((pending) => [pending.cloudFileId, pending.templateId])
        .sort(),
    ).toEqual(oldIds.map((id) => [id, created.id]).sort());
    // El archivo nuevo ya está en las subcarpetas aunque lo viejo no se haya movido.
    expect(storage.files.filter((file) => file.name === 'nuevo.docx')).toHaveLength(2);
  });
});
