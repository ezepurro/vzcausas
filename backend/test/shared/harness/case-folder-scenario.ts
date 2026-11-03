import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  DocumentStoragePort,
  FileCopy,
  FileUpload,
  FolderReference,
} from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { loginAs } from '../auth/login-as';
import { aCaseBody } from '../factories/case.factory';
import { createClient } from '../factories/client.factory';
import { clearCloudFolders } from '../factories/cloud-structure.factory';
import { createLawyer } from '../factories/lawyer.factory';
import { createInitialState } from '../factories/procedural-state.factory';
import { createUser } from '../factories/user.factory';
import { getPrisma } from './test-app';
import type { GoogleStack } from './google-stack';

/**
 * Piezas comunes de los specs de carpeta de causa (HU39) que corren contra la
 * pila real de Google: limpiar la base, crear a los actores y registrar causas
 * por HTTP, que es como las pide el front.
 */

export const CASES_URL = '/api/v1/cases';

/** Deja la base sin causas, carpetas ni actores, en el orden que piden las claves foráneas. */
export async function resetDatabaseForCaseFolders(): Promise<void> {
  const prisma = getPrisma();
  await prisma.caseFile.deleteMany(); // HU38/HU25: referencia a causas y usuarios con `Restrict`
  await prisma.sentNotification.deleteMany(); // referencia a causas; la deja `daily-run`
  await prisma.offense.deleteMany();
  await prisma.case.updateMany({ data: { currentProceduralActId: null } });
  await prisma.proceduralAct.deleteMany();
  await prisma.case.deleteMany();
  await clearCloudFolders();
  await prisma.user.deleteMany();
  await prisma.lawyer.deleteMany();
  await prisma.client.deleteMany();
  await prisma.legalQualification.deleteMany();
  await createInitialState('CRIMINAL');
  await createInitialState('AMPARO');
  await createInitialState('ADMINISTRATIVE');
}

export interface CaseFolderActors {
  lawyerId: number;
  userId: number;
  clientId: number;
  actor: { Authorization: string };
}

/** Un abogado (Ríos, Malena), un usuario de secretaría y un cliente, listos para registrar causas. */
export async function seedCaseFolderActors(): Promise<CaseFolderActors> {
  const lawyer = await createLawyer({ lastName: 'Ríos', firstName: 'Malena' });
  const user = await createUser({ roles: ['SECRETARY'] });
  const client = await createClient();
  return {
    lawyerId: lawyer.id,
    userId: user.id,
    clientId: client.id,
    actor: loginAs({ userId: user.id, roles: ['SECRETARY'] }),
  };
}

/** `POST /cases` con una causa penal válida; `overrides` pisa lo que el test necesite. */
export function registerCase(
  app: INestApplication,
  actors: CaseFolderActors,
  overrides: Record<string, unknown> = {},
) {
  return request(app.getHttpServer())
    .post(CASES_URL)
    .set(actors.actor)
    .send({
      ...aCaseBody({ clientId: actors.clientId, responsibleLawyerId: actors.lawyerId }),
      ...overrides,
    });
}

/** `POST /cases/{id}/folder`. */
export function requestFolder(
  app: INestApplication,
  actor: { Authorization: string },
  caseId: number | string,
) {
  return request(app.getHttpServer()).post(`${CASES_URL}/${caseId}/folder`).set(actor).send();
}

/** El vínculo lo escribe un suscriptor asíncrono: se espera a ver el estado en la base, sin pausas fijas. */
export async function waitForFolderStatus(caseId: number, status: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await getPrisma().case.findUnique({ where: { id: caseId }, select: { folderStatus: true } });
    if (row?.folderStatus === status) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`La causa ${caseId} no llegó a ${status}`);
}

/**
 * Un almacenamiento que delega en el de la pila de Google del momento. Se
 * registra una sola vez en la app (`overrideProvider(DOCUMENT_STORAGE)`) y cada
 * test reasigna `current` con un Google falso nuevo, sin reiniciar la app.
 */
export class SwitchableStorage implements DocumentStoragePort {
  current!: GoogleStack;

  findFolderByReference = (reference: FolderReference) => this.current.storage.findFolderByReference(reference);
  createFolder = (reference: FolderReference) => this.current.storage.createFolder(reference);
  getFolder = (folderId: string) => this.current.storage.getFolder(folderId);
  deleteFolder = (folderId: string) => this.current.storage.deleteFolder(folderId);
  uploadFile = (upload: FileUpload) => this.current.storage.uploadFile(upload);
  copyFile = (copy: FileCopy) => this.current.storage.copyFile(copy);
  deleteFile = (fileId: string) => this.current.storage.deleteFile(fileId);
  downloadFile = (fileId: string) => this.current.storage.downloadFile(fileId);
  listFiles = (folderId: string) => this.current.storage.listFiles(folderId);
  findFile = (fileId: string) => this.current.storage.findFile(fileId);
  exportFile = (fileId: string, mimeType: string) => this.current.storage.exportFile(fileId, mimeType);
  convertToPdf = (fileId: string) => this.current.storage.convertToPdf(fileId);
}
