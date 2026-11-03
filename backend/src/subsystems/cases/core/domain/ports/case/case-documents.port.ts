import { AuthenticatedUser } from '@shared/domain/authenticated-user';

/** DI token for {@link CaseDocumentsPort}. */
export const CASE_DOCUMENTS = Symbol('CASE_DOCUMENTS');

/** A file of the folder of a case, with the eleven fields of the resource (V5 §3.12). */
export interface CaseDocumentItem {
  id: string;
  name: string;
  extension: string | null;
  mimeType: string;
  sizeBytes: number | null;
  createdAt: Date;
  modifiedAt: Date;
  uploadedBy: string | null;
  url: string;
  convertibleToPdf: boolean;
  caseFile: { id: number; version: number } | null;
}

/** The content of a file, with the name and type it is handed out with. */
export interface CaseDocumentFile {
  fileName: string;
  mimeType: string;
  content: Buffer;
}

/** What `documents` needs to generate a case file (HU25): the case only as ids and its SAC. */
export interface GenerateCaseFileInput {
  caseId: number;
  /** For the file name; `null` when the case has none (CA-25.6). */
  sacNumber: string | null;
  /** The folder of the case, already `CREATED`. */
  cloudFolderId: string;
  /** The cover sheet, already drawn: the first page (CA-25.1, D-94). */
  coverPdf: Uint8Array;
  /** In the order of the case file, none repeated. */
  documentIds: readonly string[];
  actor: AuthenticatedUser;
}

/** One part of the case file, in order (V5 `:7765`). */
export interface CaseFilePartItem {
  position: number;
  kind: 'COVER' | 'DOCUMENT';
  documentId: string | null;
  name: string;
}

/** The case file generated and saved (CA-25.9). */
export interface GeneratedCaseFile {
  /** The PDF saved in the folder, with its `caseFile`. */
  document: CaseDocumentItem;
  version: number;
  pageCount: number;
  parts: CaseFilePartItem[];
  generatedBy: { id: number; lastName: string; firstName: string };
  generatedAt: Date;
}

/**
 * Port towards `documents`, which owns the storage and `case_files` (HU38, HU25).
 * Its adapter lives in `cases/infrastructure/acl/` and calls the use cases
 * `documents` exports (`ARQUITECTURA_BACKEND_V1.md` §6.2), as `CoverPdfPort`
 * does. `cases` decides whether there is a case and a folder to read; what is
 * in the folder, and who may download each file, is `documents`' to say.
 *
 * Its failures (`FORBIDDEN`, `DOCUMENT_NOT_FOUND`, `DOCUMENT_STORAGE_UNAVAILABLE`)
 * reach the client as they are: `cases` does not catch them.
 */
export interface CaseDocumentsPort {
  /** The files directly in the folder, in no given order. */
  list(cloudFolderId: string): Promise<CaseDocumentItem[]>;

  /** One file of the folder, if it is there and the actor may download it. */
  download(cloudFolderId: string, documentId: string, actor: AuthenticatedUser): Promise<CaseDocumentFile>;

  /**
   * Generates the case file with the cover sheet and those documents, and saves
   * it as a new version in the folder (HU25). Nothing is left half done if it fails.
   */
  generateCaseFile(input: GenerateCaseFileInput): Promise<GeneratedCaseFile>;
}
