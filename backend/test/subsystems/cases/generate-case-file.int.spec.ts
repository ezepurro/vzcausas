import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { DocumentStorageUnavailableError } from '../../../src/subsystems/documents/core/domain/errors/documents.errors';
import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { TINY_JPG, TINY_PNG, aPdf, pageCountOf } from '../../../src/subsystems/documents/core/test-support/pdf-fixtures';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { loginAs } from '../../shared/auth/login-as';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { clearCloudFolders, createCloudStructure } from '../../shared/factories/cloud-structure.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createUser } from '../../shared/factories/user.factory';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { purgeAuditLog } from '../../shared/harness/audit-log';

/*
 * HU25 Generar y emitir expediente: POST /cases/{caseId}/case-files. Contrato:
 * API_CONTRACT_V5.md:7657-7902. Escrito desde el plan
 * `.claude/plans/tests-hu25-generar-expediente.md`, no desde el código.
 *
 * La base es real; Drive es el `InMemoryDocumentStorage`, que exporta y convierte a un
 * PDF real de una hoja. El 401 sin token está en `test/smoke/app.int.spec.ts`. Qué queda
 * para revisión manual: la conversión real de Word y Google con Drive, que la hoja 1 se
 * vea como `GET /cover` (el contenido de cada recuadro lo fijan los unitarios de
 * `CoverSheet`) y dos generaciones simultáneas contra PostgreSQL.
 */

type Body = Record<string, any>;

const GENERATED_AT = '2026-10-06T12:30:00-03:00';
const DATA_KEYS = ['document', 'generatedAt', 'generatedBy', 'pageCount', 'parts', 'version'];
const DOCUMENT_KEYS = [
  'caseFile',
  'convertibleToPdf',
  'createdAt',
  'extension',
  'id',
  'mimeType',
  'modifiedAt',
  'name',
  'sizeBytes',
  'uploadedBy',
  'url',
];
const REFERENCE_IDS = ['doc-requerimiento', 'doc-escrito', 'doc-recurso', 'doc-foto'];

const invalid = (details: Record<string, string>) => ({
  error: { code: 'VALIDATION_ERROR', message: 'Los datos enviados no son válidos.', details },
});
const NOT_IN_FOLDER = invalid({
  documentIds: 'Un documento no está en la carpeta de la causa o es un expediente anterior.',
});
const CASE_NOT_FOUND = { error: { code: 'CASE_NOT_FOUND', message: 'No se encontró la causa solicitada.', details: null } };
const FOLDER_NOT_AVAILABLE = {
  error: {
    code: 'CASE_FOLDER_NOT_AVAILABLE',
    message: 'La causa no tiene su carpeta en Drive creada. Creala antes de generar el expediente.',
    details: null,
  },
};
const NOT_CONVERTIBLE = {
  error: { code: 'DOCUMENT_NOT_CONVERTIBLE', message: 'Uno de los documentos no se puede convertir a PDF.', details: null },
};
const STORAGE_UNAVAILABLE = {
  error: {
    code: 'DOCUMENT_STORAGE_UNAVAILABLE',
    message: 'No se pudo generar el expediente porque Drive no respondió. Intentá de nuevo en unos minutos.',
    details: null,
  },
};

/** Superagent no entrega un cuerpo binario por sí solo: se junta en un Buffer. */
const asBuffer = (res: request.Response, done: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
};

