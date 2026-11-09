import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CaseNotFoundError } from '../../../domain/errors/case.errors';
import { CASE_DOCUMENTS, CaseDocumentsPort } from '../../../domain/ports/case/case-documents.port';
import { CASE_FOLDER_STATE, CaseFolderStatePort } from '../../../domain/ports/case/case-folder-state.port';
import { CaseDocumentListing } from '../../../domain/value-objects/case/case-document-listing.vo';

/**
 * `GET /cases/{caseId}/documents` (HU38): the files of the case folder,
 * read from the storage on every request (D-100, CA-38.2).
 *
 * Any authenticated user, the administrator included (C-27, V5 `:8024`): there
 * is no 403. A case given de baja answers the same as one that never existed
 * (D-97, CA-38.9). With the folder not created there is nothing to read, so
 * `documents` is not asked (CA-38.5).
 */
@Injectable()
export class ListCaseDocuments {
  constructor(
    @Inject(CASE_FOLDER_STATE) private readonly folders: CaseFolderStatePort,
    @Inject(CASE_DOCUMENTS) private readonly documents: CaseDocumentsPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /**
   * @throws {CaseNotFoundError} 404.
   * @throws 502 `DOCUMENT_STORAGE_UNAVAILABLE` from `documents`: the storage did not answer (CA-38.6).
   */
  async execute(query: { caseId: number }): Promise<CaseDocumentListing> {
    const folder = await this.folders.findActiveCaseFolder(query.caseId);
    if (folder === null) {
      throw new CaseNotFoundError();
    }
    if (folder.cloudFolderId === null) {
      return CaseDocumentListing.notRead(folder);
    }

    const documents = await this.documents.list(folder.cloudFolderId);
    return CaseDocumentListing.read(folder, documents, this.clock.now());
  }
}
