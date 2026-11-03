import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { DocumentStorageUnavailableError } from '../../../src/subsystems/documents/core/domain/errors/documents.errors';
import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { clearCloudFolders, createCloudStructure } from '../../shared/factories/cloud-structure.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createUser } from '../../shared/factories/user.factory';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

/*
 * HU38 Consultar documentos de causa: GET /cases/{caseId}/documents y
 * GET /cases/{caseId}/documents/{documentId}/file. Contrato: API_CONTRACT_V5.md:7386-7653.
 * Escrito desde el plan `.claude/plans/tests-hu38-consultar-documentos.md`, no desde el código.
 *
 * La base es real; Drive es el `InMemoryDocumentStorage`. "Drive apagado" es
 * `failNextWith`: si el pedido le preguntara algo a Drive, sería 502. El 401 sin token está
 * en `test/smoke/app.int.spec.ts`. Qué queda para revisión manual: Drive real con
 * `drive.readonly` (C-24), `uploadedBy` real y la exportación real de un nativo.
 */

type Body = Record<string, any>;

const READ_AT = '2026-10-06T12:30:00-03:00';
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
const LIST_KEYS = ['documents', 'folderStatus', 'folderUrl', 'readAt'];

const CASE_NOT_FOUND = { code: 'CASE_NOT_FOUND', message: 'No se encontró la causa solicitada.', details: null };
const DOCUMENT_NOT_FOUND = {
  code: 'DOCUMENT_NOT_FOUND',
  message: 'No se encontró el documento en la carpeta de la causa.',
  details: null,
};
const FORBIDDEN = {
  code: 'FORBIDDEN',
  message: 'Se requiere el rol LAWYER o SECRETARY para realizar esta operación.',
  details: null,
};
const READ_UNAVAILABLE = {
  code: 'DOCUMENT_STORAGE_UNAVAILABLE',
  message: 'No se pudo leer la carpeta de la causa en Drive. Intentá de nuevo en unos minutos.',
  details: null,
};
const DOWNLOAD_UNAVAILABLE = {
  code: 'DOCUMENT_STORAGE_UNAVAILABLE',
  message: 'No se pudo descargar el documento de Drive. Intentá de nuevo en unos minutos.',
  details: null,
};

/** Superagent no entrega un cuerpo binario por sí solo: se junta en un Buffer. */
const asBuffer = (res: request.Response, done: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
};

