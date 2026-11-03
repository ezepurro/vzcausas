import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toIsoWithOffset } from '@shared/infrastructure/http/iso-date';
import { CaseDocumentListing } from '../../../core/domain/value-objects/case/case-document-listing.vo';
import { CaseDocumentsResponseDto } from '../dtos/case/case-documents.response.dto';

/** Translates the documents of a case into the contract's shape (V5 §3.12, `GET /cases/{caseId}/documents`). */
@Injectable()
export class CaseDocumentHttpMapper {
  private readonly timeZone: string;

  constructor(config: ConfigService) {
    this.timeZone = config.getOrThrow<string>('APP_TIMEZONE');
  }

  toResponse(listing: CaseDocumentListing): CaseDocumentsResponseDto {
    return {
      folderStatus: listing.folderStatus,
      folderUrl: listing.folderUrl,
      readAt: listing.readAt && toIsoWithOffset(listing.readAt, this.timeZone),
      documents: listing.documents.map((document) => ({
        id: document.id,
        name: document.name,
        extension: document.extension,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        createdAt: toIsoWithOffset(document.createdAt, this.timeZone),
        modifiedAt: toIsoWithOffset(document.modifiedAt, this.timeZone),
        uploadedBy: document.uploadedBy,
        url: document.url,
        convertibleToPdf: document.convertibleToPdf,
        caseFile: document.caseFile,
      })),
    };
  }
}
