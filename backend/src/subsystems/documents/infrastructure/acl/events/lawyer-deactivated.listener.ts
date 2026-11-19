import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  LAWYER_DEACTIVATED,
  LawyerDeactivatedEvent,
} from '@subsystems/people/core/domain/ports/events/lawyer-deactivated.event';
import { RecycleLawyerFolder } from '../../../core/application/use-cases/recycle-lawyer-folder.use-case';

/**
 * Input adapter: reacts to `LawyerDeactivated` by asking {@link RecycleLawyerFolder} to move the lawyer's
 * folder to the `Papelera` folder, unless they keep cases in a terminal state (HU15, D-132). It only
 * translates, invokes and handles errors. **No exception escapes**: the baja is already saved, so a Drive
 * failure is only logged and the folder stays where it was.
 */
@Injectable()
export class LawyerDeactivatedListener {
  private readonly logger = new Logger(LawyerDeactivatedListener.name);

  constructor(private readonly recycleLawyerFolder: RecycleLawyerFolder) {}

  @OnEvent(LAWYER_DEACTIVATED, { async: true })
  async handle(event: LawyerDeactivatedEvent): Promise<void> {
    this.logger.log(`Received ${event.type} (eventId=${event.eventId}, lawyerId=${event.lawyerId})`);
    try {
      await this.recycleLawyerFolder.execute({
        lawyerId: event.lawyerId,
        keepsHistory: event.keepsHistory,
        causedByEventId: event.eventId,
      });
    } catch (error) {
      this.logger.error(
        `Could not move the folder of the lawyer to the Papelera (eventId=${event.eventId}, lawyerId=${event.lawyerId}): ${String(error)}`,
      );
    }
  }
}
