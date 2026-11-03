import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CaseFolderNotAvailableError, CaseNotFoundError } from '../../../domain/errors/case.errors';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';
import { CASE_DOCUMENTS, CaseDocumentsPort, GeneratedCaseFile } from '../../../domain/ports/case/case-documents.port';
import { CASE_FOLDER_STATE, CaseFolderStatePort } from '../../../domain/ports/case/case-folder-state.port';
import { COVER_PDF, CoverPdfPort } from '../../../domain/ports/case/cover-pdf.port';
import { CaseFileRequest, CaseFileRequestInput } from '../../../domain/value-objects/case/case-file-request.vo';
import { CoverSheet } from '../../../domain/value-objects/case/cover-sheet.vo';

/**
 * `POST /cases/{caseId}/case-files` (HU25): the case file (expediente) of a case —
 * the cover sheet and the chosen documents of its folder, in one PDF — saved as a
 * new version in the folder (D-102).
 *
 * Any authenticated user (matrix of HU18 to HU25): there is no 403. `cases`
 * answers for the shape of the request, the case, its folder and what the cover
 * sheet says (D-94: the same `CoverSheet` as `GET /cover`, plus what the user
 * completes, D-92); `documents` answers for the documents and for saving the
 * result. Order of the checks: 400 of shape → 404 → 422 of the folder → 400 of
 * the cover → (in `documents`) 400 of the documents → 422 not convertible → 502.
 *
 * It never touches the case (CA-25.11): nothing of `cover` is stored, and the
 * state and the cover sheet stay as they were.
 */
@Injectable()
export class GenerateCaseFile {
  constructor(
    @Inject(CASE_FOLDER_STATE) private readonly folders: CaseFolderStatePort,
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(COVER_PDF) private readonly coverPdf: CoverPdfPort,
    @Inject(CASE_DOCUMENTS) private readonly documents: CaseDocumentsPort,
  ) {}

  /**
   * @throws ValidationError 400: the shape of the request (CA-25.2, CA-25.5) or `opposingParty` out of the criminal jurisdiction.
   * @throws {CaseNotFoundError} 404: the case does not exist or was given de baja (CA-25.12).
   * @throws {CaseFolderNotAvailableError} 422: the folder is not `CREATED` (CA-25.7).
   * @throws 400, 422 and 502 from `documents` (CA-25.3, CA-25.4, CA-25.8).
   */
  async execute(input: {
    caseId: number;
    request: CaseFileRequestInput;
    actor: AuthenticatedUser;
  }): Promise<GeneratedCaseFile> {
    const request = CaseFileRequest.create(input.request);

    const folder = await this.folders.findActiveCaseFolder(input.caseId);
    if (folder === null) {
      throw new CaseNotFoundError();
    }
    if (folder.cloudFolderId === null) {
      throw new CaseFolderNotAvailableError();
    }
    const source = await this.cases.findListItemById(input.caseId);
    if (source === null) {
      // Given de baja between the two reads.
      throw new CaseNotFoundError();
    }

    const sheet = CoverSheet.forCaseFile(source, request.cover);
    const coverPdf = await this.coverPdf.render(sheet);

    return this.documents.generateCaseFile({
      caseId: input.caseId,
      sacNumber: source.sacNumber,
      cloudFolderId: folder.cloudFolderId,
      coverPdf,
      documentIds: request.documentIds,
      actor: input.actor,
    });
  }
}
