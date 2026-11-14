import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { DocumentTemplate, TemplateFileInput } from '../../domain/entities/document-template.entity';
import { DocumentTemplateAlreadyExistsError } from '../../domain/errors/documents.errors';
import {
  DOCUMENT_TEMPLATE_REPOSITORY,
  DocumentTemplateRepository,
  DocumentTemplateView,
} from '../../domain/ports/document-template.repository';
import { TemplateCloudFiles } from '../common/template-cloud-files';

export interface RegisterDocumentTemplateCommand {
  actor: AuthenticatedUser;
  name?: string | null;
  jurisdictions?: readonly string[] | null;
  copyToNewCases?: boolean | null;
  file?: (TemplateFileInput & { content: Buffer }) | null;
}

/**
 * HU34: registers a formal template with its file (contract V5 §3.10,
 * `POST /document-templates`).
 *
 * The file lives in the folder of **each** jurisdiction the template applies
 * to, `Modelos formales/{fuero}` (ADR-003 §2.2). It is uploaded once, to the
 * first jurisdiction in the contract's order (that file is the template's main
 * one, the one that is downloaded), and copied inside the storage to the
 * others (see {@link TemplateCloudFiles}). A template of several jurisdictions
 * is still **one** template (D-55).
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
  constructor(
    @Inject(DOCUMENT_TEMPLATE_REPOSITORY) private readonly templates: DocumentTemplateRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly cloudFiles: TemplateCloudFiles,
  ) {}

  /**
   * @throws {ForbiddenActionError} 403, the user is neither administrator nor lawyer.
   * @throws {ValidationError} 400, with every invalid field.
   * @throws {DocumentTemplateAlreadyExistsError} 409.
   * @throws {DocumentStorageUnavailableError} 502: the storage failed, also while setting up a missing "Modelos formales/{fuero}" folder or copying the file to another jurisdiction.
   */
  async execute(command: RegisterDocumentTemplateCommand): Promise<DocumentTemplateView> {
    const { actor, file } = command;
    DocumentTemplate.assertCanBeManagedBy(actor);

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
    const targets = await this.cloudFiles.foldersFor(template.jurisdictionsInContractOrder);

    const created: string[] = [];
    try {
      const placements = await this.cloudFiles.upload(
        { name: template.fileName, mimeType: file!.mimeType, content: file!.content },
        targets,
        created,
      );
      return await this.templates.save(template, placements);
    } catch (error) {
      await this.cloudFiles.discard(created);
      throw error;
    }
  }
}
