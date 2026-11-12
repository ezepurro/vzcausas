import { Controller, Get, Param, Query, StreamableFile } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ContentDisposition } from '@shared/infrastructure/http/content-disposition';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { DownloadCaseDocument } from '../../../core/application/use-cases/case/download-case-document.use-case';
import { ListCaseDocuments } from '../../../core/application/use-cases/case/list-case-documents.use-case';
import { InvalidCaseIdError } from '../../../core/domain/errors/case.errors';
import { parseDisposition } from '../disposition';
import { CaseDocumentsResponseDto } from '../dtos/case/case-documents.response.dto';
import { CaseDocumentHttpMapper } from '../mappers/case-document-http.mapper';

/**
 * `GET /cases/{caseId}/documents` and `GET /cases/{caseId}/documents/{documentId}/file`
 * (HU38, contract V5 §3.12): the files of the case folder, read from the storage on
 * every request, and one of them through the API.
 *
 * Its own controller, like the cover and the timeline. No permission is declared:
 * the list is for any authenticated user (C-27), and who may download each file is
 * decided by `documents` (D-103). The shape of the request is checked before the case
 * is read; `documentId` is opaque (V5 `:7603`), so it has no 400 of its own.
 */
@Controller({ path: 'cases/:caseId/documents', version: ['1'] })
export class CaseDocumentsController {
  constructor(
    private readonly listCaseDocuments: ListCaseDocuments,
    private readonly downloadCaseDocument: DownloadCaseDocument,
    private readonly mapper: CaseDocumentHttpMapper,
  ) {}

  @Get()
  async list(@Param('caseId') caseIdParam: string): Promise<{ data: CaseDocumentsResponseDto }> {
    const listing = await this.listCaseDocuments.execute({ caseId: this.parseCaseId(caseIdParam) });
    return { data: this.mapper.toResponse(listing) };
  }

  @Get(':documentId/file')
  async download(
    @Param('caseId') caseIdParam: string,
    @Param('documentId') documentId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query('disposition') dispositionParam?: string,
  ): Promise<StreamableFile> {
    const caseId = this.parseCaseId(caseIdParam);
    // `attachment` when absent (V5 `:7609`), unlike the cover.
    const disposition = parseDisposition(dispositionParam, 'attachment');

    const file = await this.downloadCaseDocument.execute({ caseId, documentId, actor });

    return new StreamableFile(file.content, {
      type: file.mimeType,
      length: file.content.length,
      disposition: ContentDisposition.of(disposition, file.fileName).toString(),
    });
  }

  private parseCaseId(raw: string): number {
    const caseId = Number(raw);
    if (!Number.isInteger(caseId) || caseId <= 0) {
      throw new InvalidCaseIdError();
    }
    return caseId;
  }
}
