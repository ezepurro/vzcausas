import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { DocumentTemplate } from '../../domain/entities/document-template.entity';
import { DocumentTemplateNotFoundError } from '../../domain/errors/documents.errors';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';
import { DOCUMENT_TEMPLATE_REPOSITORY, DocumentTemplateRepository } from '../../domain/ports/document-template.repository';
import { TemplateFile } from '../../domain/value-objects/template-file.vo';

/** The file of a template and its content, ready to hand to the user. */
export interface DownloadedTemplate {
  file: TemplateFile;
  content: Buffer;
}

/**
 * HU35 and HU23: the `.docx` of a formal template, in its last version
 * (CA-35.6, CA-23.1; contract V5 §3.10, `GET /document-templates/{templateId}/file`).
 *
 * It goes through the API and not through a link to the storage (D-58): a
 * shared link would not respect the profiles, and the secretary must not
 * download templates (CA-35.7, CA-23.2, D-90).
 *
 * Coordinates and decides nothing: who may download is
 * {@link DocumentTemplate.assertCanBeManagedBy}, and the type of the file is
 * {@link TemplateFile.mimeType}.
 */
@Injectable()
export class DownloadDocumentTemplate {
  constructor(
    @Inject(DOCUMENT_TEMPLATE_REPOSITORY) private readonly templates: DocumentTemplateRepository,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
  ) {}

  /**
   * @throws {ForbiddenActionError} 403 (CA-23.2).
   * @throws {DocumentTemplateNotFoundError} 404, also for a template given de baja (CA-23.3).
   * @throws {DocumentStorageUnavailableError} 502: the storage did not answer; the user tries again (CA-23.4).
   */
  async execute(input: { actor: AuthenticatedUser; templateId: number }): Promise<DownloadedTemplate> {
    DocumentTemplate.assertCanBeManagedBy(input.actor);
    const file = await this.templates.findFileById(input.templateId);
    if (!file) {
      throw new DocumentTemplateNotFoundError();
    }
    return { file, content: await this.storage.downloadFile(file.cloudFileId) };
  }
}
