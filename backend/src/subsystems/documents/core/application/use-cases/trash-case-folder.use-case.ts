import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CLOUD_FOLDER_REPOSITORY,
  CloudFolderRepository,
} from '../../domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { KeyedMutex } from '../common/keyed-mutex';

export interface TrashCaseFolderCommand {
  caseId: number;
  /** `eventId` of the event that triggered this work; absent when invoked directly. */
  causedByEventId?: string;
}

/**
 * How it ended. `NO_FOLDER`: the case has no folder in the cloud, so there is
 * nothing to trash. `TRASHED`: the folder went to the provider's trash.
 */
export interface TrashCaseFolderResult {
  outcome: 'NO_FOLDER' | 'TRASHED';
}

/**
 * Sends the folder of a case that was given de baja to the cloud's trash, with
 * what is inside it (HU21, D-104 revised). It replaces "the folder is not
 * touched" (CA-21.8).
 *
 * The folder is **not deleted for good**: the provider keeps it in the trash
 * for a while and a person can restore it by hand, so a baja given by mistake
 * does not lose the study's documents at once.
 *
 * The row of `cloud_folders` is **kept**: it is the case's reference to its
 * folder (`cases.cloud_folder_id`), and the case itself is kept (RN12). Only
 * the provider changes. The folder is found by the case's link, which a baja
 * does not remove.
 *
 * Idempotent: trashing a folder that is already in the trash, or gone, is not
 * an error, so repeating it after a failed attempt just finishes the job.
 */
@Injectable()
export class TrashCaseFolder {
  private readonly logger = new Logger(TrashCaseFolder.name);
  private readonly locks = new KeyedMutex();

  constructor(
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
  ) {}

  /**
   * @throws {DocumentStorageUnavailableError} if the storage fails.
   */
  execute(command: TrashCaseFolderCommand): Promise<TrashCaseFolderResult> {
    return this.locks.run(`CASE:${command.caseId}`, () => this.trash(command));
  }

  private async trash(command: TrashCaseFolderCommand): Promise<TrashCaseFolderResult> {
    const folder = await this.folders.findByKey(FolderKey.forCase(command.caseId));
    if (!folder) {
      return { outcome: 'NO_FOLDER' };
    }

    await this.storage.trashFolder(folder.cloudFolderId);

    this.logger.log(
      `Folder of case ${command.caseId} sent to the trash${command.causedByEventId ? ` (eventId=${command.causedByEventId})` : ''}`,
    );
    return { outcome: 'TRASHED' };
  }
}
