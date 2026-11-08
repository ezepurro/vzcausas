import { Inject, Injectable, Logger } from '@nestjs/common';
import { CaseFolder } from '../../domain/entities/case-folder.entity';
import { StudioRootNotConfiguredError } from '../../domain/errors/documents.errors';
import {
  CLOUD_FOLDER_REPOSITORY,
  CloudFolderRepository,
} from '../../domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { FolderName } from '../../domain/value-objects/folder-name.vo';
import { FolderChain } from '../common/folder-chain';
import { KeyedMutex } from '../common/keyed-mutex';
import { SyncCaseFolderCommand, SyncCaseFolderResult } from '../common/sync-case-folder.interfaces';

/**
 * Makes the folder of a case follow the case (HU19, CA-19.9, D-104): it is
 * renamed when the caption changed and moved under the new responsible lawyer
 * when that changed, whose folders are created if missing.
 *
 * It compares what the case now asks for against what `cloud_folders` says the
 * folder is, and acts on the difference. So it is **idempotent**: repeating it,
 * or running it after a failed attempt, finishes the job without redoing it, and
 * a caption sent with the value it already had touches nothing. That is also
 * what lets the retry endpoint or the daily process reuse it.
 *
 * The folder is changed in the cloud **first**, in one call, and its row is
 * updated only once the cloud confirmed: `cloud_folders` always says where the
 * folder really is, and `folder.path` with it. If the cloud fails, the row is
 * left as it was and the error is thrown for the caller to log; it does not
 * announce anything, because `cases` reads the path from the rows.
 *
 * Changes to the same case go one at a time, in the order they arrive.
 */
@Injectable()
export class SyncCaseFolder {
  private readonly logger = new Logger(SyncCaseFolder.name);
  private readonly locks = new KeyedMutex();

  constructor(
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    private readonly chain: FolderChain,
  ) {}

  /**
   * @throws {InvalidCloudFolderError} if the caption or a label is empty once cleaned.
   * @throws {StudioRootNotConfiguredError} if the root folder for cases is missing.
   * @throws {DocumentStorageUnavailableError} if the storage fails, or the folder or its new parent no longer exists there.
   */
  execute(command: SyncCaseFolderCommand): Promise<SyncCaseFolderResult> {
    return this.locks.run(`CASE:${command.caseId}`, () => this.sync(command));
  }

  private async sync(command: SyncCaseFolderCommand): Promise<SyncCaseFolderResult> {
    const folder = await this.folders.findByKey(FolderKey.forCase(command.caseId));
    if (!(folder instanceof CaseFolder)) {
      return { outcome: 'NO_FOLDER' };
    }

    const name = FolderName.of(command.caseCaption);
    const lawyerName = FolderName.of(command.lawyer.folderLabel);
    const jurisdictionName = FolderName.of(command.jurisdiction.folderLabel);

    // The lawyer's jurisdiction folder is only needed (and only created) when the case changes lawyer.
    let parentId = folder.parentCloudFolderId;
    let lawyerId = folder.lawyerId;
    if (folder.lawyerId !== command.lawyer.id) {
      const root = await this.folders.findByKey(FolderKey.rootCases());
      if (!root) {
        throw new StudioRootNotConfiguredError();
      }
      const parent = await this.chain.ensureJurisdictionFolder(root, {
        lawyer: { id: command.lawyer.id, name: lawyerName },
        jurisdiction: { id: command.jurisdiction.id, name: jurisdictionName },
      });
      parentId = parent.cloudFolderId;
      lawyerId = command.lawyer.id;
    }

    const renames = name.toString() !== folder.name;
    const moves = parentId !== folder.parentCloudFolderId;
    if (!renames && !moves) {
      return { outcome: 'UNCHANGED' };
    }

    await this.storage.relocateFolder({
      folderId: folder.cloudFolderId,
      name: renames ? name.toString() : undefined,
      newParentId: moves ? (parentId as string) : undefined,
    });

    if (renames) {
      folder.rename(name.toString());
    }
    if (moves) {
      folder.moveUnder(parentId as string, lawyerId as number);
    }
    await this.folders.saveRelocation(folder);

    this.logger.log(
      `Folder of case ${command.caseId} ${[renames ? 'renamed' : null, moves ? 'moved' : null]
        .filter(Boolean)
        .join(' and ')}${command.causedByEventId ? ` (eventId=${command.causedByEventId})` : ''}`,
    );
    return { outcome: 'RELOCATED' };
  }
}
