import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { EventPublisher } from '@shared/infrastructure/events/event-publisher.port';
import { createEventHeader } from '@shared/infrastructure/events/integration-event';
import {
  CLOUD_FOLDER_REPOSITORY,
  CloudFolderRepository,
} from '../../domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';
import {
  CASE_TEMPLATES_COPIED,
  CaseTemplatesCopiedEvent,
} from '../../domain/ports/events/case-templates-copied.event';
import {
  PendingTemplateCopy,
  TEMPLATE_COPY_REPOSITORY,
  TemplateCopyCounts,
  TemplateCopyRepository,
} from '../../domain/ports/template-copy.repository';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { KeyedMutex } from '../common/keyed-mutex';

export interface CopyTemplatesToCaseFolderCommand {
  caseId: number;
  /**
   * Jurisdiction of the case. When present, the templates that apply to it are
   * asked for first (CA-40.1, CA-40.5); when absent, only the copies already
   * pending are made (a retry).
   */
  jurisdictionId?: number;
  /**
   * The case's folder, when the caller just got it from `AssureSpace`: `cases`
   * may not have linked it yet, so it cannot always be found by the case.
   */
  cloudFolderId?: string;
  /** `eventId` of the event that triggered this work; absent on a direct call. */
  causedByEventId?: string;
}

export type CopyTemplatesToCaseFolderResult = TemplateCopyCounts;

/**
 * HU40: copies into a case's cloud folder the formal templates of its
 * jurisdiction that are marked "copy to new cases". It is **triggered by**
 * `cases` (the `copyTemplates` flag of `CaseRegistered`, or
 * `CaseTemplatesCopyRequested` when it retries); registering the case does not
 * copy anything itself.
 *
 * - **Asking is separate from copying.** The copies are first registered as
 *   `PENDING`, even if the folder does not exist yet, so `cases` can show
 *   `templatesPending` when the folder failed.
 * - **Only what is missing (CA-40.7).** It copies the `PENDING` ones; a template
 *   already copied is never copied again, however many times this runs. One
 *   template failing leaves it `PENDING` and the others still go.
 * - **No repeats under concurrency.** Requests for the same case go one at a
 *   time in this process, and the repository writes `COPIED` only if the copy is
 *   still `PENDING`; whoever loses deletes the file it just made.
 * - **Each case keeps its version (CA-40.6).** `copyFile` makes an independent
 *   file as the template is at that moment.
 *
 * It announces `CaseTemplatesCopied` whenever it had a folder to work on, also
 * with templates left pending. It never throws for a storage failure: that is
 * a complementary failure (R-03) the user retries.
 */
@Injectable()
export class CopyTemplatesToCaseFolder {
  private readonly logger = new Logger(CopyTemplatesToCaseFolder.name);
  /** Orders concurrent requests for the same case inside this process. */
  private readonly locks = new KeyedMutex();

  constructor(
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(TEMPLATE_COPY_REPOSITORY) private readonly copies: TemplateCopyRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly events: EventPublisher,
  ) {}

  execute(command: CopyTemplatesToCaseFolderCommand): Promise<CopyTemplatesToCaseFolderResult> {
    return this.locks.run(`case:${command.caseId}`, () => this.copy(command));
  }

  private async copy(command: CopyTemplatesToCaseFolderCommand): Promise<CopyTemplatesToCaseFolderResult> {
    const { caseId } = command;
    if (command.jurisdictionId !== undefined) {
      await this.copies.registerPending(caseId, command.jurisdictionId);
    }

    const cloudFolderId = command.cloudFolderId ?? (await this.folders.findByKey(FolderKey.forCase(caseId)))?.cloudFolderId;
    if (!cloudFolderId) {
      // Nowhere to copy to yet: the pending copies wait for the folder.
      return this.copies.countByCase(caseId);
    }

    for (const pending of await this.copies.findPending(caseId)) {
      await this.copyOne(cloudFolderId, pending);
    }

    const counts = await this.copies.countByCase(caseId);
    await this.events.publish(this.copiedEvent(command, cloudFolderId, counts));
    return counts;
  }

  /** A failure leaves that template `PENDING` and is only logged, by ids. */
  private async copyOne(cloudFolderId: string, { copy, template }: PendingTemplateCopy): Promise<void> {
    let copyId: string | null = null;
    try {
      const stored = await this.storage.copyFile({
        fileId: template.cloudFileId,
        parentId: cloudFolderId,
        name: template.fileName,
      });
      copyId = stored.id;
      copy.markCopied(stored.id, this.clock.now());
      if (await this.copies.saveCopied(copy)) {
        return;
      }
      // Another request copied this template first: this file is a duplicate.
      await this.discardCopy(copyId);
    } catch (error) {
      this.logger.error(
        `Could not copy template ${copy.templateId} into the folder of case ${copy.caseId}: ${String(error)}`,
      );
      // The file exists but its row was not saved: do not leave it behind.
      if (copyId !== null) {
        await this.discardCopy(copyId);
      }
    }
  }

  /** Best effort: if deleting also fails, the leftover file is only logged, by its id. */
  private async discardCopy(fileId: string): Promise<void> {
    try {
      await this.storage.deleteFile(fileId);
    } catch (error) {
      this.logger.error(`Could not delete the file ${fileId} left by a copy that was not saved: ${String(error)}`);
    }
  }

  private copiedEvent(
    command: CopyTemplatesToCaseFolderCommand,
    cloudFolderId: string,
    counts: TemplateCopyCounts,
  ): CaseTemplatesCopiedEvent {
    return {
      ...createEventHeader(CASE_TEMPLATES_COPIED, this.clock.now()),
      caseId: command.caseId,
      cloudFolderId,
      copied: counts.copied,
      pending: counts.pending,
      causedByEventId: command.causedByEventId,
    };
  }
}
