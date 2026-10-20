import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { DocumentStorageUnavailableError } from '../../../src/subsystems/documents/core/domain/errors/documents.errors';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { createJurisdiction } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

/*
 * HU35 · Consultar modelos formales (contrato V4 §3.10):
 * GET /document-templates, /{templateId} y /{templateId}/file.
 *
 * Los modelos se cargan por el POST de HU34, así el archivo que se descarga es
 * el mismo que se subió. El almacenamiento es el `InMemoryDocumentStorage` con
 * el que viene `documents` mientras no exista el adaptador de Google Drive.
 */
type Body = Record<string, any>;
const URL = '/api/v1/document-templates';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** supertest no junta los binarios por su cuenta: este parser arma el Buffer. */
function binary(res: any, done: (error: Error | null, body: Buffer) => void): void {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
}

describe('GET /api/v1/document-templates', () => {
  let app: INestApplication;
  let storage: InMemoryDocumentStorage;
  let asLawyer: { Authorization: string };

  const server = () => request(app.getHttpServer());

  /** Registra un modelo por la API (HU34) y devuelve el recurso. */
  const registered = async (
    name: string,
    jurisdictions: string[] = ['CRIMINAL'],
    options: { copyToNewCases?: boolean; fileName?: string; content?: Buffer } = {},
  ): Promise<Body> => {
    const req = server().post(URL).set(asLawyer).field('name', name);
    for (const code of jurisdictions) req.field('jurisdictions', code);
    if (options.copyToNewCases !== undefined) req.field('copyToNewCases', String(options.copyToNewCases));
    req.attach('file', options.content ?? Buffer.from(`PK ${name}`), {
      filename: options.fileName ?? 'modelo.docx',
      contentType: DOCX,
    });
    return expectData<Body>(await req, 201);
  };

  const list = (query = '', actor = asLawyer) => server().get(`${URL}${query}`).set(actor);

  async function cleanUp(): Promise<void> {
    const prisma = getPrisma();
    await prisma.documentTemplateJurisdiction.deleteMany();
    await prisma.documentTemplate.deleteMany();
    for (const kind of ['TEMPLATES', 'MAIN'] as const) {
      await prisma.cloudFolder.deleteMany({ where: { kind } });
    }
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
    const user = await createUser({ roles: ['LAWYER'], lastName: 'Ríos', firstName: 'Malena' });
    asLawyer = loginAs({ userId: user.id, roles: ['LAWYER'] });

    const main = storage.seed('account-root', 'VZ Causas');
    const templatesFolder = storage.seed(main.id, 'Modelos formales');
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

  describe('listado', () => {
    // CA-35.1, CA-35.8
    it('lista los modelos vigentes en la forma del contrato, sin los dados de baja', async () => {
      const casacion = await registered('Recurso de casación');
      const old = await registered('Modelo viejo');
      await getPrisma().documentTemplate.update({ where: { id: old.id }, data: { active: false } });

      const data = expectPaginated<Body>(await list(), { totalItems: 1 });

      expect(data).toEqual([casacion]);
    });

    // CA-35.2
    it('un modelo de varios fueros aparece en cada uno, y una sola vez sin filtro', async () => {
      const all = await registered('Poder general', ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO']);

      for (const code of ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO']) {
        const data = expectPaginated<Body>(await list(`?jurisdiction=${code}`));
        expect(data.map((t) => t.id)).toEqual([all.id]);
      }
      expect(expectPaginated<Body>(await list()).map((t) => t.id)).toEqual([all.id]);
    });

    // CA-35.3
    it('los ordena alfabéticamente, sin importar el orden de carga ni los acentos', async () => {
      for (const name of ['Recurso de casación', 'Apelación', 'Ámbito del amparo', 'Desistimiento']) {
        await registered(name);
      }

      const names = expectPaginated<Body>(await list()).map((t) => t.name);

      expect(names).toEqual(['Ámbito del amparo', 'Apelación', 'Desistimiento', 'Recurso de casación']);
    });

    it('pagina sobre el orden alfabético', async () => {
      for (const name of ['Cuarto', 'beta', 'Alfa', 'Delta', 'Charlie']) await registered(name);

      const second = await list('?page=2&limit=2');

      expect(expectPaginated<Body>(second, { page: 2, limit: 2, totalItems: 5, totalPages: 3 }).map((t) => t.name)).toEqual([
        'Charlie',
        'Cuarto',
      ]);
    });

    // CA-35.4, CA-35.5
    it('cuenta los modelos de cada fuero; uno sin modelos devuelve la lista vacía, sin error', async () => {
      await registered('Uno', ['CRIMINAL']);
      await registered('Dos', ['CRIMINAL', 'AMPARO']);

      const criminal = await list('?jurisdiction=CRIMINAL');
      const administrative = await list('?jurisdiction=ADMINISTRATIVE');

      expect(criminal.body.pagination.totalItems).toBe(2);
      expect(expectPaginated(administrative, { totalItems: 0 })).toEqual([]);
    });

    it('filtra los que se copian a las causas nuevas', async () => {
      await registered('Se copia');
      await registered('No se copia', ['CRIMINAL'], { copyToNewCases: false });

      const data = expectPaginated<Body>(await list('?jurisdiction=CRIMINAL&copyToNewCases=true&limit=1'));

      expect(data.map((t) => t.name)).toEqual(['Se copia']);
    });

    it('acepta el fuero en minúsculas', async () => {
      await registered('Uno', ['AMPARO']);

      expect(expectPaginated(await list('?jurisdiction=amparo'))).toHaveLength(1);
    });

    it('un fuero que no existe es 400 INVALID_REQUEST; una paginación inválida, INVALID_PAGINATION', async () => {
      const wrongJurisdiction = await list('?jurisdiction=PENAL');
      expectError(wrongJurisdiction, 400, 'INVALID_REQUEST', ['jurisdiction']);
      expect(wrongJurisdiction.body.error.details.jurisdiction).toBe('No existe un fuero procesal con ese nombre.');

      expectError(await list('?page=0'), 400, 'INVALID_PAGINATION', ['page', 'limit']);
    });
  });

  describe('detalle', () => {
    it('devuelve el modelo', async () => {
      const created = await registered('Recurso de casación');

      expect(expectData(await server().get(`${URL}/${created.id}`).set(asLawyer), 200)).toEqual(created);
    });

    it('uno inexistente o dado de baja es 404; un id inválido, 400', async () => {
      const old = await registered('Modelo viejo');
      await getPrisma().documentTemplate.update({ where: { id: old.id }, data: { active: false } });

      expectError(await server().get(`${URL}/${old.id}`).set(asLawyer), 404, 'DOCUMENT_TEMPLATE_NOT_FOUND');
      expectError(await server().get(`${URL}/999999`).set(asLawyer), 404, 'DOCUMENT_TEMPLATE_NOT_FOUND');
      expectError(await server().get(`${URL}/abc`).set(asLawyer), 400, 'INVALID_PATH_PARAMETER', ['templateId']);
    });
  });

  describe('descarga (CA-35.6)', () => {
    const download = (id: number | string, actor = asLawyer) =>
      server().get(`${URL}/${id}/file`).set(actor).buffer(true).parse(binary);

    it('entrega el mismo archivo que se subió, con su tipo y su nombre con acentos', async () => {
      const content = Buffer.from('PK contenido real del modelo');
      const created = await registered('Designación de defensor', ['CRIMINAL'], {
        fileName: 'designación-defensor.docx',
        content,
      });

      const res = await download(created.id);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe(DOCX);
      expect(res.headers['content-length']).toBe(String(content.length));
      expect(res.headers['content-disposition']).toBe(
        `attachment; filename="designacion-defensor.docx"; filename*=UTF-8''${encodeURIComponent('designación-defensor.docx')}`,
      );
      expect(Buffer.compare(res.body as Buffer, content)).toBe(0);
    });

    it('si Drive no responde, 502 y el aviso de intentar de nuevo', async () => {
      const created = await registered('Recurso de casación');
      storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

      const res = await server().get(`${URL}/${created.id}/file`).set(asLawyer);

      expectError(res, 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
      expect(res.body.error.message).toBe('No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.');
    });

    it('de un modelo inexistente es 404, con el error en JSON', async () => {
      expectError(await server().get(`${URL}/999999/file`).set(asLawyer), 404, 'DOCUMENT_TEMPLATE_NOT_FOUND');
    });
  });

  // CA-35.7, con login real
  describe('acceso', () => {
    const loginWith = async (roles: TestRole[]) => {
      const user = await createUser({ roles, passwordHash: await bcrypt.hash('password1', 4) });
      const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: 'password1' });
      return { Authorization: `Bearer ${login.body.data.accessToken}` };
    };

    it('la secretaría no puede ver ni descargar modelos', async () => {
      const created = await registered('Recurso de casación');
      const secretary = await loginWith(['SECRETARY']);

      for (const path of ['', `/${created.id}`, `/${created.id}/file`]) {
        const res = await server().get(`${URL}${path}`).set(secretary);
        expectError(res, 403, 'FORBIDDEN');
        expect(res.body.error.message).toBe('Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.');
      }
    });

    it.each<[TestRole[]]>([[['ADMINISTRATOR']], [['LAWYER']]])('un usuario con %j puede ver y descargar', async (roles) => {
      const created = await registered('Recurso de casación');
      const actor = await loginWith(roles);

      expect((await server().get(URL).set(actor)).status).toBe(200);
      expect((await server().get(`${URL}/${created.id}`).set(actor)).status).toBe(200);
      expect((await server().get(`${URL}/${created.id}/file`).set(actor)).status).toBe(200);
    });

    it('exige autenticación', async () => {
      await server().get(URL).expect(401);
      await server().get(`${URL}/1/file`).expect(401);
    });
  });
});
