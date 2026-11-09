import { Inject, Injectable } from '@nestjs/common';
import { CaseNotFoundError } from '../../../domain/errors/case.errors';
import { CASE_REPOSITORY, CaseRepository } from '../../../domain/ports/case/case.repository';
import { COVER_PDF, CoverPdfPort } from '../../../domain/ports/case/cover-pdf.port';
import { CoverSheet } from '../../../domain/value-objects/case/cover-sheet.vo';

export interface CaseCover {
  content: Uint8Array;
  fileName: string;
}

/**
 * `GET /cases/{caseId}/cover` (HU24): the cover sheet of a case, as a PDF.
 *
 * Nothing is stored (CA-24.1): the sheet is rebuilt from the current data on every
 * call, so a change to the client, the role, the lawyer, the instructor or the
 * counterparty shows on the next emission (CA-24.8). What each box says is decided
 * by {@link CoverSheet}; drawing it is `documents`' job, behind {@link CoverPdfPort}.
 *
 * A case given de baja answers the same as one that never existed (CA-24.11), and
 * the Drive folder plays no part: a case without one is emitted all the same (CA-24.9).
 */
@Injectable()
export class GetCaseCover {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(COVER_PDF) private readonly coverPdf: CoverPdfPort,
  ) {}

  async execute(query: { id: number }): Promise<CaseCover> {
    const found = await this.cases.findListItemById(query.id);
    if (found === null) {
      throw new CaseNotFoundError();
    }

    const sheet = CoverSheet.create(found);
    return { content: await this.coverPdf.render(sheet), fileName: sheet.fileName };
  }
}
