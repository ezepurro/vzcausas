import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { DocumentTemplate } from '../../domain/entities/document-template.entity';
import { DocumentTemplateNotFoundError } from '../../domain/errors/documents.errors';
import {
  DOCUMENT_TEMPLATE_REPOSITORY,
  DocumentTemplateRepository,
  DocumentTemplateView,
} from '../../domain/ports/document-template.repository';

/** HU35: one formal template (contract V4 §3.10, `GET /document-templates/{templateId}`). */
@Injectable()
export class GetDocumentTemplate {
  constructor(@Inject(DOCUMENT_TEMPLATE_REPOSITORY) private readonly templates: DocumentTemplateRepository) {}

  /**
   * @throws {ForbiddenActionError} 403 (CA-35.7).
   * @throws {DocumentTemplateNotFoundError} 404, also for a template given de baja.
   */
  async execute(input: { actor: AuthenticatedUser; templateId: number }): Promise<DocumentTemplateView> {
    DocumentTemplate.assertCanBeManagedBy(input.actor);
    const template = await this.templates.findById(input.templateId);
    if (!template) {
      throw new DocumentTemplateNotFoundError();
    }
    return template;
  }
}
