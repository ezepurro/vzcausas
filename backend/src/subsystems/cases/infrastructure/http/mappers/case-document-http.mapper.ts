import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toIsoWithOffset } from '@shared/infrastructure/http/iso-date';
import { CaseDocumentListing } from '../../../core/domain/value-objects/case/case-document-listing.vo';
import { CaseDocumentItem } from '../../../core/domain/ports/case/case-documents.port';
import { CaseDocumentResponseDto, CaseDocumentsResponseDto } from '../dtos/case/case-documents.response.dto';

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
      documents: listing.documents.map((document) => this.toDocument(document)),
    };
  }

  /**
   * One document of the folder. Also the `document` of a case file just generated
   * (HU25, `CaseFileHttpMapper`): the contract gives it the same structure.
   */
  toDocument(document: CaseDocumentItem): CaseDocumentResponseDto {
    return {
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
    };
  }
}
