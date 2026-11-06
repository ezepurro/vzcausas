import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CloudFolder } from '../../domain/entities/cloud-folder.entity';
import { TEMPLATE_JURISDICTIONS } from '../../domain/entities/document-template.entity';
import {
  CloudFolderAlreadyExistsError,
  DocumentStorageUnavailableError,
  StorageStructureBrokenError,
} from '../../domain/errors/documents.errors';
import { CloudFolderData, CloudFolderFactory } from '../../domain/factories/cloud-folder.factory';
import {
  CLOUD_FOLDER_REPOSITORY,
  CloudFolderRepository,
} from '../../domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';
import {
  DOCUMENT_TEMPLATE_REPOSITORY,
  DocumentTemplateRepository,
} from '../../domain/ports/document-template.repository';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { TEMPLATE_JURISDICTION_FOLDER_LABEL } from '../../domain/value-objects/template-jurisdiction-folder-label';
import { KeyedMutex } from '../common/keyed-mutex';

/** How one folder of the structure was found or made. */
export type SetupOutcome = 'CREATED' | 'ADOPTED' | 'EXISTING';

export interface SetupCloudStorageItem {
  kind: 'MAIN' | 'TEMPLATES' | 'ROOT_CASES' | 'JURISDICTION';
  name: string;
  cloudFolderId: string;
  url: string;
  outcome: SetupOutcome;
}

/** One folder of the structure: what it is called, its natural key and the columns its kind carries. */
interface Step {
  kind: SetupCloudStorageItem['kind'];
  name: string;
  key: FolderKey;
  data?: Pick<CloudFolderData, 'jurisdictionId'>;
}

const MAIN: Step = { kind: 'MAIN', name: 'VZ Causas', key: FolderKey.main() };
const TEMPLATES: Step = { kind: 'TEMPLATES', name: 'Modelos formales', key: FolderKey.templates() };
const ROOT_CASES: Step = { kind: 'ROOT_CASES', name: 'Causas', key: FolderKey.rootCases() };

/**
 * Makes sure the study's folder structure exists, in the cloud and in
 * `cloud_folders` (ADR-003 §2.2):
 *
 * ```
 * VZ Causas              MAIN
 * ├── Modelos formales   TEMPLATES
 * │   ├── Penal          JURISDICTION (without lawyer)
 * │   ├── Administrativo JURISDICTION (without lawyer)
 * │   └── Amparo         JURISDICTION (without lawyer)
 * └── Causas             ROOT_CASES
 * ```
 *
 * Every other folder is created below these, and without them `AssureSpace`
 * and the template upload fail with a configuration error. The three
 * jurisdiction folders are where each formal template's file lives, one file
 * in the folder of every jurisdiction the template applies to (D-55).
 *
 * Idempotent: a folder that is already saved is only checked, one that exists
 * in the cloud but has no row is adopted, and only what is missing is created.
 * That is also how a study that already had the three base folders gets the
 * jurisdiction ones: the next run adds just those.
 * It is a use case (not a script) because three callers run it: the command
 * `npm run documents:setup-storage`, `StorageBootstrap` when the app starts, and
 * `AssureSpace` / `RegisterDocumentTemplate` when they find the structure missing.
 * Runs in this process go one at a time (`KeyedMutex`); between instances the
 * unique indexes of `cloud_folders` decide the winner.
 *
 * With the `drive.file` scope the app only sees folders it created itself
 * (ADR-003 §2.6), so a "VZ Causas" folder made by hand is not adopted: a new one
 * is created and a warning says so.
 */
@Injectable()
export class SetupCloudStorage {
  private readonly logger = new Logger(SetupCloudStorage.name);
  /** Orders concurrent runs inside this process, so the folders are not created twice. */
  private readonly locks = new KeyedMutex();

  constructor(
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    @Inject(DOCUMENT_TEMPLATE_REPOSITORY) private readonly templates: DocumentTemplateRepository,
  ) {}

  /**
   * @throws {StorageStructureBrokenError} if a saved folder is gone from the cloud.
   * @throws {DocumentStorageUnavailableError} if the storage fails, or a jurisdiction is missing from the database (`CONFIGURATION`).
   */
  execute(): Promise<SetupCloudStorageItem[]> {
    return this.locks.run('setup', () => this.run());
  }

  private async run(): Promise<SetupCloudStorageItem[]> {
    const report: SetupCloudStorageItem[] = [];
    const record = (result: { report: SetupCloudStorageItem }) => report.push(result.report);

    const main = await this.ensure(MAIN, null);
    record(main);
    const templates = await this.ensure(TEMPLATES, main.folder);
    record(templates);
    record(await this.ensure(ROOT_CASES, main.folder));

    for (const step of await this.jurisdictionSteps()) {
      record(await this.ensure(step, templates.folder));
    }
    return report;
  }

  /** One folder per jurisdiction below "Modelos formales", in the order of the contract's enum. */
  private async jurisdictionSteps(): Promise<Step[]> {
    const ids = await this.templates.findJurisdictionIds(TEMPLATE_JURISDICTIONS);
    return TEMPLATE_JURISDICTIONS.map((code) => {
      const jurisdictionId = ids.get(code);
      if (jurisdictionId === undefined) {
        throw new DocumentStorageUnavailableError('CONFIGURATION', `Falta el fuero ${code} en la base de datos.`);
      }
      return {
        kind: 'JURISDICTION' as const,
        name: TEMPLATE_JURISDICTION_FOLDER_LABEL[code],
        key: FolderKey.jurisdiction(null, jurisdictionId),
        data: { jurisdictionId },
      };
    });
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
      ...step.data,
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
    if (step.kind === 'MAIN' && outcome === 'CREATED') {
      this.logger.warn(
        'Se creó la carpeta raíz nueva. Con el permiso drive.file la app no ve carpetas hechas a mano: ' +
          'si ya existía una "VZ Causas" creada manualmente, no se adoptó y quedó aparte (ADR-003 §2.6).',
      );
    }
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
