import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CASE_REGISTERED,
  CaseRegisteredEvent,
} from '@subsystems/cases/core/domain/ports/events/case-registered.event';
import { AssureSpaceResult } from '../../../core/application/common/assure-space.interfaces';
import { AssureSpace } from '../../../core/application/use-cases/assure-space.use-case';
import { CopyTemplatesToCaseFolder } from '../../../core/application/use-cases/copy-templates-to-case-folder.use-case';

/**
 * Input adapter: reacts to `CaseRegistered` by asking {@link AssureSpace} for
 * the case's cloud folder and, when the event asks for it (`copyTemplates`,
 * HU40), {@link CopyTemplatesToCaseFolder} for the templates of its
 * jurisdiction. It only translates, invokes and handles errors; each use case
 * announces its own outcome, and no exception may escape (a listener failure is
 * easily swallowed silently or could affect the process).
 *
 * The templates are asked for **even if the folder failed**: the copies stay
 * `PENDING` so `cases` can report them and a retry completes them.
 */
@Injectable()
export class CaseRegisteredListener {
  private readonly logger = new Logger(CaseRegisteredListener.name);

  constructor(
    private readonly assureSpace: AssureSpace,
    private readonly copyTemplates: CopyTemplatesToCaseFolder,
  ) {}

  @OnEvent(CASE_REGISTERED, { async: true })
  async handle(event: CaseRegisteredEvent): Promise<void> {
    this.logger.log(`Received ${event.type} (eventId=${event.eventId}, caseId=${event.caseId})`);
    // Ask for the templates BEFORE the folder: if the folder fails, `cases` hears it
    // and answers right away, so the pending copies must already be written.
    if (event.copyTemplates) {
      await this.requestTemplates(event);
    }
    const space = await this.assure(event);
    if (event.copyTemplates) {
      await this.copy(event, space);
    }
  }

  private async requestTemplates(event: CaseRegisteredEvent): Promise<void> {
    try {
      await this.copyTemplates.request({ caseId: event.caseId, jurisdictionId: event.jurisdiction.id });
    } catch (error) {
      // Not fatal: `execute` asks again below, and the folder is created either way.
      this.logger.error(
        `Could not register the pending templates (eventId=${event.eventId}, caseId=${event.caseId}): ${String(error)}`,
      );
    }
  }

  private async assure(event: CaseRegisteredEvent): Promise<AssureSpaceResult | null> {
    try {
      return await this.assureSpace.execute({
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
        `Could not assign a document space (eventId=${event.eventId}, caseId=${event.caseId}): ${String(error)}`,
      );
      return null;
    }
  }

  private async copy(event: CaseRegisteredEvent, space: AssureSpaceResult | null): Promise<void> {
    try {
      await this.copyTemplates.execute({
        caseId: event.caseId,
        jurisdictionId: event.jurisdiction.id,
        cloudFolderId: space?.cloudFolderId,
        causedByEventId: event.eventId,
      });
    } catch (error) {
      this.logger.error(
        `Could not copy the templates (eventId=${event.eventId}, caseId=${event.caseId}): ${String(error)}`,
      );
    }
  }
}
