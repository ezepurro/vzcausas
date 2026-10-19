import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { DocumentTemplate, TemplateFileInput } from '../../domain/entities/document-template.entity';
import {
  DocumentStorageUnavailableError,
  DocumentTemplateAlreadyExistsError,
} from '../../domain/errors/documents.errors';
import { CLOUD_FOLDER_REPOSITORY, CloudFolderRepository } from '../../domain/ports/cloud-folder.repository';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';
import {
  DOCUMENT_TEMPLATE_REPOSITORY,
  DocumentTemplateRepository,
  DocumentTemplateView,
} from '../../domain/ports/document-template.repository';
import { FolderKey } from '../../domain/value-objects/folder-key.vo';
import { assertCanManageTemplates } from '../common/assert-can-manage-templates';

export interface RegisterDocumentTemplateCommand {
  actor: AuthenticatedUser;
  name?: string | null;
  jurisdictions?: readonly string[] | null;
  copyToNewCases?: boolean | null;
  file?: (TemplateFileInput & { content: Buffer }) | null;
}

/**
 * HU34: registers a formal template with its file (contract V4 §3.10,
 * `POST /document-templates`).
 *
 * The registration is atomic towards the user (CA-34.7): there is never a
 * template without its file. Every check that can fail is done **before**
 * touching the storage, so a rejected request uploads nothing; if the database
 * still refuses the template after the upload (another user took the name a
 * moment before), the uploaded file is deleted again.
 *
 * No database transaction is held open while the storage answers (architecture
 * §6): the template and its jurisdictions are one write, after the upload.
 */
@Injectable()
export class RegisterDocumentTemplate {
  private readonly logger = new Logger(RegisterDocumentTemplate.name);

  constructor(
    @Inject(DOCUMENT_TEMPLATE_REPOSITORY) private readonly templates: DocumentTemplateRepository,
    @Inject(CLOUD_FOLDER_REPOSITORY) private readonly folders: CloudFolderRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /**
   * @throws {ForbiddenActionError} 403, the user is neither administrator nor lawyer.
   * @throws {ValidationError} 400, with every invalid field.
   * @throws {DocumentTemplateAlreadyExistsError} 409.
   * @throws {DocumentStorageUnavailableError} 502: the storage failed, or its "Modelos formales" folder is not set up.
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

    // The folder is created once, by the setup script (ADR-003); it is not created here (CA-34.11).
    const templatesFolder = await this.folders.findByKey(FolderKey.templates());
    if (!templatesFolder) {
      this.logger.error('The "Modelos formales" folder is not set up in cloud_folders: run the storage setup.');
      throw new DocumentStorageUnavailableError('TRANSIENT', 'templates folder not configured');
    }

    const stored = await this.storage.uploadFile({
      parentId: templatesFolder.cloudFolderId,
      name: template.fileName,
      mimeType: file!.mimeType,
      content: file!.content,
    });

    try {
      return await this.templates.save(template, {
        cloudFileId: stored.id,
        cloudFolderId: templatesFolder.cloudFolderId,
      });
    } catch (error) {
      await this.discardUpload(stored.id);
      throw error;
    }
  }

  /** Best effort: if the delete fails too, the stray file is logged for someone to remove by hand. */
  private async discardUpload(fileId: string): Promise<void> {
    try {
      await this.storage.deleteFile(fileId);
    } catch (error) {
      this.logger.error(`Could not delete the uploaded template file ${fileId}: ${String(error)}`);
    }
  }
}
