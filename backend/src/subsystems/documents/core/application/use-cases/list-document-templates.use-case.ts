import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { TEMPLATE_JURISDICTIONS, TemplateJurisdiction } from '../../domain/entities/document-template.entity';
import { InvalidTemplateJurisdictionFilterError } from '../../domain/errors/documents.errors';
import {
  DOCUMENT_TEMPLATE_REPOSITORY,
  DocumentTemplateRepository,
  DocumentTemplateView,
} from '../../domain/ports/document-template.repository';
import { assertCanManageTemplates } from '../common/assert-can-manage-templates';

export interface ListDocumentTemplatesQuery {
  actor: AuthenticatedUser;
  /** As typed by the client, already upper-cased: it is checked here. */
  jurisdiction?: string;
  copyToNewCases?: boolean;
  page: number;
  limit: number;
}

/**
 * HU35: the active formal templates, alphabetical, optionally of one
 * jurisdiction (contract V4 §3.10, `GET /document-templates`).
 *
 * The screen builds everything else from this list (CA-35.4, CA-35.9): the
 * count of a jurisdiction is `totalItems` with its filter, and the cards come
 * from one unfiltered page. A jurisdiction without templates is an empty page,
 * not an error (CA-35.5).
 */
@Injectable()
export class ListDocumentTemplates {
  constructor(@Inject(DOCUMENT_TEMPLATE_REPOSITORY) private readonly templates: DocumentTemplateRepository) {}

  /**
   * @throws {ForbiddenActionError} 403, the user is neither administrator nor lawyer (CA-35.7).
   * @throws {InvalidTemplateJurisdictionFilterError} 400 `INVALID_REQUEST`.
   */
  async execute(query: ListDocumentTemplatesQuery): Promise<{ items: DocumentTemplateView[]; totalItems: number }> {
    assertCanManageTemplates(query.actor);
    const { jurisdiction } = query;
    if (jurisdiction !== undefined && !TEMPLATE_JURISDICTIONS.includes(jurisdiction as TemplateJurisdiction)) {
      throw new InvalidTemplateJurisdictionFilterError();
    }
    return this.templates.findPage({
      jurisdiction: jurisdiction as TemplateJurisdiction | undefined,
      copyToNewCases: query.copyToNewCases,
      page: query.page,
      limit: query.limit,
    });
  }
}
