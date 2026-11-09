import { Inject, Injectable, Logger } from '@nestjs/common';
import { StudioRootNotConfiguredError } from '../../domain/errors/documents.errors';
import {
  CLOUD_FOLDER_REPOSITORY,
  CloudFolderRepository,
} from '../../domain/ports/cloud-folder.repository';
import {
  DOCUMENT_STORAGE,
  DocumentStoragePort,
  StoredFolder,
} from '../../domain/ports/document-storage.port';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { FolderName } from '../../domain/value-objects/folder-name.vo';
import { KeyedMutex } from '../common/keyed-mutex';

/** Name of the folder, directly under the study's root, where the folders of cases given de baja go (HU21). */
export const RECYCLE_BIN_FOLDER_NAME = 'Papelera';

export interface RecycleCaseFolderCommand {
  caseId: number;
  /** `eventId` of the event that triggered this work; absent when invoked directly. */
  causedByEventId?: string;
}

/**
 * How it ended. `NO_FOLDER`: the case has no folder in the cloud, so there is
 * nothing to move. `MOVED`: the folder is now in the `Papelera` folder.
 */
export interface RecycleCaseFolderResult {
  outcome: 'NO_FOLDER' | 'MOVED';
}

/**
 * Moves the folder of a case given de baja to the `Papelera` folder, directly
 * under the study's root (`/VZ Causas/Papelera`), with what is inside it (HU21,
 * D-104 revised). It replaces "the folder is not touched" (CA-21.8).
 *
 * **Why a move and not Drive's own trash.** With the `drive.file` scope the app
 * may only change what it created, and trashing a folder needs permission over
 * every file inside it: Drive answers `403 appNotAuthorizedToChild` as soon as
 * a person uploaded something by hand. Moving touches only the folder itself,
 * so it always works. It also keeps the documents for good (RN9): Drive's trash
 * empties itself after about 30 days. A baja given by mistake is undone by
 * moving the folder back by hand.
 *
 * **`Papelera` is created here, the first time a baja needs it**, not by
 * `SetupCloudStorage`: a study that never gives a case de baja never gets it.
 * It is found by name under the root (the app created it, so `drive.file` sees
 * it) and has no row in `cloud_folders`.
 *
 * **The row of the case's folder is not touched.** It stays as it was: it is
 * still the case's reference to its folder (`cases.cloud_folder_id`, RN12), and
 * nobody reads where a case given de baja is, because for the client it no
 * longer exists (D-97).
 *
 * Idempotent in the cloud: moving a folder that is already in `Papelera` leaves
 * it there. Two bajas at once do not create two `Papelera` folders in this
 * process; the case's own moves go one at a time per case.
 */
@Injectable()
export class RecycleCaseFolder {
  private readonly logger = new Logger(RecycleCaseFolder.name);
  private readonly caseLocks = new KeyedMutex();
  private readonly binLock = new KeyedMutex();

  constructor(
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
  ) {}

  /**
   * @throws {StudioRootNotConfiguredError} if the study's root folder is not set up.
   * @throws {DocumentStorageUnavailableError} if the storage fails, or the folder no longer exists there.
   */
  execute(command: RecycleCaseFolderCommand): Promise<RecycleCaseFolderResult> {
    return this.caseLocks.run(`CASE:${command.caseId}`, () => this.recycle(command));
  }

  private async recycle(command: RecycleCaseFolderCommand): Promise<RecycleCaseFolderResult> {
    const folder = await this.folders.findByKey(FolderKey.forCase(command.caseId));
    if (!folder) {
      return { outcome: 'NO_FOLDER' };
    }

    const bin = await this.findOrCreateBin();
    await this.storage.relocateFolder({ folderId: folder.cloudFolderId, newParentId: bin.id });

    this.logger.log(
      `Folder of case ${command.caseId} moved to ${RECYCLE_BIN_FOLDER_NAME}${command.causedByEventId ? ` (eventId=${command.causedByEventId})` : ''}`,
    );
    return { outcome: 'MOVED' };
  }

  /** The `Papelera` folder under the root, created if this is the first baja that needs it. */
  private findOrCreateBin(): Promise<StoredFolder> {
    return this.binLock.run(RECYCLE_BIN_FOLDER_NAME, async () => {
      const root = await this.folders.findByKey(FolderKey.main());
      if (!root) {
        throw new StudioRootNotConfiguredError();
      }
      const reference = {
        parentId: root.cloudFolderId,
        name: FolderName.of(RECYCLE_BIN_FOLDER_NAME).toString(),
      };
      return (await this.storage.findFolderByReference(reference)) ?? (await this.storage.createFolder(reference));
    });
  }
}
