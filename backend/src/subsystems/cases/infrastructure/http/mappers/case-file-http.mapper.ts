import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toIsoWithOffset } from '@shared/infrastructure/http/iso-date';
import { GeneratedCaseFile } from '../../../core/domain/ports/case/case-documents.port';
import { CaseFileResponseDto } from '../dtos/case/case-file.response.dto';
import { CaseDocumentHttpMapper } from './case-document-http.mapper';

/**
 * Translates a case file just generated into the contract's shape (V5 §3.12,
 * `POST /cases/{caseId}/case-files`). The `document` goes out through the
 * mapper of the document list, so it is the very resource
 * `GET /cases/{caseId}/documents` shows — not a look-alike that could drift.
 */
@Injectable()
export class CaseFileHttpMapper {
  private readonly timeZone: string;

  constructor(
    config: ConfigService,
    private readonly documents: CaseDocumentHttpMapper,
  ) {
    this.timeZone = config.getOrThrow<string>('APP_TIMEZONE');
  }

  toResponse(caseFile: GeneratedCaseFile): CaseFileResponseDto {
    return {
      document: this.documents.toDocument(caseFile.document),
      version: caseFile.version,
      pageCount: caseFile.pageCount,
      parts: caseFile.parts,
      generatedBy: caseFile.generatedBy,
      generatedAt: toIsoWithOffset(caseFile.generatedAt, this.timeZone),
    };
  }
}
