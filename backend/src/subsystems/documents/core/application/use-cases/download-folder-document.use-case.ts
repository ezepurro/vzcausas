import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CaseDocument, PDF_MIME_TYPE } from '../../domain/entities/case-document.entity';
import {
  CaseDocumentDownloadUnavailableError,
  DocumentNotFoundError,
  DocumentStorageUnavailableError,
} from '../../domain/errors/documents.errors';
import { CASE_FILE_REPOSITORY, CaseFileRepository } from '../../domain/ports/case-file.repository';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';

/** The file of a document, ready to hand to the user. */
export interface DocumentFileResult {
  fileName: string;
  mimeType: string;
  content: Buffer;
}

/**
 * HU38 (and HU25, for the case file just generated): one file of a case
 * folder, through the API. A storage link does not respect the profiles, and
 * a user who is only `ADMINISTRATOR` has no access to the study's folder (V5
 * `:7589-7593`).
 *
 * Exported for `cases`, which checks the case first and calls it through its
 * ACL adapter. The order of the checks is the contract's: who may download is
 * decided from `case_files` alone, **before** the storage is asked anything
 * (403 before 404, D-103); then the file has to exist and be in this folder.
 */
@Injectable()
export class DownloadFolderDocument {
  constructor(
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    @Inject(CASE_FILE_REPOSITORY) private readonly caseFiles: CaseFileRepository,
  ) {}

  /**
   * @throws {ForbiddenActionError} 403: not a case file, and the actor is neither `LAWYER` nor `SECRETARY`.
   * @throws {DocumentNotFoundError} 404: missing, in the trash or in another folder (CA-38.8).
   * @throws {CaseDocumentDownloadUnavailableError} 502: the storage did not answer (CA-38.6).
   */
  async execute(input: { folderId: string; documentId: string; actor: AuthenticatedUser }): Promise<DocumentFileResult> {
    const caseFile = await this.caseFiles.findByCloudFileId(input.documentId);
    CaseDocument.assertCanBeDownloadedBy(input.actor, caseFile !== null);

    const stored = await this.unlessUnavailable(() => this.storage.findFile(input.documentId));
    const document = stored ? CaseDocument.fromStorage(stored, caseFile) : null;
    if (!document?.isIn(input.folderId)) {
      throw new DocumentNotFoundError();
    }

    // A native document has no bytes of its own: it leaves exported to PDF (V5 `:7595`).
    const content = await this.unlessUnavailable(() =>
      document.isGoogleNative
        ? this.storage.exportFile(document.id, PDF_MIME_TYPE)
        : this.storage.downloadFile(document.id),
    );
    return { fileName: document.downloadName, mimeType: document.downloadMimeType, content };
  }

  private async unlessUnavailable<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof DocumentStorageUnavailableError) {
        throw new CaseDocumentDownloadUnavailableError();
      }
      throw error;
    }
  }
}
