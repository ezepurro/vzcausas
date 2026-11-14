import { Inject, Injectable, Logger } from '@nestjs/common';
import { CloudFolder } from '../../domain/entities/cloud-folder.entity';
import { TemplateJurisdiction } from '../../domain/entities/document-template.entity';
import { DocumentStorageUnavailableError, StorageStructureBrokenError } from '../../domain/errors/documents.errors';
import { CLOUD_FOLDER_REPOSITORY, CloudFolderRepository } from '../../domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';
import {
  DOCUMENT_TEMPLATE_REPOSITORY,
  DocumentTemplateRepository,
  TemplateFilePlacement,
} from '../../domain/ports/document-template.repository';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { SetupCloudStorage } from '../use-cases/setup-cloud-storage.use-case';

/** The folder `Modelos formales/{fuero}` of a jurisdiction. */
export interface JurisdictionFolder {
  jurisdiction: TemplateJurisdiction;
  folder: CloudFolder;
}

/** A file to put in the storage: its name, its type and its content. */
export interface TemplateFileContent {
  name: string;
  mimeType: string;
  content: Buffer;
}

/**
 * What registering (HU34) and modifying (HU36) a formal template share in the
 * cloud storage: finding the folder of each jurisdiction, putting a file in each
 * of them, and taking back what was created if a later step fails.
 *
 * The file of a template lives in `Modelos formales/{fuero}` for **each** of its
 * jurisdictions (ADR-003 §2.2): it is uploaded once, to the first folder, and
 * copied inside the storage to the rest (D-55).
 *
 * Every file id is added to the `created` list the caller passes as soon as it
 * exists, so the caller can {@link discard} them if the database write fails.
 */
@Injectable()
export class TemplateCloudFiles {
  private readonly logger = new Logger(TemplateCloudFiles.name);

  constructor(
    @Inject(DOCUMENT_TEMPLATE_REPOSITORY) private readonly templates: DocumentTemplateRepository,
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    private readonly setup: SetupCloudStorage,
  ) {}

  /**
   * The folder of each jurisdiction, in the order given. If any is missing the
   * base structure is set up (`SetupCloudStorage`, idempotent) and they are read
   * again (CA-34.11).
   *
   * @throws {DocumentStorageUnavailableError} 502: the storage failed, or the structure cannot be set up.
   */
  async foldersFor(jurisdictions: readonly TemplateJurisdiction[]): Promise<JurisdictionFolder[]> {
    const found = await this.findFolders(jurisdictions);
    if (found) {
      return found;
    }

    this.logger.warn('A "Modelos formales" jurisdiction folder is not set up: setting up the base structure.');
    try {
      await this.setup.execute();
    } catch (error) {
      // A saved base folder that is gone from the cloud is a configuration problem, answered as 502.
      if (error instanceof StorageStructureBrokenError) {
        throw new DocumentStorageUnavailableError('CONFIGURATION', error.message);
      }
      throw error;
    }

    const created = await this.findFolders(jurisdictions);
    if (!created) {
      throw new DocumentStorageUnavailableError('CONFIGURATION', 'templates jurisdiction folders not configured');
    }
    return created;
  }

  /**
   * Uploads the file to the first folder and copies it to the rest. The first
   * placement is the template's main file (D-109).
   */
  async upload(
    file: TemplateFileContent,
    targets: readonly JurisdictionFolder[],
    created: string[],
  ): Promise<TemplateFilePlacement[]> {
    const [first, ...others] = targets;
    const main = await this.storage.uploadFile({
      parentId: first.folder.cloudFolderId,
      name: file.name,
      mimeType: file.mimeType,
      content: file.content,
    });
    created.push(main.id);
    return [
      { jurisdiction: first.jurisdiction, cloudFileId: main.id, cloudFolderId: first.folder.cloudFolderId },
      ...(await this.copy(main.id, file.name, others, created)),
    ];
  }

  /** Copies a file that is already in the storage into each of the folders, inside the provider. */
  async copy(
    fileId: string,
    name: string,
    targets: readonly JurisdictionFolder[],
    created: string[],
  ): Promise<TemplateFilePlacement[]> {
    const placements: TemplateFilePlacement[] = [];
    for (const { jurisdiction, folder } of targets) {
      const copy = await this.storage.copyFile({ fileId, parentId: folder.cloudFolderId, name });
      created.push(copy.id);
      placements.push({ jurisdiction, cloudFileId: copy.id, cloudFolderId: folder.cloudFolderId });
    }
    return placements;
  }

  /** Best effort, one by one: if a delete fails too, that stray file is logged for someone to remove by hand. */
  async discard(fileIds: readonly string[]): Promise<void> {
    for (const fileId of fileIds) {
      try {
        await this.storage.deleteFile(fileId);
      } catch (error) {
        this.logger.error(`Could not delete the uploaded template file ${fileId}: ${String(error)}`);
      }
    }
  }

  /** `null` if the database has no id or no saved folder for any of them. */
  private async findFolders(jurisdictions: readonly TemplateJurisdiction[]): Promise<JurisdictionFolder[] | null> {
    const ids = await this.templates.findJurisdictionIds(jurisdictions);
    const found: JurisdictionFolder[] = [];
    for (const jurisdiction of jurisdictions) {
      const jurisdictionId = ids.get(jurisdiction);
      const folder =
        jurisdictionId === undefined ? null : await this.folders.findByKey(FolderKey.jurisdiction(null, jurisdictionId));
      if (!folder) {
        return null;
      }
      found.push({ jurisdiction, folder });
    }
    return found;
  }
}
