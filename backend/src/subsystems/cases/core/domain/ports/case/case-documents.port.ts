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

/**
 * Port towards `documents`, which owns the storage and `case_files` (HU38).
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
}
