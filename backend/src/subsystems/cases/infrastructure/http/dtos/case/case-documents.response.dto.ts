/** A document of the case folder (contract V5 §3.12, `:7416-7428`). Dates with their offset. */
export class CaseDocumentResponseDto {
  id!: string;
  name!: string;
  extension!: string | null;
  mimeType!: string;
  sizeBytes!: number | null;
  createdAt!: string;
  modifiedAt!: string;
  uploadedBy!: string | null;
  url!: string;
  convertibleToPdf!: boolean;
  caseFile!: { id: number; version: number } | null;
}

/** `GET /cases/{caseId}/documents` (HU38, V5 `:7471-7476`): an object, not a list. */
export class CaseDocumentsResponseDto {
  folderStatus!: 'PENDING' | 'CREATING' | 'CREATED' | 'ERROR' | null;
  folderUrl!: string | null;
  readAt!: string | null;
  documents!: CaseDocumentResponseDto[];
}
