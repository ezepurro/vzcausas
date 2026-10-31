import { Controller, Get, Param, Query, StreamableFile } from '@nestjs/common';
import { GetCaseCover } from '../../../core/application/use-cases/case/get-case-cover.use-case';
import { InvalidCaseIdError, InvalidCoverDispositionError } from '../../../core/domain/errors/case.errors';

const DISPOSITIONS = ['inline', 'attachment'] as const;
type Disposition = (typeof DISPOSITIONS)[number];

/**
 * `GET /cases/{caseId}/cover` (HU24, contract V5 §3.7): the cover sheet of a case as a
 * PDF, the one success response of `cases` that is not JSON; its errors still are.
 *
 * Its own controller, like the timeline: the path shares no segment that could collide
 * with `CasesController`. No permission is declared: any authenticated user may issue
 * it (matrix of HU18 to HU25), so there is no 403.
 *
 * The shape of the request is checked before the case is read (401 → 400 → 404), and a
 * rejected request writes nothing: nothing here ever writes.
 */
@Controller({ path: 'cases/:caseId/cover', version: ['1'] })
export class CaseCoverController {
  constructor(private readonly getCaseCover: GetCaseCover) {}

  @Get()
  async get(
    @Param('caseId') caseIdParam: string,
    @Query('disposition') dispositionParam?: string,
  ): Promise<StreamableFile> {
    const caseId = Number(caseIdParam);
    if (!Number.isInteger(caseId) || caseId <= 0) {
      throw new InvalidCaseIdError();
    }
    const disposition = this.parseDisposition(dispositionParam);

    const cover = await this.getCaseCover.execute({ id: caseId });

    return new StreamableFile(cover.content, {
      type: 'application/pdf',
      length: cover.content.length,
      disposition: `${disposition}; filename="${cover.fileName}"`,
    });
  }

  /** `inline` when absent (CA-24.10); anything else that is not one of the two is a 400. */
  private parseDisposition(raw: unknown): Disposition {
    if (raw === undefined) {
      return 'inline';
    }
    if (!DISPOSITIONS.includes(raw as Disposition)) {
      throw new InvalidCoverDispositionError();
    }
    return raw as Disposition;
  }
}
