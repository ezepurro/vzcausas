import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { EventPublisher } from '../../../src/shared/infrastructure/events/event-publisher.port';
import { createEventHeader } from '../../../src/shared/infrastructure/events/integration-event';
import {
  CASE_REGISTERED,
  CaseRegisteredEvent,
} from '../../../src/subsystems/cases/core/domain/ports/events/case-registered.event';
import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import {
  DOCUMENT_SPACE_ASSIGNED,
  DocumentSpaceAssignedEvent,
} from '../../../src/subsystems/documents/core/domain/ports/events/document-space-assigned.event';
import {
  DOCUMENT_SPACE_CREATION_FAILED,
  DocumentSpaceCreationFailedEvent,
} from '../../../src/subsystems/documents/core/domain/ports/events/document-space-creation-failed.event';
import { DocumentStorageUnavailableError } from '../../../src/subsystems/documents/core/domain/errors/documents.errors';
import { DocumentsModule } from '../../../src/subsystems/documents/documents.module';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { createCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createUser } from '../../shared/factories/user.factory';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

const WAIT_MS = 5000;

/*
 * HU39 · Flujo asíncrono CaseRegistered → documents → resultado.
 *
 * `cases` todavía no publica CaseRegistered ni escucha los resultados, así que
 * el spec hace sus dos papeles: publica el evento a mano por el mismo puerto
 * (`EventPublisher`) y, al recibir `DocumentSpaceAssigned`, vincula la carpeta a
 * la causa como lo hará `cases` (`cloud_folder_id` + `folder_status = CREATED`).
 * Sin ese vínculo `documents` no puede ver la carpeta de una causa; en
 * producción lo evita la compuerta de `folder_status` (ver `CaseRegisteredEvent`).
 *
 * La base es real (PostgreSQL); el único reemplazo es el storage externo, que es
 * el `InMemoryDocumentStorage` con el que ya viene el módulo mientras no exista el
 * adaptador de Drive.
 *
 * Los eventos son asíncronos: cada test registra PRIMERO la espera del evento de
 * resultado (`waitFor`) y recién después publica, así nunca depende de tiempos
 * fijos.
 */
