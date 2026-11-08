import { ClockPort } from '@shared/domain/clock.port';
import { CaseModifiedEvent, CASE_MODIFIED } from '@subsystems/cases/core/domain/ports/events/case-modified.event';
import { CaseRegisteredEvent, CASE_REGISTERED } from '@subsystems/cases/core/domain/ports/events/case-registered.event';
import { AssureSpaceCommand } from '../application/common/assure-space.interfaces';
import { FolderChain } from '../application/common/folder-chain';
import { AssureSpace } from '../application/use-cases/assure-space.use-case';
import { SetupCloudStorage } from '../application/use-cases/setup-cloud-storage.use-case';
import { CloudFolderFactory } from '../domain/factories/cloud-folder.factory';
import { FakeDocumentTemplateRepository } from './fake-document-template.repository';
import { FakeEventPublisher } from './fake-event-publisher';
import { InMemoryCloudFolderRepository } from '../../infrastructure/persistence/in-memory/in-memory-cloud-folder.repository';
import { InMemoryDocumentStorage } from '../../infrastructure/storage/in-memory/in-memory-document-storage';

export const NOW = new Date('2026-10-17T12:00:00.000Z');

export class FakeClock implements ClockPort {
  now(): Date {
    return NOW;
  }

  today(): Date {
    return new Date('2026-10-17T00:00:00.000Z');
  }
}

export function aCommand(overrides: Partial<AssureSpaceCommand> = {}): AssureSpaceCommand {
  return {
    caseId: 10,
    caseCaption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    lawyer: { id: 3, folderLabel: 'Ríos, Malena' },
    jurisdiction: { id: 1, folderLabel: 'Penal' },
    ...overrides,
  };
}

/** The study's configured structure: MAIN and ROOT_CASES in both the storage and the repository. */
export async function aSetUpStudio(): Promise<{
  folders: InMemoryCloudFolderRepository;
  storage: InMemoryDocumentStorage;
  events: FakeEventPublisher;
  assureSpace: AssureSpace;
  rootCasesId: string;
}> {
  const folders = new InMemoryCloudFolderRepository();
  const storage = new InMemoryDocumentStorage();
  const events = new FakeEventPublisher();

  const main = storage.seed('account-root', 'VZ Causas');
  const rootCases = storage.seed(main.id, 'Causas');
  await folders.save(
    CloudFolderFactory.create({
      kind: 'MAIN',
      cloudFolderId: main.id,
      name: 'VZ Causas',
      url: main.url,
      parentCloudFolderId: null,
      createdAt: NOW,
    }),
  );
  await folders.save(
    CloudFolderFactory.create({
      kind: 'ROOT_CASES',
      cloudFolderId: rootCases.id,
      name: 'Causas',
      url: rootCases.url,
      parentCloudFolderId: main.id,
      createdAt: NOW,
    }),
  );
  folders.saveCount = 0;
  storage.calls.length = 0;

  return {
    folders,
    storage,
    events,
    assureSpace: new AssureSpace(
      folders,
      new FakeClock(),
      events,
      new SetupCloudStorage(folders, storage, new FakeClock(), new FakeDocumentTemplateRepository()),
      new FolderChain(folders, storage, new FakeClock()),
    ),
    rootCasesId: rootCases.id,
  };
}

export function aCaseRegisteredEvent(
  overrides: Partial<CaseRegisteredEvent> = {},
): CaseRegisteredEvent {
  return {
    type: CASE_REGISTERED,
    eventId: 'evt-case-registered-1',
    occurredAt: NOW.toISOString(),
    caseId: 10,
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    lawyer: { id: 3, lastName: 'Ríos', firstName: 'Malena' },
    jurisdiction: { id: 1, label: 'Penal' },
    copyTemplates: false,
    ...overrides,
  };
}

export function aCaseModifiedEvent(overrides: Partial<CaseModifiedEvent> = {}): CaseModifiedEvent {
  return {
    type: CASE_MODIFIED,
    eventId: 'evt-case-modified-1',
    occurredAt: NOW.toISOString(),
    caseId: 10,
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    lawyer: { id: 3, lastName: 'Ríos', firstName: 'Malena' },
    jurisdiction: { id: 1, label: 'Penal' },
    changed: ['caption'],
    ...overrides,
  };
}
