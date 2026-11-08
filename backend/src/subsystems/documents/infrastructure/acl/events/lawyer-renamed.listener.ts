import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  LAWYER_RENAMED,
  LawyerRenamedEvent,
} from '@subsystems/people/core/domain/ports/events/lawyer-renamed.event';
import { RenameLawyerFolder } from '../../../core/application/use-cases/rename-lawyer-folder.use-case';

/**
 * Input adapter: reacts to `LawyerRenamed` by asking {@link RenameLawyerFolder}
 * to rename the lawyer's folder (HU14, CA-14.12, D-104). It only translates,
 * invokes and handles errors. **No exception escapes**: the lawyer is already
 * saved, so a Drive failure is only logged (CA-14.13) and the folder is
 * corrected later.
 */
@Injectable()
export class LawyerRenamedListener {
  private readonly logger = new Logger(LawyerRenamedListener.name);

  constructor(private readonly renameLawyerFolder: RenameLawyerFolder) {}

  @OnEvent(LAWYER_RENAMED, { async: true })
  async handle(event: LawyerRenamedEvent): Promise<void> {
    this.logger.log(`Received ${event.type} (eventId=${event.eventId}, lawyerId=${event.lawyerId})`);
    try {
      await this.renameLawyerFolder.execute({
        lawyerId: event.lawyerId,
        folderLabel: `${event.lastName}, ${event.firstName}`,
        causedByEventId: event.eventId,
      });
    } catch (error) {
      this.logger.error(
        `Could not rename the folder of the lawyer (eventId=${event.eventId}, lawyerId=${event.lawyerId}): ${String(error)}`,
      );
    }
  }
}
