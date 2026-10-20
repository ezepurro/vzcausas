import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  DOCUMENT_SPACE_ASSIGNED,
  DocumentSpaceAssignedEvent,
} from '@subsystems/documents/core/domain/ports/events/document-space-assigned.event';
import {
  DOCUMENT_SPACE_CREATION_FAILED,
  DocumentSpaceCreationFailedEvent,
} from '@subsystems/documents/core/domain/ports/events/document-space-creation-failed.event';
import {
  CASE_FOLDER_OUTCOMES,
  CaseFolderOutcomePort,
} from '../../../core/domain/ports/case-folder-outcome.port';
import {
  CASE_FOLDER_STATE,
  CaseFolderStatePort,
} from '../../../core/domain/ports/case-folder-state.port';

/**
 * Input adapter: hears what `documents` answers about the folder of a case and
 * records it in the case. It only translates, writes and handles errors, and no
 * exception may escape.
 *
 * **It writes first and wakes the wait after**, so whoever was waiting reads the
 * folder as it really ended up. Both handlers are safe to run twice for the
 * same case.
 */
@Injectable()
export class CaseFolderOutcomeListener {
  private readonly logger = new Logger(CaseFolderOutcomeListener.name);

  constructor(
    @Inject(CASE_FOLDER_STATE) private readonly folderState: CaseFolderStatePort,
    @Inject(CASE_FOLDER_OUTCOMES) private readonly outcomes: CaseFolderOutcomePort,
  ) {}

  @OnEvent(DOCUMENT_SPACE_ASSIGNED, { async: true })
  async handleAssigned(event: DocumentSpaceAssignedEvent): Promise<void> {
    this.logger.log(`Received ${event.type} (eventId=${event.eventId}, caseId=${event.caseId})`);
    try {
      await this.folderState.markCreated(event.caseId, event.cloudFolderId);
      this.outcomes.notify(event.caseId, 'CREATED');
    } catch (error) {
      this.logger.error(
        `Could not link the folder to the case (eventId=${event.eventId}, caseId=${event.caseId}): ${String(error)}`,
      );
    }
  }

  @OnEvent(DOCUMENT_SPACE_CREATION_FAILED, { async: true })
  async handleFailed(event: DocumentSpaceCreationFailedEvent): Promise<void> {
    this.logger.warn(
      `Received ${event.type} (eventId=${event.eventId}, caseId=${event.caseId}, reason=${event.reason})`,
    );
    try {
      await this.folderState.markFailed(event.caseId);
      this.outcomes.notify(event.caseId, 'ERROR');
    } catch (error) {
      this.logger.error(
        `Could not mark the folder of the case as failed (eventId=${event.eventId}, caseId=${event.caseId}): ${String(error)}`,
      );
    }
  }
}
