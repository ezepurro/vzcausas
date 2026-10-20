import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CASE_REGISTERED,
  CaseRegisteredEvent,
} from '@subsystems/cases/core/domain/ports/events/case-registered.event';
import { AssureSpace } from '../../../core/application/use-cases/assure-space.use-case';

/**
 * Input adapter: reacts to `CaseRegistered` by asking {@link AssureSpace} for
 * the case's cloud folder. It only translates, invokes and handles errors; the
 * outcome is announced by the use case, and no exception may escape (a
 * listener failure is easily swallowed silently or could affect the process).
 */
@Injectable()
export class CaseRegisteredListener {
  private readonly logger = new Logger(CaseRegisteredListener.name);

  constructor(private readonly assureSpace: AssureSpace) {}

  @OnEvent(CASE_REGISTERED, { async: true })
  async handle(event: CaseRegisteredEvent): Promise<void> {
    this.logger.log(`Received ${event.type} (eventId=${event.eventId}, caseId=${event.caseId})`);
    try {
      await this.assureSpace.execute({
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
    }
  }
}
