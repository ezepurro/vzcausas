import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CloudFolder } from '../../domain/entities/cloud-folder.entity';
import { CloudFolderAlreadyExistsError } from '../../domain/errors/documents.errors';
import { CloudFolderData, CloudFolderFactory } from '../../domain/factories/cloud-folder.factory';
import {
  CLOUD_FOLDER_REPOSITORY,
  CloudFolderRepository,
} from '../../domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';
import { FolderKey, folderKeyToString } from '../../domain/value-objects/folder-key.vo';
import { FolderName } from '../../domain/value-objects/folder-name.vo';
import { KeyedMutex } from './keyed-mutex';

type ChainLevelData = Pick<CloudFolderData, 'kind' | 'lawyerId' | 'jurisdictionId' | 'caseId'>;

/**
 * The lawyer and the jurisdiction a case folder hangs from. The names are
 * already cleaned ({@link FolderName}), so the caller validates them before
 * anything is created.
 */
export interface FolderChainOwner {
  lawyer: { id: number; name: FolderName };
  jurisdiction: { id: number; name: FolderName };
}

/**
 * Finds or creates the folders of the chain `Causas/{lawyer}/{jurisdiction}/
 * {caption}`. Shared by `AssureSpace` (a case gets its folder, HU39) and
 * `SyncCaseFolder` (a case moves to another lawyer, HU19), so the delicate
 * part is written once: reuse what exists, adopt an orphan, undo what could
 * not be saved, and lose a race gracefully.
 *
 * **One instance for the whole module.** Its {@link KeyedMutex} is what orders
 * two requests that ask for the same folder at once; if each use case had its
 * own, a registration and a change of lawyer could both create the same lawyer
 * folder. The unique indexes of `cloud_folders` remain the last defence.
 */
@Injectable()
export class FolderChain {
  private readonly logger = new Logger(FolderChain.name);
  private readonly locks = new KeyedMutex();

  constructor(
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /**
   * The jurisdiction folder of a lawyer, below `root`, with the lawyer's folder
   * above it: both are created if missing and reused if they exist.
   *
   * @throws {DocumentStorageUnavailableError} if the storage fails.
   */
  async ensureJurisdictionFolder(root: CloudFolder, owner: FolderChainOwner): Promise<CloudFolder> {
    const lawyer = await this.ensureFolder(
      FolderKey.lawyer(owner.lawyer.id),
      root,
      owner.lawyer.name,
      true,
      { kind: 'LAWYER', lawyerId: owner.lawyer.id },
    );
    return this.ensureFolder(
      FolderKey.jurisdiction(owner.lawyer.id, owner.jurisdiction.id),
      lawyer,
      owner.jurisdiction.name,
      true,
      {
        kind: 'JURISDICTION',
        lawyerId: owner.lawyer.id,
        jurisdictionId: owner.jurisdiction.id,
      },
    );
  }

  /**
   * Returns the folder with that key, creating it under `parent` if needed.
   * `adoptOrphan` reuses a remote folder with the same name left behind by a
   * crash between creating it and saving it.
   *
   * Requests for the same key go one at a time in this process, so two cases of
   * the same lawyer and jurisdiction do not both create the shared folder.
   */
  ensureFolder(
    key: FolderKey,
    parent: CloudFolder,
    name: FolderName,
    adoptOrphan: boolean,
    data: ChainLevelData,
  ): Promise<CloudFolder> {
    return this.locks.run(folderKeyToString(key), async () => {
      const existing = await this.folders.findByKey(key);
      if (existing) {
        return existing;
      }

      const reference = { parentId: parent.cloudFolderId, name: name.toString() };
      const adopted = adoptOrphan ? await this.storage.findFolderByReference(reference) : null;
      const stored = adopted ?? (await this.storage.createFolder(reference));
      // Only a folder created here may be deleted again; an adopted one was not ours to undo.
      const createdHere = adopted === null;

      const folder = CloudFolderFactory.create({
        ...data,
        cloudFolderId: stored.id,
        url: stored.url,
        name: reference.name,
        parentCloudFolderId: parent.cloudFolderId,
        createdAt: this.clock.now(),
      });

      try {
        await this.folders.save(folder);
        return folder;
      } catch (error) {
        if (createdHere) {
          await this.discardCreatedFolder(stored.id);
        }
        // Another instance saved the same key first: use the winner's folder.
        if (error instanceof CloudFolderAlreadyExistsError) {
          const winner = await this.folders.findByKey(key);
          if (winner) {
            return winner;
          }
        }
        throw error;
      }
    });
  }

  /** Best effort: if deleting also fails, the leftover folder is only logged, by its id. */
  private async discardCreatedFolder(cloudFolderId: string): Promise<void> {
    try {
      await this.storage.deleteFolder(cloudFolderId);
    } catch (error) {
      this.logger.error(
        `Could not delete the folder ${cloudFolderId} created for a row that was not saved: ${String(error)}`,
      );
    }
  }
}
