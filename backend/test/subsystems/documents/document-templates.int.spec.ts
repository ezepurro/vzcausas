import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { DocumentStorageUnavailableError } from '../../../src/subsystems/documents/core/domain/errors/documents.errors';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { clearCloudFolders } from '../../shared/factories/cloud-structure.factory';
import { createJurisdiction } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

/*
 * Recurso modelos formales: HU34 (POST /document-templates) y HU35 (GET
 * /document-templates, /{templateId} y /{templateId}/file). Contrato: API_CONTRACT_V5.md
 * §3.10.
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
});

describe('POST /api/v1/document-templates', () => {
  // CA-34.1, CA-34.6, CA-34.11: forma del contrato, archivo en "Modelos formales" y el
  // nombre del archivo con sus acentos.
  it('registra el modelo, con su archivo en "Modelos formales", en la forma del contrato', async () => {
    const file = { content: Buffer.from('PK contenido'), fileName: 'designación-defensor.docx', contentType: DOCX };

    const data = expectData<Body>(await register({ file }), 201);

    expect(data).toEqual({
      id: expect.any(Number),
      name: 'Recurso de casación',
      jurisdictions: ['CRIMINAL'],
      fileName: 'designación-defensor.docx',
      copyToNewCases: true,
      lastVersionAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/),
      lastVersionBy: lawyer,
      usageCount: 0,
      active: true,
    });
    const [row] = await templatesInDb();
    expect(row).toMatchObject({ id: data.id, cloudFolderId: templatesFolderId, lastVersionByUserId: lawyer.id });
    expect(storage.files.find((f) => f.id === row.cloudFileId)).toMatchObject({
      parentId: templatesFolderId,
      name: 'designación-defensor.docx',
      mimeType: DOCX,
    });
  });

  // CA-34.2 y CA-34.5
  it('para todos los fueros es un solo modelo con un solo archivo, y "copiar en las causas nuevas" se puede desmarcar', async () => {
    const before = storage.files.length;

    const data = expectData<Body>(
      await register({ jurisdictions: ['AMPARO', 'CRIMINAL', 'ADMINISTRATIVE'], copyToNewCases: false }),
      201,
    );

    expect(data.jurisdictions).toEqual(['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO']);
    expect(data.copyToNewCases).toBe(false);
    const rows = await templatesInDb();
    expect(rows).toHaveLength(1);
    expect(rows[0].jurisdictions).toHaveLength(3);
    expect(storage.files.length - before).toBe(1);
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

  // CA-34.11, con el cambio del 22/10/2026: "Modelos formales" faltante se arma sola.
  it('sin la carpeta "Modelos formales" registrada, la arma, sube el modelo y responde 201', async () => {
    await clearCloudFolders();

    expectData(await register(), 201);

    const kinds = (await getPrisma().cloudFolder.findMany({ select: { kind: true } })).map((f) => f.kind).sort();
    expect(kinds).toEqual(['MAIN', 'ROOT_CASES', 'TEMPLATES']);
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

    for (const path of [`/${old.id}`, '/999999', '/999999/file']) {
      expectError(await server().get(`${URL}${path}`).set(asLawyer), 404, 'DOCUMENT_TEMPLATE_NOT_FOUND');
    }
    expectError(await server().get(`${URL}/abc`).set(asLawyer), 400, 'INVALID_PATH_PARAMETER', ['templateId']);
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
