import { Inject, Injectable } from '@nestjs/common';
import { StudioRootNotConfiguredError } from '../../domain/errors/documents.errors';
import { CLOUD_FOLDER_REPOSITORY, CloudFolderRepository } from '../../domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE, DocumentStoragePort, StoredFolder } from '../../domain/ports/document-storage.port';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { FolderName } from '../../domain/value-objects/folder-name.vo';
import { KeyedMutex } from './keyed-mutex';

/** Name of the folder, directly under the study's root, where what is given de baja goes (HU21, HU37). */
export const RECYCLE_BIN_FOLDER_NAME = 'Papelera';

/**
 * The `Papelera` folder under the study's root (`/VZ Causas/Papelera`): where
 * the folder of a case given de baja goes (HU21, D-104) and the files of a
 * formal template given de baja (HU37, D-131).
 *
 * **It is created here, the first time a baja needs it**, not by
 * `SetupCloudStorage`: a study that never gives anything de baja never gets it.
 * It is found by name under the root (the app created it, so `drive.file` sees
 * it) and has no row in `cloud_folders`.
 *
 * **One instance for the whole app, on purpose:** the lock lives here. If each
 * baja kept its own, a case and a template given de baja at the same time would
 * each find no `Papelera` and create one, and the storage would end up with two.
 */
@Injectable()
export class RecycleBin {
  private readonly lock = new KeyedMutex();

  constructor(
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
  ) {}

  /**
   * The folder, created if this is the first baja that needs it.
   *
   * @throws {StudioRootNotConfiguredError} if the study's root folder is not set up.
   * @throws {DocumentStorageUnavailableError} if the storage fails.
   */
  folder(): Promise<StoredFolder> {
    return this.lock.run(RECYCLE_BIN_FOLDER_NAME, async () => {
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

  /**
   * Moves each file to the `Papelera` (HU37, HU36, D-131, D-125): nothing is
   * deleted, and a file that is already there stays there, so it can be run
   * again. It tries **every** file even if one fails, so one bad file does not
   * leave the rest where they were, and then reports the first failure.
   *
   * @throws {StudioRootNotConfiguredError} if the study's root folder is not set up.
   * @throws {DocumentStorageUnavailableError} if the storage fails, or a file no longer exists there.
   */
  async moveFiles(fileIds: readonly string[]): Promise<void> {
    if (fileIds.length === 0) {
      return;
    }
    const bin = await this.folder();
    let firstFailure: unknown = null;
    for (const fileId of fileIds) {
      try {
        await this.storage.moveFile({ fileId, newParentId: bin.id });
      } catch (error) {
        firstFailure ??= error;
      }
    }
    if (firstFailure) {
      throw firstFailure;
    }
  }
}