describe('documents · CaseRegistered → espacio documental', () => {
  let app: INestApplication;
  let publisher: EventPublisher;
  let emitter: EventEmitter2;
  let storage: InMemoryDocumentStorage;
  let lawyerId: number;
  let clientId: number;
  let userId: number;
  let createdCaseIds: number[];

  /** Hace de `cases`: al recibir la carpeta, la vincula a la causa. */
  const linkFolderToCase = async (event: DocumentSpaceAssignedEvent): Promise<void> => {
    await getPrisma().case.update({
      where: { id: event.caseId },
      data: { cloudFolderId: event.cloudFolderId, folderStatus: 'CREATED' },
    });
  };

  beforeAll(async () => {
    app = await startTestApp(undefined, [DocumentsModule]);
    publisher = app.get(EventPublisher);
    emitter = app.get(EventEmitter2);
    storage = app.get(DOCUMENT_STORAGE);
  });

  afterAll(async () => {
    await cleanUp();
    await stopTestApp();
  });

  beforeEach(async () => {
    await cleanUp();
    createdCaseIds = [];
    lawyerId = (await createLawyer({ lastName: 'Ríos', firstName: 'Malena' })).id;
    userId = (await createUser({ roles: ['SECRETARY'] })).id;
    clientId = (await createClient()).id;
    emitter.on(DOCUMENT_SPACE_ASSIGNED, linkFolderToCase);

    // La estructura del estudio (MAIN y ROOT_CASES) la deja armada el script de puesta en marcha.
    const main = storage.seed('account-root', 'VZ Causas');
    const rootCases = storage.seed(main.id, 'Causas');
    const prisma = getPrisma();
    await prisma.cloudFolder.create({
      data: { cloudFolderId: main.id, kind: 'MAIN', name: 'VZ Causas', url: main.url },
    });
    await prisma.cloudFolder.create({
      data: {
        cloudFolderId: rootCases.id,
        kind: 'ROOT_CASES',
        name: 'Causas',
        url: rootCases.url,
        parentCloudFolderId: main.id,
      },
    });
  });

  afterEach(() => {
    emitter.off(DOCUMENT_SPACE_ASSIGNED, linkFolderToCase);
  });

  /**
   * Las carpetas y las causas se referencian con `Restrict`: primero se suelta
   * el vínculo de las causas, después se borran las carpetas hijas antes que
   * las padres y, al final, las causas que creó este spec.
   */
  async function cleanUp(): Promise<void> {
    const prisma = getPrisma();
    await prisma.case.updateMany({ data: { cloudFolderId: null, folderStatus: null } });
    for (const kind of ['CASE', 'JURISDICTION', 'LAWYER', 'TEMPLATES', 'ROOT_CASES', 'MAIN'] as const) {
      await prisma.cloudFolder.deleteMany({ where: { kind } });
    }
    await prisma.case.deleteMany({ where: { id: { in: createdCaseIds ?? [] } } });
  }

  async function aRegisteredCase(
    caption = 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
  ): Promise<CaseRegisteredEvent> {
    const created = await createCase({
      clientId,
      responsibleLawyerId: lawyerId,
      createdByUserId: userId,
      caption,
    });
    createdCaseIds.push(created.id);
    return {
      ...createEventHeader(CASE_REGISTERED, new Date()),
      caseId: created.id,
      caption,
      lawyer: { id: lawyerId, lastName: 'Ríos', firstName: 'Malena' },
      jurisdiction: { id: created.jurisdictionId, label: 'Penal' },
    };
  }

  /** Registra la espera ANTES de publicar y devuelve el evento de resultado. */
  function expectOutcome<T>(type: string, caseId: number): Promise<T> {
    return emitter
      .waitFor(type, {
        timeout: WAIT_MS,
        filter: (event: { caseId: number }) => event.caseId === caseId,
        handleError: false,
        Promise,
        overload: false,
      })
      .then(([event]) => event as T);
  }

  it('crea la carpeta de la causa y anuncia DocumentSpaceAssigned', async () => {
    const event = await aRegisteredCase();
    const outcome = expectOutcome<DocumentSpaceAssignedEvent>(DOCUMENT_SPACE_ASSIGNED, event.caseId);

    await publisher.publish(event);
    const assigned = await outcome;

    expect(assigned).toMatchObject({
      caseId: event.caseId,
      causedByEventId: event.eventId,
      path: 'Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    });
    const persisted = await getPrisma().cloudFolder.findUnique({
      where: { cloudFolderId: assigned.cloudFolderId },
    });
    expect(persisted).toMatchObject({ kind: 'CASE', url: assigned.url });
    expect(storage.folders.map((f) => f.name)).toEqual(
      expect.arrayContaining(['Ríos, Malena', 'Penal', 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado']),
    );
  });

  it('anuncia DocumentSpaceCreationFailed (TRANSIENT) si el storage falla, y no deja carpetas de más', async () => {
    const event = await aRegisteredCase();
    storage.failNextWith(new DocumentStorageUnavailableError('TRANSIENT', 'timeout'));
    const outcome = expectOutcome<DocumentSpaceCreationFailedEvent>(
      DOCUMENT_SPACE_CREATION_FAILED,
      event.caseId,
    );

    await publisher.publish(event);
    const failed = await outcome;

    expect(failed).toMatchObject({
      caseId: event.caseId,
      reason: 'TRANSIENT',
      causedByEventId: event.eventId,
    });
    expect(await getPrisma().cloudFolder.count({ where: { kind: 'CASE' } })).toBe(0);
  });

  it('con la carpeta ya vinculada a la causa, repetir CaseRegistered no crea otra (CA-39.7)', async () => {
    const event = await aRegisteredCase();
    const first = expectOutcome<DocumentSpaceAssignedEvent>(DOCUMENT_SPACE_ASSIGNED, event.caseId);
    await publisher.publish(event);
    const created = await first;
    await waitForLink(event.caseId);

    const second = expectOutcome<DocumentSpaceAssignedEvent>(DOCUMENT_SPACE_ASSIGNED, event.caseId);
    await publisher.publish({
      ...event,
      eventId: createEventHeader(CASE_REGISTERED, new Date()).eventId,
    });
    const repeated = await second;

    expect(repeated.cloudFolderId).toBe(created.cloudFolderId);
    expect(await getPrisma().cloudFolder.count({ where: { kind: 'CASE' } })).toBe(1);
  });

  /** El vínculo lo escribe un suscriptor asíncrono: se espera a verlo en la base, sin pausas fijas. */
  async function waitForLink(caseId: number): Promise<void> {
    const deadline = Date.now() + WAIT_MS;
    while (Date.now() < deadline) {
      const row = await getPrisma().case.findUnique({
        where: { id: caseId },
        select: { cloudFolderId: true },
      });
      if (row?.cloudFolderId) return;
      await new Promise((resolve) => setImmediate(resolve));
    }
    throw new Error(`La causa ${caseId} no quedó vinculada a su carpeta`);
  }
});