describe('Documentos de la causa (HU38)', () => {
  let app: INestApplication;
  let storage: InMemoryDocumentStorage;
  let actors: Record<'admin' | 'abogado' | 'secretaria', { Authorization: string }>;
  let caseId: number;
  let folderId: string;
  let folderUrl: string;
  let caseFileRowId: number;
  let ids: { lawyerId: number; adminId: number; clientId: number };

  const list = (id: number | string = caseId, actor = actors.abogado) =>
    request(app.getHttpServer()).get(`/api/v1/cases/${id}/documents`).set(actor);
  const download = (documentId: string, actor = actors.abogado, query = '', id: number = caseId) =>
    request(app.getHttpServer()).get(`/api/v1/cases/${id}/documents/${documentId}/file${query}`).set(actor);
  const downloadBinary = (documentId: string, actor = actors.abogado, query = '') =>
    download(documentId, actor, query).buffer(true).parse(asBuffer);

  async function cleanUp(): Promise<void> {
    const prisma = getPrisma();
    // `case_files` primero: apunta a causas y usuarios con `Restrict`.
    await prisma.caseFile.deleteMany();
    await prisma.sentNotification.deleteMany();
    await prisma.interruptiveAct.deleteMany();
    await prisma.offense.deleteMany();
    await prisma.case.updateMany({ data: { currentProceduralActId: null } });
    await prisma.proceduralAct.deleteMany();
    await clearCloudFolders();
    await prisma.case.deleteMany();
    await prisma.user.deleteMany();
    await prisma.lawyer.deleteMany();
    await prisma.client.deleteMany();
    storage.reset();
  }

  /** Otra causa del mismo cliente y abogado, con la carpeta en `status`. */
  async function anotherCase(status: 'PENDING' | 'CREATING' | 'ERROR' | null): Promise<number> {
    const created = await createCase({ clientId: ids.clientId, responsibleLawyerId: ids.lawyerId, createdByUserId: ids.adminId });
    await getPrisma().case.update({ where: { id: created.id }, data: { folderStatus: status } });
    return created.id;
  }

  /** Una causa con la carpeta CREATED, en el almacenamiento y en `cloud_folders`, como la deja HU39. */
  async function caseWithCreatedFolder(caption: string): Promise<{ id: number; folderId: string; folderUrl: string }> {
    const prisma = getPrisma();
    const created = await createCase({
      clientId: ids.clientId,
      responsibleLawyerId: ids.lawyerId,
      createdByUserId: ids.adminId,
      sacNumber: null,
      caption,
    });
    const rootCases = (await prisma.cloudFolder.findFirstOrThrow({ where: { kind: 'ROOT_CASES' } })).cloudFolderId;
    const folder = storage.seed(rootCases, caption);
    await prisma.cloudFolder.create({
      data: {
        cloudFolderId: folder.id,
        kind: 'CASE',
        name: caption,
        url: folder.url,
        parentCloudFolderId: rootCases,
        lawyerId: ids.lawyerId,
        jurisdictionId: created.jurisdictionId,
      },
    });
    await prisma.case.update({ where: { id: created.id }, data: { folderStatus: 'CREATED', cloudFolderId: folder.id } });
    return { id: created.id, folderId: folder.id, folderUrl: folder.url };
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
    const users: Record<string, number> = {};
    for (const [name, role] of [
      ['admin', 'ADMINISTRATOR'],
      ['abogado', 'LAWYER'],
      ['secretaria', 'SECRETARY'],
    ] as Array<[string, TestRole]>) {
      users[name] = (await createUser({ roles: [role] })).id;
    }
    actors = {
      admin: loginAs({ userId: users.admin, roles: ['ADMINISTRATOR'] }),
      abogado: loginAs({ userId: users.abogado, roles: ['LAWYER'], lawyerId: lawyer.id }),
      secretaria: loginAs({ userId: users.secretaria, roles: ['SECRETARY'] }),
    };
    ids = { lawyerId: lawyer.id, adminId: users.admin, clientId: client.id };

    await createCloudStructure(storage);
    const reference = await caseWithCreatedFolder('SÁNCHEZ, Celia p.s.a. Robo calificado');
    caseId = reference.id;
    folderId = reference.folderId;
    folderUrl = reference.folderUrl;

    // Los cuatro archivos de la carpeta (tabla "Datos fijos" del plan).
    storage.seedFile({
      id: 'doc-cedula',
      parentId: folderId,
      name: 'Cédula de notificación.pdf',
      mimeType: 'application/pdf',
      content: Buffer.alloc(90112, 1),
      createdAt: new Date('2026-09-09T15:15:00Z'),
      modifiedAt: new Date('2026-09-10T18:00:00Z'),
      uploadedBy: 'Gestión Estudio',
    });
    storage.seedFile({
      id: 'doc-escrito',
      parentId: folderId,
      name: 'Escrito de defensa',
      mimeType: 'application/vnd.google-apps.document',
      createdAt: new Date('2026-09-05T13:00:00Z'),
      uploadedBy: 'Malena Ríos',
    });
    storage.seedFile({
      id: 'doc-planilla',
      parentId: folderId,
      name: 'Planilla de gastos',
      mimeType: 'application/vnd.google-apps.spreadsheet',
      createdAt: new Date('2026-09-01T12:00:00Z'),
    });
    storage.seedFile({
      id: 'doc-expediente',
      parentId: folderId,
      name: 'Expediente_13284571_v1.pdf',
      mimeType: 'application/pdf',
      content: Buffer.alloc(768000, 2),
      createdAt: new Date('2026-08-20T12:30:00Z'),
      uploadedBy: 'VZ Causas',
    });
    // Lo que no entra en la lista (CA-38.3): una subcarpeta, la papelera y otra carpeta.
    storage.seed(folderId, 'Notas');
    storage.seedFile({
      id: 'doc-borrado',
      parentId: folderId,
      name: 'Borrador.pdf',
      mimeType: 'application/pdf',
      createdAt: new Date('2026-09-20T12:00:00Z'),
      trashed: true,
    });
    const other = await caseWithCreatedFolder('PÉREZ, Juan p.s.a. Estafa');
    storage.seedFile({
      id: 'doc-ajeno',
      parentId: other.folderId,
      name: 'Ajeno.pdf',
      mimeType: 'application/pdf',
      createdAt: new Date('2026-09-25T12:00:00Z'),
    });

    const row = await getPrisma().caseFile.create({
      data: {
        caseId,
        version: 1,
        cloudFileId: 'doc-expediente',
        fileName: 'Expediente_13284571_v1.pdf',
        pageCount: 3,
        generatedByUserId: users.admin,
      },
    });
    caseFileRowId = row.id;
    storage.fileCalls.length = 0;
  });

  describe('lista leída (CA-38.1 a CA-38.4)', () => {
    it.each(['admin', 'abogado', 'secretaria'] as const)(
      'la ve %s, con la forma exacta, del más reciente al más antiguo (CA-38.1, CA-38.4)',
      async (who) => {
        const res = await list(caseId, actors[who]);

        expect(res.status).toBe(200);
        expect(Object.keys(res.body)).toEqual(['data']);
        const data: Body = res.body.data;
        expect(Object.keys(data).sort()).toEqual(LIST_KEYS);
        expect(data.folderStatus).toBe('CREATED');
        expect(data.folderUrl).toBe(folderUrl);
        expect(data.readAt).toBe(READ_AT);
        expect(data.documents.map((d: Body) => d.id)).toEqual([
          'doc-cedula',
          'doc-escrito',
          'doc-planilla',
          'doc-expediente',
        ]);
        for (const document of data.documents) expect(Object.keys(document).sort()).toEqual(DOCUMENT_KEYS);

        const [cedula, escrito, planilla, expediente] = data.documents;
        expect(cedula).toEqual({
          id: 'doc-cedula',
          name: 'Cédula de notificación.pdf',
          extension: 'pdf',
          mimeType: 'application/pdf',
          sizeBytes: 90112,
          createdAt: '2026-09-09T12:15:00-03:00',
          modifiedAt: '2026-09-10T15:00:00-03:00',
          uploadedBy: 'Gestión Estudio',
          url: 'https://storage.invalid/files/doc-cedula',
          convertibleToPdf: true,
          caseFile: null,
        });
        expect(escrito).toMatchObject({
          extension: null,
          sizeBytes: null,
          createdAt: '2026-09-05T10:00:00-03:00',
          uploadedBy: 'Malena Ríos',
          convertibleToPdf: true,
          caseFile: null,
        });
        expect(planilla).toMatchObject({
          extension: null,
          sizeBytes: null,
          createdAt: '2026-09-01T09:00:00-03:00',
          uploadedBy: null,
          convertibleToPdf: false,
          caseFile: null,
        });
        expect(expediente).toEqual({
          id: 'doc-expediente',
          name: 'Expediente_13284571_v1.pdf',
          extension: 'pdf',
          mimeType: 'application/pdf',
          sizeBytes: 768000,
          createdAt: '2026-08-20T09:30:00-03:00',
          modifiedAt: '2026-08-20T09:30:00-03:00',
          uploadedBy: 'VZ Causas',
          url: 'https://storage.invalid/files/doc-expediente',
          convertibleToPdf: true,
          caseFile: { id: caseFileRowId, version: 1 },
        });
      },
    );

    it('no trae la subcarpeta, la papelera ni los archivos de otra carpeta (CA-38.3)', async () => {
      const res = await list();

      expect(res.body.data.documents.map((d: Body) => d.id)).toEqual([
        'doc-cedula',
        'doc-escrito',
        'doc-planilla',
        'doc-expediente',
      ]);
    });

    it('se lee de Drive en cada pedido: un renombre y un borrado se ven en el siguiente (CA-38.2)', async () => {
      const first = await list();
      expect(first.body.data.documents).toHaveLength(4);

      storage.renameFile('doc-cedula', 'Cédula (firmada).pdf');
      await storage.deleteFile('doc-planilla');
      const second = await list();

      expect(second.status).toBe(200);
      expect(second.body.data.documents.map((d: Body) => [d.id, d.name])).toEqual([
        ['doc-cedula', 'Cédula (firmada).pdf'],
        ['doc-escrito', 'Escrito de defensa'],
        ['doc-expediente', 'Expediente_13284571_v1.pdf'],
      ]);
    });
  });

  describe('causa y carpeta (CA-38.5, CA-38.9)', () => {
    it.each(['PENDING', 'CREATING', 'ERROR', null] as const)(
      'con la carpeta en %s responde 200 sin leer Drive (CA-38.5)',
      async (status) => {
        const id = await anotherCase(status);
        storage.failNextWith(new DocumentStorageUnavailableError());

        const res = await list(id);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ data: { folderStatus: status, folderUrl: null, readAt: null, documents: [] } });
      },
    );

    it.each(['inexistente', 'dada de baja'] as const)(
      'una causa %s responde 404 CASE_NOT_FOUND en la lista y en la descarga (CA-38.9, D-97)',
      async (kind) => {
        const id = kind === 'inexistente' ? 999999 : caseId;
        if (kind === 'dada de baja') await deactivateCase(caseId);

        const listed = await list(id);
        const downloaded = await download('doc-cedula', actors.abogado, '', id);

        expect(listed.status).toBe(404);
        expect(listed.body).toEqual({ error: CASE_NOT_FOUND });
        expect(downloaded.status).toBe(404);
        expect(downloaded.body).toEqual({ error: CASE_NOT_FOUND });
      },
    );

    it('un caseId que no es entero responde 400 INVALID_PATH_PARAMETER', async () => {
      const res = await list('abc');

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

  describe('descarga (CA-38.7)', () => {
    it('el abogado descarga un PDF como adjunto por defecto, con el nombre y sus tildes', async () => {
      const res = await downloadBinary('doc-cedula');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/^application\/pdf/);
      expect(res.headers['content-disposition']).toMatch(/^attachment; filename="Cedula de notificacion.pdf"/);
      expect(res.headers['content-disposition']).toContain(
        "filename*=UTF-8''C%C3%A9dula%20de%20notificaci%C3%B3n.pdf",
      );
      expect((res.body as Buffer).equals(Buffer.alloc(90112, 1))).toBe(true);
    });

    it('la secretaría descarga un documento de Google en línea: sale exportado a PDF', async () => {
      const res = await downloadBinary('doc-escrito', actors.secretaria, '?disposition=inline');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/^application\/pdf/);
      expect(res.headers['content-disposition']).toMatch(/^inline; filename="Escrito de defensa.pdf"/);
      expect((res.body as Buffer).toString()).toBe('application/pdf exportado de Escrito de defensa');
    });

    it('el administrador descarga el expediente, pero no un documento común: 403 sin consultar Drive (D-103)', async () => {
      const caseFile = await downloadBinary('doc-expediente', actors.admin);
      expect(caseFile.status).toBe(200);
      expect(caseFile.headers['content-disposition']).toMatch(/^attachment; filename="Expediente_13284571_v1.pdf"/);

      storage.failNextWith(new DocumentStorageUnavailableError());
      const common = await download('doc-cedula', actors.admin);

      expect(common.status).toBe(403);
      expect(common.body).toEqual({ error: FORBIDDEN });
    });
  });

  describe('descarga rechazada (CA-38.8)', () => {
    it.each(['doc-ajeno', 'doc-borrado', 'no-existe'])('%s responde 404 DOCUMENT_NOT_FOUND', async (documentId) => {
      const res = await download(documentId);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: DOCUMENT_NOT_FOUND });
    });

    it('un disposition que no es inline ni attachment responde 400 INVALID_REQUEST', async () => {
      const res = await download('doc-cedula', actors.abogado, '?disposition=download');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Parámetros de query inválidos.',
          details: { disposition: 'Debe ser inline o attachment.' },
        },
      });
    });

    it('con la carpeta sin crear el documento no existe (CA-38.5)', async () => {
      const id = await anotherCase('PENDING');

      const res = await download('doc-cedula', actors.abogado, '', id);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: DOCUMENT_NOT_FOUND });
    });
  });

  describe('Drive no responde (CA-38.6)', () => {
    it('la lista responde 502 con el mensaje de lectura', async () => {
      storage.failNextWith(new DocumentStorageUnavailableError());

      const res = await list();

      expect(res.status).toBe(502);
      expect(res.body).toEqual({ error: READ_UNAVAILABLE });
    });

    it('la descarga responde 502 con el mensaje de descarga, distinto del de lectura', async () => {
      storage.failNextWith(new DocumentStorageUnavailableError());

      const res = await download('doc-cedula');

      expect(res.status).toBe(502);
      expect(res.body).toEqual({ error: DOWNLOAD_UNAVAILABLE });
    });
  });
});
