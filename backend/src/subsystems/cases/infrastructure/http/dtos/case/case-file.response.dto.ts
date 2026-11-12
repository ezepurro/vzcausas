import { CaseDocumentResponseDto } from './case-documents.response.dto';

/** The case file generated (contract V5 §3.12, `:7760-7767`). */
export class CaseFileResponseDto {
  /** The PDF saved, with the structure of the document resource; `caseFile` brings `id` and `version`. */
  document!: CaseDocumentResponseDto;
  version!: number;
  pageCount!: number;
  parts!: Array<{ position: number; kind: 'COVER' | 'DOCUMENT'; documentId: string | null; name: string }>;
  generatedBy!: { id: number; lastName: string; firstName: string };
  generatedAt!: string;
}
