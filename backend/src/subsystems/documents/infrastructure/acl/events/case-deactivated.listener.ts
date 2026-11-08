import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CASE_DEACTIVATED,
  CaseDeactivatedEvent,
} from '@subsystems/cases/core/domain/ports/events/case-deactivated.event';
import { RecycleCaseFolder } from '../../../core/application/use-cases/recycle-case-folder.use-case';

/**
 * Input adapter: reacts to `CaseDeactivated` by asking {@link RecycleCaseFolder}
 * to move the case's folder to the `Papelera` folder (HU21, D-104 revised). It only
 * translates, invokes and handles errors. **No exception escapes**: the baja
 * is already saved, so a Drive failure is only logged and the folder stays
 * where it was.
 */
@Injectable()
export class CaseDeactivatedListener {
  private readonly logger = new Logger(CaseDeactivatedListener.name);

  constructor(private readonly recycleCaseFolder: RecycleCaseFolder) {}

  @OnEvent(CASE_DEACTIVATED, { async: true })
  async handle(event: CaseDeactivatedEvent): Promise<void> {
    this.logger.log(`Received ${event.type} (eventId=${event.eventId}, caseId=${event.caseId})`);
    try {
      await this.recycleCaseFolder.execute({ caseId: event.caseId, causedByEventId: event.eventId });
    } catch (error) {
      this.logger.error(
        `Could not move the folder of the case to the Papelera (eventId=${event.eventId}, caseId=${event.caseId}): ${String(error)}`,
      );
    }
  }
}
