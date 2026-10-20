import { Logger } from '@nestjs/common';
import { DOCUMENT_SPACE_ASSIGNED, DocumentSpaceAssignedEvent } from '@subsystems/documents/core/domain/ports/events/document-space-assigned.event';
import {
  DOCUMENT_SPACE_CREATION_FAILED,
  DocumentSpaceCreationFailedEvent,
} from '@subsystems/documents/core/domain/ports/events/document-space-creation-failed.event';
import { FakeCaseFolderState } from '../../../core/test-support/case-folder-fakes';
import { InMemoryCaseFolderOutcomes } from '../../events/in-memory-case-folder-outcomes';
import { CaseFolderOutcomeListener } from './case-folder-outcome.listener';

const assigned = (caseId = 10): DocumentSpaceAssignedEvent => ({
  type: DOCUMENT_SPACE_ASSIGNED,
  eventId: 'evt-assigned',
  occurredAt: '2026-10-19T12:00:00.000Z',
  caseId,
  cloudFolderId: 'drive-folder-1',
  url: 'https://drive.google.com/drive/folders/drive-folder-1',
  path: 'Causas/Ríos, Malena/Penal/GÓMEZ',
});

const failed = (caseId = 10): DocumentSpaceCreationFailedEvent => ({
  type: DOCUMENT_SPACE_CREATION_FAILED,
  eventId: 'evt-failed',
  occurredAt: '2026-10-19T12:00:00.000Z',
  caseId,
  reason: 'TRANSIENT',
  detail: 'timeout',
});

describe('CaseFolderOutcomeListener', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  function build() {
    const folderState = new FakeCaseFolderState();
    const outcomes = new InMemoryCaseFolderOutcomes();
    return { folderState, outcomes, listener: new CaseFolderOutcomeListener(folderState, outcomes) };
  }

  it('DocumentSpaceAssigned vincula la carpeta a la causa y la deja CREATED', async () => {
    const { listener, folderState } = build();
    folderState.set(10, 'CREATING');

    await listener.handleAssigned(assigned());

    expect(folderState.statusOf(10)).toBe('CREATED');
    expect(folderState.cloudFolderIdOf(10)).toBe('drive-folder-1');
  });

  it('despierta al pedido que espera, y recién después de guardar', async () => {
    const { listener, folderState, outcomes } = build();
    folderState.set(10, 'CREATING');
    const seenWhenWoken: Array<string | null> = [];
    const waiting = outcomes.expect(10, 1000).then((outcome) => {
      seenWhenWoken.push(folderState.statusOf(10));
      return outcome;
    });

    await listener.handleAssigned(assigned());

    await expect(waiting).resolves.toBe('CREATED');
    expect(seenWhenWoken).toEqual(['CREATED']);
  });

  it('DocumentSpaceCreationFailed deja la causa en ERROR y despierta al pedido', async () => {
    const { listener, folderState, outcomes } = build();
    folderState.set(10, 'CREATING');
    const waiting = outcomes.expect(10, 1000);

    await listener.handleFailed(failed());

    expect(folderState.statusOf(10)).toBe('ERROR');
    await expect(waiting).resolves.toBe('ERROR');
  });

  it('una falla tardía no deshace una carpeta que ya está CREATED', async () => {
    const { listener, folderState } = build();
    folderState.set(10, 'CREATED');

    await listener.handleFailed(failed());

    expect(folderState.statusOf(10)).toBe('CREATED');
  });

  it('es idempotente: recibir dos veces el mismo resultado deja lo mismo', async () => {
    const { listener, folderState } = build();
    folderState.set(10, 'CREATING');

    await listener.handleAssigned(assigned());
    await listener.handleAssigned(assigned());

    expect(folderState.statusOf(10)).toBe('CREATED');
    expect(folderState.cloudFolderIdOf(10)).toBe('drive-folder-1');
  });

  it('no deja escapar un error al guardar y lo registra con los ids', async () => {
    const { listener, folderState } = build();
    jest.spyOn(folderState, 'markCreated').mockRejectedValue(new Error('db down'));

    await expect(listener.handleAssigned(assigned(42))).resolves.toBeUndefined();

    expect(Logger.prototype.error).toHaveBeenCalledWith(
      expect.stringContaining('eventId=evt-assigned, caseId=42'),
    );
  });

  it('si no se pudo guardar, no despierta al pedido con un resultado que no quedó escrito', async () => {
    jest.useFakeTimers();
    const { listener, folderState, outcomes } = build();
    jest.spyOn(folderState, 'markCreated').mockRejectedValue(new Error('db down'));
    const waiting = outcomes.expect(10, 100);

    await listener.handleAssigned(assigned());
    jest.advanceTimersByTime(100);

    await expect(waiting).resolves.toBe('TIMEOUT');
    jest.useRealTimers();
  });
});
