import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CLOUD_FOLDER_REPOSITORY,
  CloudFolderRepository,
} from '../../domain/ports/cloud-folder.repository';
import {
  DOCUMENT_STORAGE,
  DocumentStoragePort,
} from '../../domain/ports/document-storage.port';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { KeyedMutex } from '../common/keyed-mutex';
import { RECYCLE_BIN_FOLDER_NAME, RecycleBin } from '../common/recycle-bin';

export interface RecycleLawyerFolderCommand {
  lawyerId: number;
  /**
   * The lawyer still has cases in a terminal state (D-143): their folder stays, with them inside, as
   * their history. Decided by `people` from `cases` when the baja is written: reading it here, from the
   * folders, would depend on the order in which the folders of the reassigned cases move.
   */
  keepsHistory: boolean;
  /** `eventId` of the event that triggered this work; absent when invoked directly. */
  causedByEventId?: string;
}

/**
 * How it ended. `KEPT_AS_HISTORY`: the lawyer keeps cases in a terminal state, so the folder stays.
 * `NO_FOLDER`: the lawyer has no folder, so there is nothing to move. `MOVED`: the folder is now in `Papelera`.
 */
export interface RecycleLawyerFolderResult {
  outcome: 'KEPT_AS_HISTORY' | 'NO_FOLDER' | 'MOVED';
}

/**
 * Moves the folder of a lawyer given de baja to the `Papelera` folder, directly under the study's root
 * (`/VZ Causas/Papelera`), with what is inside it, unless the lawyer keeps cases in a terminal state
 * (HU15, D-132). **Nothing is deleted**: what is left in it may be information that matters.
 *
 * The folders of the lawyer's active cases do **not** depend on this: each one is moved by its own id to
 * its new lawyer, or to `Sin asignar`, by {@link SyncCaseFolder} (D-143). They run at the same time and in
 * no fixed order, and it does not matter: a case folder lands in its place wherever the old lawyer's
 * folder already is.
 *
 * **The rows of the lawyer's folders are not touched.** `Papelera` has no row in `cloud_folders` (it is
 * found by name), so the row of the lawyer's folder cannot point to it: it stays as it was, a record of
 * a lawyer who no longer exists for the client (RN12), as the row of a case given de baja does
 * ({@link RecycleCaseFolder}). Nobody reads where it is.
 *
 * Idempotent in the cloud: moving a folder that is already in `Papelera` leaves it there.
 *
 * Not done here, because it needs the daily process of `documents`, which does not exist yet (D-132): the
 * case folders of other lawyers that someone dragged by hand into this one are not moved back to theirs.
 */
@Injectable()
export class RecycleLawyerFolder {
  private readonly logger = new Logger(RecycleLawyerFolder.name);
  private readonly lawyerLocks = new KeyedMutex();

  constructor(
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    private readonly bin: RecycleBin,
  ) {}

  /**
   * @throws {StudioRootNotConfiguredError} if the study's root folder is not set up.
   * @throws {DocumentStorageUnavailableError} if the storage fails, or the folder no longer exists there.
   */
  execute(command: RecycleLawyerFolderCommand): Promise<RecycleLawyerFolderResult> {
    return this.lawyerLocks.run(`LAWYER:${command.lawyerId}`, () => this.recycle(command));
  }

  private async recycle(command: RecycleLawyerFolderCommand): Promise<RecycleLawyerFolderResult> {
    if (command.keepsHistory) {
      return { outcome: 'KEPT_AS_HISTORY' };
    }

    const folder = await this.folders.findByKey(FolderKey.lawyer(command.lawyerId));
    if (!folder) {
      return { outcome: 'NO_FOLDER' };
    }

    const bin = await this.bin.folder();
    await this.storage.relocateFolder({ folderId: folder.cloudFolderId, newParentId: bin.id });

    this.logger.log(
      `Folder of lawyer ${command.lawyerId} moved to ${RECYCLE_BIN_FOLDER_NAME}${command.causedByEventId ? ` (eventId=${command.causedByEventId})` : ''}`,
    );
    return { outcome: 'MOVED' };
  }
}
