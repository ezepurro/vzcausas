import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CLOUD_FOLDER_REPOSITORY,
  CloudFolderRepository,
} from '../../domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { FolderName } from '../../domain/value-objects/folder-name.vo';
import { KeyedMutex } from '../common/keyed-mutex';

export interface RenameLawyerFolderCommand {
  lawyerId: number;
  /** The lawyer's name as the folder shows it: `Apellido, Nombres`. */
  folderLabel: string;
  /** `eventId` of the event that triggered this work; absent when invoked directly. */
  causedByEventId?: string;
}

/**
 * How it ended. `NO_FOLDER`: the lawyer has no folder yet (no case of theirs
 * has had one), so there is nothing to rename. `UNCHANGED`: the folder already
 * had that name. `RENAMED`: it took the new name.
 */
export interface RenameLawyerFolderResult {
  outcome: 'NO_FOLDER' | 'UNCHANGED' | 'RENAMED';
}

/**
 * Renames the folder of a lawyer when their name changed (HU14, CA-14.12,
 * D-104): `Causas/{Apellido, Nombres}`. The folders of their cases stay inside
 * it, and a case's `folder.path` follows because it is built from the chain of
 * parents.
 *
 * It compares the name asked for against the one `cloud_folders` has and acts
 * on the difference, so it is **idempotent** and a retry finishes what a failed
 * attempt left. The folder is renamed in the cloud **first**, and its row is
 * updated only once the cloud confirmed (same rule as {@link SyncCaseFolder}):
 * the row always says what the folder is really called.
 *
 * Changes to the same lawyer go one at a time, in the order they arrive.
 */
@Injectable()
export class RenameLawyerFolder {
  private readonly logger = new Logger(RenameLawyerFolder.name);
  private readonly locks = new KeyedMutex();

  constructor(
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
  ) {}

  /**
   * @throws {InvalidCloudFolderError} if the name is empty once cleaned.
   * @throws {DocumentStorageUnavailableError} if the storage fails, or the folder no longer exists there.
   */
  execute(command: RenameLawyerFolderCommand): Promise<RenameLawyerFolderResult> {
    return this.locks.run(`LAWYER:${command.lawyerId}`, () => this.rename(command));
  }

  private async rename(command: RenameLawyerFolderCommand): Promise<RenameLawyerFolderResult> {
    const folder = await this.folders.findByKey(FolderKey.lawyer(command.lawyerId));
    if (!folder) {
      return { outcome: 'NO_FOLDER' };
    }

    const name = FolderName.of(command.folderLabel);
    if (name.toString() === folder.name) {
      return { outcome: 'UNCHANGED' };
    }

    await this.storage.relocateFolder({ folderId: folder.cloudFolderId, name: name.toString() });

    folder.rename(name.toString());
    await this.folders.saveRelocation(folder);

    this.logger.log(
      `Folder of lawyer ${command.lawyerId} renamed${command.causedByEventId ? ` (eventId=${command.causedByEventId})` : ''}`,
    );
    return { outcome: 'RENAMED' };
  }
}
