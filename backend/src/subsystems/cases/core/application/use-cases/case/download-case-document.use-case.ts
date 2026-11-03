import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CaseDocumentNotFoundError, CaseNotFoundError } from '../../../domain/errors/case.errors';
import { CASE_DOCUMENTS, CaseDocumentFile, CaseDocumentsPort } from '../../../domain/ports/case/case-documents.port';
import { CASE_FOLDER_STATE, CaseFolderStatePort } from '../../../domain/ports/case/case-folder-state.port';

/**
 * `GET /cases/{caseId}/documents/{documentId}/file` (HU38, HU25): one file of
 * the case folder, through the API.
 *
 * `cases` answers for the case and its folder; who may download the file, and
 * whether it is in the folder, is `documents`' to decide (D-103, CA-38.8).
 * Order of the checks: 404 of the case → 404 of a folder not created → 403 →
 * 404 of the document → 502.
 */
@Injectable()
export class DownloadCaseDocument {
  constructor(
    @Inject(CASE_FOLDER_STATE) private readonly folders: CaseFolderStatePort,
    @Inject(CASE_DOCUMENTS) private readonly documents: CaseDocumentsPort,
  ) {}

  /**
   * @throws {CaseNotFoundError} 404: the case does not exist or was given de baja (CA-38.9).
   * @throws {CaseDocumentNotFoundError} 404: the folder is not created, so no document is in it.
   * @throws 403, 404 `DOCUMENT_NOT_FOUND` and 502 from `documents`.
   */
  async execute(input: { caseId: number; documentId: string; actor: AuthenticatedUser }): Promise<CaseDocumentFile> {
    const folder = await this.folders.findActiveCaseFolder(input.caseId);
    if (folder === null) {
      throw new CaseNotFoundError();
    }
    if (folder.cloudFolderId === null) {
      throw new CaseDocumentNotFoundError();
    }

    return this.documents.download(folder.cloudFolderId, input.documentId, input.actor);
  }
}
