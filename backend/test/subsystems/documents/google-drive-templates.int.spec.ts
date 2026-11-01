import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { loginAs } from '../../shared/auth/login-as';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { clearCloudFolders, createCloudStructure } from '../../shared/factories/cloud-structure.factory';
import { createJurisdiction } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { SwitchableStorage } from '../../shared/harness/case-folder-scenario';
import { buildGoogleStack, GoogleStack } from '../../shared/harness/google-stack';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

const URL = '/api/v1/document-templates';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/*
 * HU34 y HU35 con la pila REAL de Google: el archivo del modelo formal sube a
 * "Modelos formales" por la subida multipart de `@googleapis/drive` y se descarga igual
 * de vuelta. Complementa `register-document-template.int.spec.ts`, que usa el
 * almacenamiento en memoria.
 */
describe('Modelos formales con la pila real de Google', () => {
  let app: INestApplication;
  const storage = new SwitchableStorage();
  let stack: GoogleStack;
  let templatesFolderId: string;
  let asLawyer: { Authorization: string };

  const register = (content: Buffer, name = 'Recurso de casación') =>
    request(app.getHttpServer())
      .post(URL)
      .set(asLawyer)
      .field('name', name)
      .field('jurisdictions', 'CRIMINAL')
      .attach('file', content, { filename: 'casacion.docx', contentType: DOCX });

  async function cleanUp(): Promise<void> {
    const prisma = getPrisma();
    await prisma.documentTemplateJurisdiction.deleteMany();
    await prisma.documentTemplate.deleteMany();
    await clearCloudFolders();
  }

  beforeAll(async () => {
    app = await startTestApp((builder) => builder.overrideProvider(DOCUMENT_STORAGE).useValue(storage));
  });

  afterAll(async () => {
    await cleanUp();
    await stopTestApp();
  });

  beforeEach(async () => {
    await cleanUp();
    for (const code of ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] as const) await createJurisdiction(code);
    const user = await createUser({ roles: ['LAWYER'] });
    asLawyer = loginAs({ userId: user.id, roles: ['LAWYER'] });

    stack = buildGoogleStack();
    storage.current = stack;
    const structure = await createCloudStructure({ seed: (parent, name) => stack.fake.seedFolder(name, parent) });
    templatesFolderId = structure.templates.id;
  });

  it('sube el archivo a "Modelos formales" y la descarga devuelve exactamente los mismos bytes', async () => {
    const content = Buffer.from(Array.from({ length: 1024 * 1024 }, (_, i) => i % 251)); // 1 MB no repetitivo

    const created = expectData<{ id: number }>(await register(content), 201);
    const res = await request(app.getHttpServer())
      .get(`${URL}/${created.id}/file`)
      .set(asLawyer)
      .buffer(true)
      .parse((response, done) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => done(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect((res.body as Buffer).equals(content)).toBe(true);
    const [file] = stack.fake.files;
    expect(file.name).toBe('casacion.docx');
    expect(file.parentId).toBe(templatesFolderId);
  });

  it('un archivo de casi 10 MB (el máximo del contrato) sube completo por la carga multipart', async () => {
    const content = Buffer.alloc(9 * 1024 * 1024 + 512 * 1024, 7);

    const created = expectData<{ id: number }>(await register(content), 201);

    expect(created.id).toEqual(expect.any(Number));
    expect(stack.fake.files[0].content?.length).toBe(content.length);
  });

  it('si Drive falla al subir responde 502 con el texto del contrato y no registra el modelo (CA-34.7)', async () => {
    stack.fake.failNext({ status: 503, times: 99 });

    const res = await register(Buffer.from('contenido'));

    expectError(res, 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
    expect(res.body.error.message).toBe(
      'No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.',
    );
    expect(await getPrisma().documentTemplate.count()).toBe(0);
    expect(stack.fake.files).toEqual([]);
    expect(stack.fake.driveRequests).toHaveLength(3);
  });

  it('con la autorización perdida responde 502 y no reintenta', async () => {
    stack.fake.revokeRefreshToken();

    const res = await register(Buffer.from('contenido'));

    expectError(res, 502, 'DOCUMENT_STORAGE_UNAVAILABLE');
    expect(stack.fake.tokenRequests).toHaveLength(1);
    expect(await getPrisma().documentTemplate.count()).toBe(0);
  });
});
