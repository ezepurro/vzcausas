import { Controller, Get, Param } from '@nestjs/common';
import { GetCaseTimeline } from '../../../core/application/use-cases/case/get-case-timeline.use-case';
import { InvalidCaseIdError } from '../../../core/domain/errors/case.errors';
import { TimelineEntryResponseDto } from '../dtos/case/timeline.response.dto';
import { TimelineHttpMapper } from '../mappers/timeline-http.mapper';

/**
 * `GET /cases/{caseId}/timeline` (HU27, contract V4 D-85): the line of life of
 * a case, complete and not paginated.
 *
 * Its own controller, like the interruptive acts: the path shares no segment
 * that could collide with the routes of `CasesController`. No permission is
 * declared: any authenticated user reads any case (RN11).
 */
@Controller({ path: 'cases/:caseId/timeline', version: ['1'] })
export class CaseTimelineController {
  constructor(
    private readonly getCaseTimeline: GetCaseTimeline,
    private readonly mapper: TimelineHttpMapper,
  ) {}

  @Get()
  async get(@Param('caseId') caseIdParam: string): Promise<{ data: TimelineEntryResponseDto[] }> {
    const caseId = Number(caseIdParam);
    if (!Number.isInteger(caseId) || caseId <= 0) {
      throw new InvalidCaseIdError();
    }
    const entries = await this.getCaseTimeline.execute({ caseId });
    return { data: this.mapper.toResponse(entries) };
  }
}
