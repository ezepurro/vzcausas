import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CloudFolder } from '../../domain/entities/cloud-folder.entity';
import {
  DocumentTemplate,
  TemplateFileInput,
  TemplateJurisdiction,
} from '../../domain/entities/document-template.entity';
import {
  DocumentStorageUnavailableError,
  DocumentTemplateAlreadyExistsError,
  StorageStructureBrokenError,
} from '../../domain/errors/documents.errors';
import { CLOUD_FOLDER_REPOSITORY, CloudFolderRepository } from '../../domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';
import {
  DOCUMENT_TEMPLATE_REPOSITORY,
  DocumentTemplateRepository,
  DocumentTemplateView,
  TemplateFilePlacement,
} from '../../domain/ports/document-template.repository';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { assertCanManageTemplates } from '../common/assert-can-manage-templates';
import { SetupCloudStorage } from './setup-cloud-storage.use-case';

export interface RegisterDocumentTemplateCommand {
  actor: AuthenticatedUser;
  name?: string | null;
  jurisdictions?: readonly string[] | null;
  copyToNewCases?: boolean | null;
  file?: (TemplateFileInput & { content: Buffer }) | null;
}

/** The folder `Modelos formales/{fuero}` of a jurisdiction. */
interface JurisdictionFolder {
  jurisdiction: TemplateJurisdiction;
  folder: CloudFolder;
}

/**
 * HU34: registers a formal template with its file (contract V5 §3.10,
 * `POST /document-templates`).
 *
 * The file lives in the folder of **each** jurisdiction the template applies
 * to, `Modelos formales/{fuero}` (ADR-003 §2.2). It is uploaded once, to the
 * first jurisdiction in the contract's order (that file is the template's main
 * one, the one that is downloaded), and copied inside the storage to the
 * others. A template of several jurisdictions is still **one** template (D-55).
 *
 * The registration is atomic towards the user (CA-34.7): there is never a
 * template without its file. Every check that can fail is done **before**
 * touching the storage, so a rejected request uploads nothing; if the upload,
 * a copy or the database fails afterwards, every file already created is
 * deleted again.
 *
 * No database transaction is held open while the storage answers (architecture
 * §6): the template, its jurisdictions and its files are one write, after the
 * upload.
 */
@Injectable()
export class RegisterDocumentTemplate {
  private readonly logger = new Logger(RegisterDocumentTemplate.name);

  constructor(
    @Inject(DOCUMENT_TEMPLATE_REPOSITORY) private readonly templates: DocumentTemplateRepository,
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly setup: SetupCloudStorage,
  ) {}

  /**
   * @throws {ForbiddenActionError} 403, the user is neither administrator nor lawyer.
   * @throws {ValidationError} 400, with every invalid field.
   * @throws {DocumentTemplateAlreadyExistsError} 409.
   * @throws {DocumentStorageUnavailableError} 502: the storage failed, also while setting up a missing "Modelos formales/{fuero}" folder or copying the file to another jurisdiction.
   */
  async execute(command: RegisterDocumentTemplateCommand): Promise<DocumentTemplateView> {
    const { actor, file } = command;
    assertCanManageTemplates(actor);

    const template = DocumentTemplate.create({
      name: command.name,
      jurisdictions: command.jurisdictions,
      copyToNewCases: command.copyToNewCases,
      file,
      lastVersionByUserId: actor.userId,
      now: this.clock.now(),
    });

    if (await this.templates.existsByName(template.name)) {
      throw new DocumentTemplateAlreadyExistsError();
    }

    // CA-34.11 (changed 22/10/2026): a missing folder is set up here, not a 502.
    const targets = await this.findOrSetUpJurisdictionFolders(template.jurisdictionsInContractOrder);

    const created: string[] = [];
    try {
      const placements = await this.storeFiles(template, file!, targets, created);
      return await this.templates.save(template, placements);
    } catch (error) {
      await this.discardFiles(created);
      throw error;
    }
  }

  /**
   * Uploads the file to the first folder and copies it to the rest. Every file
   * id is added to `created` as soon as it exists, so the caller can undo them
   * if a later step fails.
   */
  private async storeFiles(
    template: DocumentTemplate,
    file: TemplateFileInput & { content: Buffer },
    targets: JurisdictionFolder[],
    created: string[],
  ): Promise<TemplateFilePlacement[]> {
    const [first, ...others] = targets;

    const main = await this.storage.uploadFile({
      parentId: first.folder.cloudFolderId,
      name: template.fileName,
      mimeType: file.mimeType,
      content: file.content,
    });
    created.push(main.id);
    const placements: TemplateFilePlacement[] = [
      { jurisdiction: first.jurisdiction, cloudFileId: main.id, cloudFolderId: first.folder.cloudFolderId },
    ];

    for (const { jurisdiction, folder } of others) {
      const copy = await this.storage.copyFile({
        fileId: main.id,
        parentId: folder.cloudFolderId,
        name: template.fileName,
      });
      created.push(copy.id);
      placements.push({ jurisdiction, cloudFileId: copy.id, cloudFolderId: folder.cloudFolderId });
    }
    return placements;
  }

  /**
   * The folder of each jurisdiction, in the order given. If any is missing the
   * base structure is set up (`SetupCloudStorage`, idempotent) and they are
   * read again.
   */
  private async findOrSetUpJurisdictionFolders(
    jurisdictions: readonly TemplateJurisdiction[],
  ): Promise<JurisdictionFolder[]> {
    const found = await this.findJurisdictionFolders(jurisdictions);
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

    const created = await this.findJurisdictionFolders(jurisdictions);
    if (!created) {
      throw new DocumentStorageUnavailableError('CONFIGURATION', 'templates jurisdiction folders not configured');
    }
    return created;
  }

  /** `null` if the database has no id or no saved folder for any of them. */
  private async findJurisdictionFolders(
    jurisdictions: readonly TemplateJurisdiction[],
  ): Promise<JurisdictionFolder[] | null> {
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

  /** Best effort, one by one: if a delete fails too, that stray file is logged for someone to remove by hand. */
  private async discardFiles(fileIds: readonly string[]): Promise<void> {
    for (const fileId of fileIds) {
      try {
        await this.storage.deleteFile(fileId);
      } catch (error) {
        this.logger.error(`Could not delete the uploaded template file ${fileId}: ${String(error)}`);
      }
    }
  }
}
