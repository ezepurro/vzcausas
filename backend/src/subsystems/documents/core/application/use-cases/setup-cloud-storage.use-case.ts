import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CloudFolder } from '../../domain/entities/cloud-folder.entity';
import {
  CloudFolderAlreadyExistsError,
  StorageStructureBrokenError,
} from '../../domain/errors/documents.errors';
import { CloudFolderFactory } from '../../domain/factories/cloud-folder.factory';
import {
  CLOUD_FOLDER_REPOSITORY,
  CloudFolderRepository,
} from '../../domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';

/** How one folder of the structure was found or made. */
export type SetupOutcome = 'CREATED' | 'ADOPTED' | 'EXISTING';

export interface SetupCloudStorageItem {
  kind: 'MAIN' | 'TEMPLATES' | 'ROOT_CASES';
  name: string;
  cloudFolderId: string;
  url: string;
  outcome: SetupOutcome;
}

type Step = (typeof STRUCTURE)[number];

/** The three folders every other folder hangs from: MAIN, then TEMPLATES and ROOT_CASES below it. */
const STRUCTURE = [
  { kind: 'MAIN', name: 'VZ Causas', key: FolderKey.main(), underMain: false },
  { kind: 'TEMPLATES', name: 'Modelos formales', key: FolderKey.templates(), underMain: true },
  { kind: 'ROOT_CASES', name: 'Causas', key: FolderKey.rootCases(), underMain: true },
] as const;

/**
 * Makes sure the study's folder structure exists, in the cloud and in
 * `cloud_folders` (ADR-003 §2.2):
 *
 * ```
 * VZ Causas              MAIN
 * ├── Modelos formales   TEMPLATES
 * └── Causas             ROOT_CASES
 * ```
 *
 * Every other folder is created below these, and without them `AssureSpace`
 * and the template upload fail with a configuration error.
 *
 * Idempotent: a folder that is already saved is only checked, one that exists
 * in the cloud but has no row is adopted, and only what is missing is created.
 * It is a use case (not a script) so a command runs it today and, later,
 * `AssureSpace` could run it by itself when it finds the structure missing.
 */
@Injectable()
export class SetupCloudStorage {
  private readonly logger = new Logger(SetupCloudStorage.name);

  constructor(
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /**
   * @throws {StorageStructureBrokenError} if a saved folder is gone from the cloud.
   * @throws {DocumentStorageUnavailableError} if the storage fails.
   */
  async execute(): Promise<SetupCloudStorageItem[]> {
    const report: SetupCloudStorageItem[] = [];
    let main: CloudFolder | null = null;

    for (const step of STRUCTURE) {
      const result = await this.ensure(step, step.underMain ? main : null);
      report.push(result.report);
      if (step.kind === 'MAIN') {
        main = result.folder;
      }
    }
    return report;
  }

  private async ensure(
    step: Step,
    parent: CloudFolder | null,
  ): Promise<{ folder: CloudFolder; report: SetupCloudStorageItem }> {
    const saved = await this.folders.findByKey(step.key);
    if (saved) {
      const inCloud = await this.storage.getFolder(saved.cloudFolderId);
      if (!inCloud) {
        throw new StorageStructureBrokenError(step.name);
      }
      return { folder: saved, report: this.item(step, saved, 'EXISTING') };
    }

    const reference = { parentId: parent?.cloudFolderId ?? null, name: step.name };
    const found = await this.storage.findFolderByReference(reference);
    const stored = found ?? (await this.storage.createFolder(reference));

    const folder = CloudFolderFactory.create({
      kind: step.kind,
      cloudFolderId: stored.id,
      url: stored.url,
      name: step.name,
      parentCloudFolderId: parent?.cloudFolderId ?? null,
      createdAt: this.clock.now(),
    });

    try {
      await this.folders.save(folder);
    } catch (error) {
      if (found === null) {
        await this.discard(stored.id);
      }
      // Another run saved the same folder first: use the one that is saved.
      if (error instanceof CloudFolderAlreadyExistsError) {
        const winner = await this.folders.findByKey(step.key);
        if (winner) {
          return { folder: winner, report: this.item(step, winner, 'EXISTING') };
        }
      }
      throw error;
    }

    const outcome: SetupOutcome = found ? 'ADOPTED' : 'CREATED';
    this.logger.log(`${outcome} ${step.kind} folder (cloudFolderId=${folder.cloudFolderId})`);
    return { folder, report: this.item(step, folder, outcome) };
  }

  private item(step: Step, folder: CloudFolder, outcome: SetupOutcome): SetupCloudStorageItem {
    return {
      kind: step.kind,
      name: step.name,
      cloudFolderId: folder.cloudFolderId,
      url: folder.url,
      outcome,
    };
  }

  /** Best effort: if deleting also fails, the leftover folder is only logged, by its id. */
  private async discard(cloudFolderId: string): Promise<void> {
    try {
      await this.storage.deleteFolder(cloudFolderId);
    } catch (error) {
      this.logger.error(
        `Could not delete the folder ${cloudFolderId} created for a row that was not saved: ${String(error)}`,
      );
    }
  }
}
