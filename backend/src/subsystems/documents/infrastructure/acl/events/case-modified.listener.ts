import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CASE_MODIFIED,
  CaseModifiedEvent,
} from '@subsystems/cases/core/domain/ports/events/case-modified.event';
import { SyncCaseFolder } from '../../../core/application/use-cases/sync-case-folder.use-case';

/**
 * Input adapter: reacts to `CaseModified` by asking {@link SyncCaseFolder} to
 * rename or move the case's folder (HU19, D-104). It only translates, invokes
 * and handles errors. **No exception escapes**: the case is already saved, so
 * a Drive failure is only logged (CA-19.10) and the folder is corrected later.
 */
@Injectable()
export class CaseModifiedListener {
  private readonly logger = new Logger(CaseModifiedListener.name);

  constructor(private readonly syncCaseFolder: SyncCaseFolder) {}

  @OnEvent(CASE_MODIFIED, { async: true })
  async handle(event: CaseModifiedEvent): Promise<void> {
    this.logger.log(`Received ${event.type} (eventId=${event.eventId}, caseId=${event.caseId})`);
    try {
      await this.syncCaseFolder.execute({
        caseId: event.caseId,
        caseCaption: event.caption,
        lawyer: {
          id: event.lawyer.id,
          folderLabel: `${event.lawyer.lastName}, ${event.lawyer.firstName}`,
        },
        jurisdiction: { id: event.jurisdiction.id, folderLabel: event.jurisdiction.label },
        causedByEventId: event.eventId,
      });
    } catch (error) {
      this.logger.error(
        `Could not update the folder of the case (eventId=${event.eventId}, caseId=${event.caseId}): ${String(error)}`,
      );
    }
  }
}
