import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CloudFolder } from '../../domain/entities/cloud-folder.entity';
import { MainFolder } from '../../domain/entities/main-folder.entity';
import {
  CloudFolderAlreadyExistsError,
  StudioRootNotConfiguredError,
} from '../../domain/errors/documents.errors';
import { CloudFolderData, CloudFolderFactory } from '../../domain/factories/cloud-folder.factory';
import {
  CLOUD_FOLDER_REPOSITORY,
  CloudFolderRepository,
} from '../../domain/ports/cloud-folder.repository';
import {
  DOCUMENT_STORAGE,
  DocumentStoragePort,
} from '../../domain/ports/document-storage.port';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { FolderName } from '../../domain/value-objects/folder-name.vo';
import { AssureSpaceCommand, AssureSpaceResult } from '../common/assure-space.interfaces';

type ChainLevelData = Pick<CloudFolderData, 'kind' | 'lawyerId' | 'jurisdictionId' | 'caseId'>;

/**
 * Makes sure a case has its folder in the cloud (HU39): `Causas/{lawyer}/
 * {jurisdiction}/{caption}`, below the study's configured root (CA-39.3).
 *
 * Idempotent (CA-39.7): if the case already has a folder it is returned
 * without touching the storage, and the lawyer and jurisdiction folders are
 * reused, so retrying after a failure never duplicates anything.
 *
 * It does not open a transaction (the storage is an external port) and does
 * not link the folder to the case: that belongs to `cases`.
 */
@Injectable()
export class AssureSpace {
  constructor(
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /**
   * @throws {StudioRootNotConfiguredError} if the root folder for cases is not set up.
   * @throws {DocumentStorageUnavailableError} if the storage fails.
   * @throws {InvalidCloudFolderError} if a name is empty once cleaned.
   */
  async execute(command: AssureSpaceCommand): Promise<AssureSpaceResult> {
    const existing = await this.folders.findByKey(FolderKey.forCase(command.caseId));
    if (existing) {
      return this.toResult(existing);
    }

    const lawyerName = FolderName.of(command.lawyer.folderLabel);
    const jurisdictionName = FolderName.of(command.jurisdiction.folderLabel);
    const caseName = FolderName.of(command.caseCaption);

    const root = await this.folders.findByKey(FolderKey.rootCases());
    if (!root) {
      throw new StudioRootNotConfiguredError();
    }

    const lawyer = await this.ensureFolder(
      FolderKey.lawyer(command.lawyer.id),
      root,
      lawyerName,
      true,
      { kind: 'LAWYER', lawyerId: command.lawyer.id },
    );
    const jurisdiction = await this.ensureFolder(
      FolderKey.jurisdiction(command.lawyer.id, command.jurisdiction.id),
      lawyer,
      jurisdictionName,
      true,
      {
        kind: 'JURISDICTION',
        lawyerId: command.lawyer.id,
        jurisdictionId: command.jurisdiction.id,
      },
    );
    // A caption is not unique, so a folder is never adopted by name at this level.
    const caseFolder = await this.ensureFolder(
      FolderKey.forCase(command.caseId),
      jurisdiction,
      caseName,
      false,
      { kind: 'CASE', caseId: command.caseId },
    );

    return this.toResult(caseFolder);
  }

  /**
   * Returns the folder with that key, creating it under `parent` if needed.
   * `adoptOrphan` reuses a remote folder with the same name left behind by a
   * crash between creating it and saving it.
   */
  private async ensureFolder(
    key: FolderKey,
    parent: CloudFolder,
    name: FolderName,
    adoptOrphan: boolean,
    data: ChainLevelData,
  ): Promise<CloudFolder> {
    const existing = await this.folders.findByKey(key);
    if (existing) {
      return existing;
    }

    const reference = { parentId: parent.cloudFolderId, name: name.toString() };
    const stored =
      (adoptOrphan ? await this.storage.findByReference(reference) : null) ??
      (await this.storage.create(reference));

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
      // A concurrent request saved the same key first: use the winner's folder.
      if (error instanceof CloudFolderAlreadyExistsError) {
        const winner = await this.folders.findByKey(key);
        if (winner) {
          return winner;
        }
      }
      throw error;
    }
  }

  private async toResult(folder: CloudFolder): Promise<AssureSpaceResult> {
    return { cloudFolderId: folder.cloudFolderId, url: folder.url, path: await this.pathOf(folder) };
  }

  /** Names from the first level below `MAIN` down to the folder, joined by `/`. */
  private async pathOf(folder: CloudFolder): Promise<string> {
    const names: string[] = [];
    let current: CloudFolder | null = folder;
    while (current && !(current instanceof MainFolder)) {
      names.unshift(current.name);
      current = current.parentCloudFolderId
        ? await this.folders.findById(current.parentCloudFolderId)
        : null;
    }
    return names.join('/');
  }
}
