import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { DocumentTemplate } from '../../domain/entities/document-template.entity';
import { DocumentTemplateNotFoundError } from '../../domain/errors/documents.errors';
import {
  DOCUMENT_TEMPLATE_REPOSITORY,
  DocumentTemplateRepository,
} from '../../domain/ports/document-template.repository';
import { MoveTemplateFilesToTrash } from './move-template-files-to-trash.use-case';

export interface DeactivateDocumentTemplateCommand {
  actor: AuthenticatedUser;
  templateId: number;
}

/**
 * HU37: gives a formal template de baja, to retire an obsolete writing
 * (`DELETE /document-templates/{templateId}`, contract V6 §3.10).
 *
 * **A logical baja, with no way back through the API** (RN12, D-126): the row is
 * kept with `active: false` and the template stops existing for the client — it
 * is not listed, and its query and its download answer 404 (CA-37.1, CA-37.2).
 * Its name becomes free: it is unique among the active templates only (D-139,
 * CA-37.5). New cases no longer get a copy of it, because the copy to a case
 * folder only takes the active ones (CA-37.3, HU40); the copies already in the
 * folders are not touched.
 *
 * **Two effects, one essential and one complementary** (D-131):
 * 1. The baja itself, in the database, is essential: if it fails, so does the
 *    request, and nothing changes.
 * 2. Moving the files to the `Papelera` is complementary: if the storage does
 *    not answer, the baja stands. The template stays marked `trash_pending` and
 *    the daily process moves the files later (CA-37.4).
 *
 * No event: nobody outside `documents` reacts to the baja (ADR-005).
 *
 * Coordinates and decides nothing: who may do it is
 * {@link DocumentTemplate.assertCanBeManagedBy}, and which files to move is
 * `TemplateStoredFiles`. A rejected request writes nothing.
 */
@Injectable()
export class DeactivateDocumentTemplate {
  private readonly logger = new Logger(DeactivateDocumentTemplate.name);

  constructor(
    @Inject(DOCUMENT_TEMPLATE_REPOSITORY) private readonly templates: DocumentTemplateRepository,
    private readonly moveFilesToTrash: MoveTemplateFilesToTrash,
  ) {}

  /**
   * @throws {ForbiddenActionError} 403 `FORBIDDEN` (CA-37.6), before the template is looked for.
   * @throws {DocumentTemplateNotFoundError} 404, if it does not exist or is already de baja (CA-37.7).
   */
  async execute(command: DeactivateDocumentTemplateCommand): Promise<void> {
    DocumentTemplate.assertCanBeManagedBy(command.actor);

    // One conditional write: it finds nothing for a missing or already-baja template,
    // and of two simultaneous bajas only one writes (CA-37.7).
    if (!(await this.templates.deactivate(command.templateId))) {
      throw new DocumentTemplateNotFoundError();
    }

    await this.moveFiles(command.templateId);
  }

  /** Complementary (D-131): a failure is logged and left for the daily process, never raised. */
  private async moveFiles(templateId: number): Promise<void> {
    try {
      await this.moveFilesToTrash.execute({ templateId });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Files of template ${templateId} left for the daily process: ${reason}`);
    }
  }
}
