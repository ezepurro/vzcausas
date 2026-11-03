import { Inject, Injectable } from '@nestjs/common';
import { CaseDocument, CaseDocumentSnapshot } from '../../domain/entities/case-document.entity';
import { CaseFolderReadUnavailableError, DocumentStorageUnavailableError } from '../../domain/errors/documents.errors';
import { CASE_FILE_REPOSITORY, CaseFileRepository } from '../../domain/ports/case-file.repository';
import { DOCUMENT_STORAGE, DocumentStoragePort } from '../../domain/ports/document-storage.port';

/** A document of the folder, as `cases` receives it: plain data, not the entity (§6.3). */
export type FolderDocumentResult = CaseDocumentSnapshot;

/**
 * HU38: the documents of a case folder, read from the storage on every call
 * (D-100) and crossed with `case_files` to mark the case files the system
 * generated (CA-38.4).
 *
 * Exported for `cases`, which owns `GET /cases/{caseId}/documents` and calls
 * it through its ACL adapter (`ARQUITECTURA_BACKEND_V1.md` §6.2). It knows
 * nothing about cases: it receives a folder id. The order of the list is the
 * listing's business, not this one's.
 */
@Injectable()
export class ListFolderDocuments {
  constructor(
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStoragePort,
    @Inject(CASE_FILE_REPOSITORY) private readonly caseFiles: CaseFileRepository,
  ) {}

  /** @throws {CaseFolderReadUnavailableError} 502: the storage did not answer (CA-38.6). */
  async execute(input: { folderId: string }): Promise<FolderDocumentResult[]> {
    const stored = await this.listFiles(input.folderId);
    const caseFiles = await this.caseFiles.findByCloudFileIds(stored.map((file) => file.id));

    return stored.map((file) => CaseDocument.fromStorage(file, caseFiles.get(file.id) ?? null).snapshot());
  }

  private async listFiles(folderId: string) {
    try {
      return await this.storage.listFiles(folderId);
    } catch (error) {
      if (error instanceof DocumentStorageUnavailableError) {
        throw new CaseFolderReadUnavailableError();
      }
      throw error;
    }
  }
}
