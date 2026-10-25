import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { DOCX_MIME_TYPE } from '../../domain/entities/document-template.entity';
import { DocumentTemplateNotFoundError } from '../../domain/errors/documents.errors';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';
import { DOCUMENT_TEMPLATE_REPOSITORY, DocumentTemplateRepository } from '../../domain/ports/document-template.repository';
import { assertCanManageTemplates } from '../common/assert-can-manage-templates';

/** The file of a template, ready to hand to the user. */
export interface DownloadedTemplate {
  fileName: string;
  mimeType: string;
  content: Buffer;
}

/**
 * HU35: the `.docx` of a formal template, in its last version (CA-35.6;
 * contract V4 §3.10, `GET /document-templates/{templateId}/file`).
 *
 * It goes through the API and not through a link to the storage (D-58): a
 * shared link would not respect the profiles, and the secretary must not
 * download templates (CA-35.7).
 */
@Injectable()
export class DownloadDocumentTemplate {
  constructor(
    @Inject(DOCUMENT_TEMPLATE_REPOSITORY) private readonly templates: DocumentTemplateRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
  ) {}

  /**
   * @throws {ForbiddenActionError} 403 (CA-35.7).
   * @throws {DocumentTemplateNotFoundError} 404, also for a template given de baja.
   * @throws {DocumentStorageUnavailableError} 502: the storage did not answer; the user tries again (CA-35.6).
   */
  async execute(input: { actor: AuthenticatedUser; templateId: number }): Promise<DownloadedTemplate> {
    assertCanManageTemplates(input.actor);
    const file = await this.templates.findFileById(input.templateId);
    if (!file) {
      throw new DocumentTemplateNotFoundError();
    }
    // Every template is a .docx: the type is checked when it is registered (CA-34.3).
    return {
      fileName: file.fileName,
      mimeType: DOCX_MIME_TYPE,
      content: await this.storage.downloadFile(file.cloudFileId),
    };
  }
}
