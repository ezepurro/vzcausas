import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { EventPublisher } from '@shared/infrastructure/events/event-publisher.port';
import { createEventHeader } from '@shared/infrastructure/events/integration-event';
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
import {
  DOCUMENT_SPACE_ASSIGNED,
  DocumentSpaceAssignedEvent,
} from '../../domain/ports/events/document-space-assigned.event';
import {
  DOCUMENT_SPACE_CREATION_FAILED,
  DocumentSpaceCreationFailedEvent,
} from '../../domain/ports/events/document-space-creation-failed.event';
import { FolderKey, folderKeyToString } from '../../domain/value-objects/folder-key.vo';
import { FolderName } from '../../domain/value-objects/folder-name.vo';
import { AssureSpaceCommand, AssureSpaceResult } from '../common/assure-space.interfaces';
import { classifyFailure } from '../common/failure-reason';
import { KeyedMutex } from '../common/keyed-mutex';
import { SetupCloudStorage } from './setup-cloud-storage.use-case';

type ChainLevelData = Pick<CloudFolderData, 'kind' | 'lawyerId' | 'jurisdictionId' | 'caseId'>;

/**
 * Makes sure a case has its folder in the cloud (HU39): `Causas/{lawyer}/
 * {jurisdiction}/{caption}`, below the study's configured root (CA-39.3).
 *
 * If the study's root for cases is missing it is set up on the spot, see
 * {@link SetupCloudStorage}; `StudioRootNotConfiguredError` is only for a setup
 * that ends without it.
 *
 * Idempotent (CA-39.7): if the case already has a folder it is returned
 * without touching the storage, and the lawyer and jurisdiction folders are
 * reused, so retrying after a failure never duplicates anything.
 *
 * That holds as long as `cases` follows the protocol documented on
 * `CaseRegisteredEvent`: it requests the folder only through the
 * `folder_status` gate and links `cloud_folder_id` when it hears
 * `DocumentSpaceAssigned`. Until the link exists, this use case cannot see a
 * case's folder, so the gate is what prevents a second request.
 *
 * It announces the outcome itself, whoever invoked it (an event listener or,
 * later, a manual retry): `DocumentSpaceAssigned` on success (also when the
 * folder already existed) and `DocumentSpaceCreationFailed` on failure, which
 * is then rethrown. That way `cases` hears about every attempt.
 *
 * If a folder was just created in the storage and its row then cannot be
 * saved, the new folder is deleted again so nothing is left behind (same
 * pattern as `RegisterDocumentTemplate` with an uploaded file).
 *
 * It does not open a transaction (the storage is an external port) and does
 * not link the folder to the case: that belongs to `cases`.
 */
@Injectable()
export class AssureSpace {
  private readonly logger = new Logger(AssureSpace.name);
  /** Orders concurrent requests for the same folder inside this process. */
  private readonly locks = new KeyedMutex();

  constructor(
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly events: EventPublisher,
    private readonly setup: SetupCloudStorage,
  ) {}

  /**
   * @throws {StudioRootNotConfiguredError} if the root folder for cases is still missing after the setup.
   * @throws {StorageStructureBrokenError} if a saved base folder is gone from the cloud.
   * @throws {DocumentStorageUnavailableError} if the storage fails.
   * @throws {InvalidCloudFolderError} if a name is empty once cleaned.
   */
  async execute(command: AssureSpaceCommand): Promise<AssureSpaceResult> {
    let result: AssureSpaceResult;
    try {
      result = await this.assure(command);
    } catch (error) {
      await this.events.publish(this.failedEvent(command, error));
      throw error;
    }
    await this.events.publish(this.assignedEvent(command, result));
    return result;
  }

  private assignedEvent(
    command: AssureSpaceCommand,
    result: AssureSpaceResult,
  ): DocumentSpaceAssignedEvent {
    return {
      ...createEventHeader(DOCUMENT_SPACE_ASSIGNED, this.clock.now()),
      caseId: command.caseId,
      cloudFolderId: result.cloudFolderId,
      url: result.url,
      path: result.path,
      causedByEventId: command.causedByEventId,
    };
  }

  private failedEvent(
    command: AssureSpaceCommand,
    error: unknown,
  ): DocumentSpaceCreationFailedEvent {
    return {
      ...createEventHeader(DOCUMENT_SPACE_CREATION_FAILED, this.clock.now()),
      caseId: command.caseId,
      reason: classifyFailure(error),
      detail: error instanceof Error ? error.message : 'Error desconocido.',
      causedByEventId: command.causedByEventId,
    };
  }

  private async assure(command: AssureSpaceCommand): Promise<AssureSpaceResult> {
    const existing = await this.folders.findByKey(FolderKey.forCase(command.caseId));
    if (existing) {
      return this.toResult(existing);
    }

    const lawyerName = FolderName.of(command.lawyer.folderLabel);
    const jurisdictionName = FolderName.of(command.jurisdiction.folderLabel);
    const caseName = FolderName.of(command.caseCaption);

    const root = await this.findOrSetUpRootCases();

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
      {
        kind: 'CASE',
        caseId: command.caseId,
        lawyerId: command.lawyer.id,
        jurisdictionId: command.jurisdiction.id,
      },
    );

    return this.toResult(caseFolder);
  }

  /**
   * The root for cases. If it is missing, the study's base structure is set up
   * here (`SetupCloudStorage`, idempotent) instead of failing: the app creates or
   * adopts "VZ Causas" by itself and the case gets its folder in this same request.
   */
  private async findOrSetUpRootCases(): Promise<CloudFolder> {
    const root = await this.folders.findByKey(FolderKey.rootCases());
    if (root) {
      return root;
    }
    this.logger.warn('The root folder for cases is not set up: setting up the base structure.');
    await this.setup.execute();
    const created = await this.folders.findByKey(FolderKey.rootCases());
    if (!created) {
      throw new StudioRootNotConfiguredError();
    }
    return created;
  }

  /**
   * Returns the folder with that key, creating it under `parent` if needed.
   * `adoptOrphan` reuses a remote folder with the same name left behind by a
   * crash between creating it and saving it.
   *
   * Requests for the same key go one at a time in this process, so two cases of
   * the same lawyer and jurisdiction do not both create the shared folder.
   */
  private ensureFolder(
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
