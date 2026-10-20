import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { DocumentStorageUnavailableError } from '../../../src/subsystems/documents/core/domain/errors/documents.errors';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { createJurisdiction } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

/*
 * HU34 · Registrar modelo formal: POST /document-templates (contrato V4 §3.10).
 *
 * La base es real. El almacenamiento es el `InMemoryDocumentStorage` con el que
 * viene `documents` mientras no exista el adaptador de Google Drive; la carpeta
 * "Modelos formales" se carga como la deja el script de puesta en marcha.
 */
type Body = Record<string, any>;
const URL = '/api/v1/document-templates';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('POST /api/v1/document-templates', () => {
  let app: INestApplication;
  let storage: InMemoryDocumentStorage;
  let templatesFolderId: string;
  let lawyer: { id: number; lastName: string; firstName: string };
  let asLawyer: { Authorization: string };

  const server = () => request(app.getHttpServer());

  /** Un alta completa y válida; cada test cambia lo que le importa. */
  const register = (
    options: {
      actor?: { Authorization: string };
      name?: string | null;
      jurisdictions?: string[];
      copyToNewCases?: string;
      file?: { content: Buffer; fileName: string; contentType: string } | null;
    } = {},
  ) => {
    const req = server().post(URL).set(options.actor ?? asLawyer);
    const name = options.name === undefined ? 'Recurso de casación' : options.name;
    if (name !== null) req.field('name', name);
    for (const code of options.jurisdictions ?? ['CRIMINAL']) req.field('jurisdictions', code);
    if (options.copyToNewCases !== undefined) req.field('copyToNewCases', options.copyToNewCases);
    const file =
      options.file === undefined
        ? { content: Buffer.from('PK contenido de prueba'), fileName: 'casacion.docx', contentType: DOCX }
        : options.file;
    if (file) req.attach('file', file.content, { filename: file.fileName, contentType: file.contentType });
    return req;
  };

  const templatesInDb = () =>
    getPrisma().documentTemplate.findMany({ include: { jurisdictions: { include: { jurisdiction: true } } } });

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

  // CA-34.1, CA-34.6, CA-34.11
  it('registra el modelo, con su archivo en "Modelos formales", en la forma del contrato', async () => {
    const data = expectData<Body>(await register(), 201);

    expect(data).toEqual({
      id: expect.any(Number),
      name: 'Recurso de casación',
      jurisdictions: ['CRIMINAL'],
      fileName: 'casacion.docx',
      copyToNewCases: true,
      lastVersionAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/),
      lastVersionBy: lawyer,
      usageCount: 0,
      active: true,
    });
    const [row] = await templatesInDb();
    expect(row).toMatchObject({ id: data.id, cloudFolderId: templatesFolderId, lastVersionByUserId: lawyer.id });
    expect(storage.files.find((file) => file.id === row.cloudFileId)).toMatchObject({
      parentId: templatesFolderId,
      name: 'casacion.docx',
      mimeType: DOCX,
    });
  });

  // CA-34.2
  it('para todos los fueros es un solo modelo con un solo archivo', async () => {
    const before = storage.files.length;

    const data = expectData<Body>(await register({ jurisdictions: ['AMPARO', 'CRIMINAL', 'ADMINISTRATIVE'] }), 201);

    expect(data.jurisdictions).toEqual(['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO']);
    const rows = await templatesInDb();
    expect(rows).toHaveLength(1);
    expect(rows[0].jurisdictions).toHaveLength(3);
    expect(storage.files.length - before).toBe(1);
  });

  // CA-34.5
  it('"Copiar en las causas nuevas" se puede desmarcar', async () => {
    expect(expectData<Body>(await register({ copyToNewCases: 'false' }), 201).copyToNewCases).toBe(false);
  });

  it('respeta los acentos del nombre del archivo', async () => {
    const file = { content: Buffer.from('PK'), fileName: 'designación-defensor.docx', contentType: DOCX };

    expect(expectData<Body>(await register({ file }), 201).fileName).toBe('designación-defensor.docx');
  });

  // CA-34.3
  it('rechaza un archivo que no es .docx', async () => {
    const res = await register({ file: { content: Buffer.from('%PDF'), fileName: 'casacion.pdf', contentType: 'application/pdf' } });

    expectError(res, 400, 'VALIDATION_ERROR', ['file']);
    expect(res.body.error.details.file).toBe('El archivo tiene que ser .docx.');
    expect(await templatesInDb()).toEqual([]);
  });

  // CA-34.4
  it('si faltan el nombre, el fuero y el archivo, indica los tres', async () => {
    const res = await register({ name: null, jurisdictions: [], file: null });

    expectError(res, 400, 'VALIDATION_ERROR', ['name', 'jurisdictions', 'file']);
    expect(res.body.error.details).toEqual({
      name: 'El nombre del modelo es obligatorio.',
      jurisdictions: 'Elegí al menos un fuero.',
      file: 'El archivo del modelo es obligatorio.',
    });
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

  // CA-34.7
  it('si Drive no responde, no registra el modelo y avisa que hay que intentar de nuevo', async () => {
    storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));

    const res = await register();

    expectError(res, 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
    expect(res.body.error.message).toBe(
      'No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.',
    );
    expect(await templatesInDb()).toEqual([]);
  });

  // CA-34.11
  it('sin la carpeta "Modelos formales" configurada responde 502 y no registra nada', async () => {
    await getPrisma().cloudFolder.deleteMany({ where: { kind: 'TEMPLATES' } });

    expectError(await register(), 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
    expect(await templatesInDb()).toEqual([]);
  });

  // CA-34.8, con login real
  it.each<[TestRole[], number]>([
    [['ADMINISTRATOR'], 201],
    [['LAWYER'], 201],
    [['SECRETARY'], 403],
  ])('un usuario con %j recibe %i', async (roles, status) => {
    const user = await createUser({ roles, passwordHash: await bcrypt.hash('password1', 4) });
    const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: 'password1' });
    const actor = { Authorization: `Bearer ${login.body.data.accessToken}` };

    const res = await register({ actor, name: `Modelo de ${roles.join('-')}` });

    expect(res.status).toBe(status);
    if (status === 403) {
      expectError(res, 403, 'FORBIDDEN');
      expect(res.body.error.message).toBe('Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.');
    }
  });

  it('exige autenticación', async () => {
    await server().post(URL).field('name', 'Recurso').expect(401);
  });
});