describe('POST /api/v1/cases/{caseId}/case-files (HU25)', () => {
  let app: INestApplication;
  let storage: InMemoryDocumentStorage;
  let actors: Record<'secretaria' | 'admin', { Authorization: string }>;
  let users: Record<'secretaria' | 'admin', { id: number; lastName: string; firstName: string }>;
  let ids: { lawyerId: number; clientId: number };
  let caseId: number;
  let folderId: string;

  const generate = (body: Body, id: number | string = caseId, actor = actors.secretaria) =>
    request(app.getHttpServer()).post(`/api/v1/cases/${id}/case-files`).set(actor).send(body);

  /** Archivos de la carpeta y filas de `case_files`: lo que un pedido rechazado no puede cambiar. */
  const written = async (folder = folderId) => ({
    files: storage.files.filter((file) => file.parentId === folder).length,
    rows: await getPrisma().caseFile.count(),
  });

  async function cleanUp(): Promise<void> {
    const prisma = getPrisma();
    await prisma.caseFile.deleteMany();
    await prisma.sentNotification.deleteMany();
    await prisma.interruptiveAct.deleteMany();
    await prisma.offense.deleteMany();
    await prisma.case.updateMany({ data: { currentProceduralActId: null } });
    await prisma.proceduralAct.deleteMany();
    await clearCloudFolders();
    await prisma.case.deleteMany();
    await purgeAuditLog();
    await prisma.user.deleteMany();
    await prisma.lawyer.deleteMany();
    await prisma.client.deleteMany();
    storage.reset();
  }

  /** Una causa con la carpeta CREATED, en el almacenamiento y en `cloud_folders`, como la deja HU39. */
  async function caseWithCreatedFolder(
    overrides: { sacNumber?: string | null; jurisdiction?: 'CRIMINAL' | 'ADMINISTRATIVE' | 'AMPARO' } = {},
  ): Promise<{ id: number; folderId: string }> {
    const prisma = getPrisma();
    const created = await createCase({
      clientId: ids.clientId,
      responsibleLawyerId: ids.lawyerId,
      createdByUserId: users.secretaria.id,
      sacNumber: overrides.sacNumber ?? null,
      jurisdiction: overrides.jurisdiction,
      caption: `CAUSA ${Math.random().toString(36).slice(2, 8)}`,
    });
    const rootCases = (await prisma.cloudFolder.findFirstOrThrow({ where: { kind: 'ROOT_CASES' } })).cloudFolderId;
    const folder = storage.seed(rootCases, created.caption);
    await prisma.cloudFolder.create({
      data: {
        cloudFolderId: folder.id,
        kind: 'CASE',
        name: created.caption,
        url: folder.url,
        parentCloudFolderId: rootCases,
        lawyerId: ids.lawyerId,
        jurisdictionId: created.jurisdictionId,
      },
    });
    await prisma.case.update({ where: { id: created.id }, data: { folderStatus: 'CREATED', cloudFolderId: folder.id } });
    return { id: created.id, folderId: folder.id };
  }

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
    storage = app.get(DOCUMENT_STORAGE);
  });

  afterAll(async () => {
    await cleanUp();
    await stopTestApp();
  });

  beforeEach(async () => {
    await cleanUp();

    const lawyer = await createLawyer({ lastName: 'Ríos', firstName: 'Malena' });
    const client = await createClient({ lastName: 'Sánchez', firstName: 'Celia' });
    const secretaria = await createUser({ roles: ['SECRETARY'], lastName: 'Estudio', firstName: 'Gestión' });
    const admin = await createUser({ roles: ['ADMINISTRATOR'], lastName: 'Estudio', firstName: 'Supervisión' });
    users = {
      secretaria: { id: secretaria.id, lastName: 'Estudio', firstName: 'Gestión' },
      admin: { id: admin.id, lastName: 'Estudio', firstName: 'Supervisión' },
    };
    actors = {
      secretaria: loginAs({ userId: secretaria.id, roles: ['SECRETARY'] }),
      admin: loginAs({ userId: admin.id, roles: ['ADMINISTRATOR'] }),
    };
    ids = { lawyerId: lawyer.id, clientId: client.id };

    await createCloudStructure(storage);
    const reference = await caseWithCreatedFolder({ sacNumber: '13284571' });
    caseId = reference.id;
    folderId = reference.folderId;

    // Los seis archivos de la carpeta (tabla "Datos fijos" del plan).
    const at = new Date('2026-09-01T12:00:00Z');
    const seed = (id: string, name: string, mimeType: string, content?: Buffer, parentId = folderId) =>
      storage.seedFile({ id, parentId, name, mimeType, content, createdAt: at });
    seed('doc-requerimiento', 'Requerimiento de elevación a juicio.pdf', 'application/pdf', await aPdf(2));
    seed('doc-escrito', 'Escrito de defensa', 'application/vnd.google-apps.document');
    seed(
      'doc-recurso',
      'Recurso de casación.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    seed('doc-foto', 'Constancia.jpg', 'image/jpeg', TINY_JPG);
    seed('doc-captura', 'Captura.png', 'image/png', TINY_PNG);
    seed('doc-planilla', 'Planilla de gastos', 'application/vnd.google-apps.spreadsheet');
    const other = await caseWithCreatedFolder();
    seed('doc-ajeno', 'Ajeno.pdf', 'application/pdf', await aPdf(1), other.folderId);
  });

  describe('generación (CA-25.1, 25.4, 25.6, 25.9, 25.10, 25.11)', () => {
    it('la secretaría genera el expediente: forma exacta, partes en orden, y la causa no cambia', async () => {
      const before = await request(app.getHttpServer()).get(`/api/v1/cases/${caseId}`).set(actors.secretaria);

      const res = await generate({ documentIds: REFERENCE_IDS });

      expect(res.status).toBe(201);
      expect(Object.keys(res.body)).toEqual(['data']);
      const data: Body = res.body.data;
      expect(Object.keys(data).sort()).toEqual(DATA_KEYS);
      expect(Object.keys(data.document).sort()).toEqual(DOCUMENT_KEYS);

      const row = await getPrisma().caseFile.findFirstOrThrow({ where: { caseId } });
      const saved = storage.files.find((file) => file.id === data.document.id);
      expect(data).toEqual({
        document: {
          id: row.cloudFileId,
          name: 'Expediente_13284571_v1.pdf',
          extension: 'pdf',
          mimeType: 'application/pdf',
          sizeBytes: saved?.size,
          createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/),
          modifiedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/),
          uploadedBy: null,
          url: saved?.url,
          convertibleToPdf: true,
          caseFile: { id: row.id, version: 1 },
        },
        version: 1,
        pageCount: 6,
        parts: [
          { position: 1, kind: 'COVER', documentId: null, name: 'Carátula' },
          { position: 2, kind: 'DOCUMENT', documentId: 'doc-requerimiento', name: 'Requerimiento de elevación a juicio.pdf' },
          { position: 3, kind: 'DOCUMENT', documentId: 'doc-escrito', name: 'Escrito de defensa' },
          { position: 4, kind: 'DOCUMENT', documentId: 'doc-recurso', name: 'Recurso de casación.docx' },
          { position: 5, kind: 'DOCUMENT', documentId: 'doc-foto', name: 'Constancia.jpg' },
        ],
        generatedBy: users.secretaria,
        generatedAt: GENERATED_AT,
      });

      expect(row).toMatchObject({
        version: 1,
        pageCount: 6,
        fileName: 'Expediente_13284571_v1.pdf',
        generatedByUserId: users.secretaria.id,
      });
      expect(saved).toMatchObject({ parentId: folderId, mimeType: 'application/pdf' });
      expect(await pageCountOf(saved!.content)).toBe(6);

      const after = await request(app.getHttpServer()).get(`/api/v1/cases/${caseId}`).set(actors.secretaria);
      expect(after.body).toEqual(before.body);
    });

    it('las versiones son correlativas, se conservan y borrar una en Drive no reutiliza su número (CA-25.6)', async () => {
      const first = await generate({ documentIds: ['doc-requerimiento'] });
      const second = await generate({ documentIds: ['doc-requerimiento'] });
      expect([first.body.data.version, second.body.data.version]).toEqual([1, 2]);

      await storage.deleteFile(second.body.data.document.id);
      const third = await generate({ documentIds: ['doc-requerimiento'] });

      expect(third.status).toBe(201);
      expect(third.body.data).toMatchObject({ version: 3, document: { name: 'Expediente_13284571_v3.pdf' } });
      const caseFilesInFolder = storage.files
        .filter((file) => file.parentId === folderId && file.name.startsWith('Expediente_'))
        .map((file) => file.name);
      expect(caseFilesInFolder).toEqual(['Expediente_13284571_v1.pdf', 'Expediente_13284571_v3.pdf']);
    });

    it('un administrador sin otro rol genera el expediente y lo abre para imprimir (CA-25.10, D-103)', async () => {
      const res = await generate({ documentIds: ['doc-requerimiento'] }, caseId, actors.admin);
      expect(res.status).toBe(201);
      expect(res.body.data.generatedBy).toEqual(users.admin);

      const file = await request(app.getHttpServer())
        .get(`/api/v1/cases/${caseId}/documents/${res.body.data.document.id}/file?disposition=inline`)
        .set(actors.admin)
        .buffer(true)
        .parse(asBuffer);

      expect(file.status).toBe(200);
      expect(file.headers['content-type']).toMatch(/^application\/pdf/);
      expect(file.headers['content-disposition']).toMatch(/^inline; filename="Expediente_13284571_v1.pdf"/);
      const saved = storage.files.find((stored) => stored.id === res.body.data.document.id);
      expect((file.body as Buffer).equals(saved!.content)).toBe(true);
    });
  });

  describe('datos de la carátula (CA-25.5)', () => {
    it('en el penal acepta la parte y las observaciones, y no guarda nada en la causa', async () => {
      const before = await getPrisma().case.findUniqueOrThrow({ where: { id: caseId } });

      const res = await generate({
        cover: {
          opposingParty: 'QUERELLANTE: PERALTA Juan Carlos\nAPODERADO: DR. Martín Sosa',
          notes: 'Causa conexa en DI T6',
        },
        documentIds: ['doc-captura'],
      });

      expect(res.status).toBe(201);
      expect(res.body.data.pageCount).toBe(2);
      expect(await getPrisma().case.findUniqueOrThrow({ where: { id: caseId } })).toEqual(before);
    });

    it.each(['AMPARO', 'ADMINISTRATIVE'] as const)(
      'en %s la parte responde 400 sobre cover y no se guarda nada',
      async (jurisdiction) => {
        const other = await caseWithCreatedFolder({ jurisdiction });
        storage.seedFile({
          id: 'doc-amparo',
          parentId: other.folderId,
          name: 'Escrito.pdf',
          mimeType: 'application/pdf',
          content: await aPdf(1),
          createdAt: new Date('2026-09-01T12:00:00Z'),
        });
        const before = await written(other.folderId);

        const res = await generate({ cover: { opposingParty: 'Peralta' }, documentIds: ['doc-amparo'] }, other.id);

        expect(res.status).toBe(400);
        expect(res.body).toEqual(invalid({ cover: 'La parte de la carátula solo corresponde al fuero penal.' }));
        expect(await written(other.folderId)).toEqual(before);
      },
    );
  });

  describe('documentos elegidos (CA-25.2, 25.3, 25.4)', () => {
    it.each([
      ['vacía', { documentIds: [] }, { documentIds: 'Elegí al menos un documento.' }],
      ['ausente', {}, { documentIds: 'Elegí al menos un documento.' }],
      [
        'con repetidos',
        { documentIds: ['doc-requerimiento', 'doc-requerimiento'] },
        { documentIds: 'No puede haber documentos repetidos.' },
      ],
    ])('una lista %s responde 400 sobre documentIds', async (_label, body, details) => {
      const before = await written();

      const res = await generate(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual(invalid(details));
      expect(await written()).toEqual(before);
    });

    it.each(['doc-ajeno', 'doc-expediente-previo', 'no-existe'])(
      '%s responde 400: no está en la carpeta o es un expediente anterior',
      async (documentId) => {
        storage.seedFile({
          id: 'doc-expediente-previo',
          parentId: folderId,
          name: 'Expediente_13284571_v1.pdf',
          mimeType: 'application/pdf',
          content: await aPdf(1),
          createdAt: new Date('2026-09-01T12:00:00Z'),
        });
        await getPrisma().caseFile.create({
          data: {
            caseId,
            version: 1,
            cloudFileId: 'doc-expediente-previo',
            fileName: 'Expediente_13284571_v1.pdf',
            pageCount: 1,
            generatedByUserId: users.secretaria.id,
          },
        });
        const before = await written();

        const res = await generate({ documentIds: ['doc-requerimiento', documentId] });

        expect(res.status).toBe(400);
        expect(res.body).toEqual(NOT_IN_FOLDER);
        expect(await written()).toEqual(before);
      },
    );

    it('una hoja de cálculo de Google responde 422 DOCUMENT_NOT_CONVERTIBLE', async () => {
      const before = await written();

      const res = await generate({ documentIds: ['doc-requerimiento', 'doc-planilla'] });

      expect(res.status).toBe(422);
      expect(res.body).toEqual(NOT_CONVERTIBLE);
      expect(await written()).toEqual(before);
    });
  });

  describe('causa y carpeta (CA-25.7, 25.12)', () => {
    it.each(['PENDING', 'CREATING', 'ERROR', null] as const)(
      'con la carpeta en %s responde 422 CASE_FOLDER_NOT_AVAILABLE',
      async (status) => {
        const created = await createCase({
          clientId: ids.clientId,
          responsibleLawyerId: ids.lawyerId,
          createdByUserId: users.secretaria.id,
        });
        await getPrisma().case.update({ where: { id: created.id }, data: { folderStatus: status } });
        const rows = await getPrisma().caseFile.count();

        const res = await generate({ documentIds: ['doc-requerimiento'] }, created.id);

        expect(res.status).toBe(422);
        expect(res.body).toEqual(FOLDER_NOT_AVAILABLE);
        expect(await getPrisma().caseFile.count()).toBe(rows);
      },
    );

    it.each(['inexistente', 'dada de baja'] as const)('una causa %s responde 404 CASE_NOT_FOUND', async (kind) => {
      if (kind === 'dada de baja') await deactivateCase(caseId);
      const id = kind === 'inexistente' ? 999999 : caseId;

      const res = await generate({ documentIds: ['doc-requerimiento'] }, id);

      expect(res.status).toBe(404);
      expect(res.body).toEqual(CASE_NOT_FOUND);
    });

    it('un caseId que no es entero responde 400 INVALID_PATH_PARAMETER', async () => {
      const res = await generate({ documentIds: ['doc-requerimiento'] }, 'abc');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: 'INVALID_PATH_PARAMETER',
          message: 'El identificador de la causa no es válido.',
          details: { caseId: 'Debe ser un número entero válido.' },
        },
      });
    });
  });

  describe('Drive no responde (CA-25.8)', () => {
    it.each([
      ['al leer un documento', 'downloadFile'],
      ['al guardar el expediente', 'uploadFile'],
    ] as const)('%s: 502, nada guardado y la versión no se consume', async (_label, method) => {
      const before = await written();
      storage.failNextCallTo(method, new DocumentStorageUnavailableError());

      const failed = await generate({ documentIds: ['doc-requerimiento'] });

      expect(failed.status).toBe(502);
      expect(failed.body).toEqual(STORAGE_UNAVAILABLE);
      expect(await written()).toEqual(before);

      const retried = await generate({ documentIds: ['doc-requerimiento'] });
      expect(retried.status).toBe(201);
      expect(retried.body.data.version).toBe(1);
    });
  });
});
