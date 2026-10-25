import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CASE_TEMPLATES_COPY_REQUESTED,
  CaseTemplatesCopyRequestedEvent,
} from '@subsystems/cases/core/domain/ports/events/case-templates-copy-requested.event';
import { CopyTemplatesToCaseFolder } from '../../../core/application/use-cases/copy-templates-to-case-folder.use-case';

/**
 * Input adapter: reacts to `CaseTemplatesCopyRequested`, which `cases` publishes
 * to retry the copy on a folder that already exists (HU40, CA-40.7). It asks
 * {@link CopyTemplatesToCaseFolder} for the pending copies only (no
 * jurisdiction: nothing new is asked for) and lets no exception escape.
 */
@Injectable()
export class CaseTemplatesCopyRequestedListener {
  private readonly logger = new Logger(CaseTemplatesCopyRequestedListener.name);

  constructor(private readonly copyTemplates: CopyTemplatesToCaseFolder) {}

  @OnEvent(CASE_TEMPLATES_COPY_REQUESTED, { async: true })
  async handle(event: CaseTemplatesCopyRequestedEvent): Promise<void> {
    this.logger.log(`Received ${event.type} (eventId=${event.eventId}, caseId=${event.caseId})`);
    try {
      await this.copyTemplates.execute({ caseId: event.caseId, causedByEventId: event.eventId });
    } catch (error) {
      this.logger.error(
        `Could not copy the templates (eventId=${event.eventId}, caseId=${event.caseId}): ${String(error)}`,
      );
    }
  }
}
