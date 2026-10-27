import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { PaginatedResponse, paginate, toPageRequest } from '@shared/infrastructure/http/pagination/pagination';
import { ListInterruptiveActs } from '../../../core/application/use-cases/list-interruptive-acts.use-case';
import { RegisterInterruptiveAct } from '../../../core/application/use-cases/register-interruptive-act.use-case';
import { InvalidCaseIdError } from '../../../core/domain/errors/case.errors';
import { InterruptiveActResponseDto } from '../dtos/interruptive-act.response.dto';
import { ListInterruptiveActsQueryDto } from '../dtos/list-interruptive-acts.query.dto';
import { RegisterInterruptiveActRequestDto } from '../dtos/register-interruptive-act.request.dto';
import { InterruptiveActHttpMapper } from '../mappers/interruptive-act-http.mapper';

/**
 * HTTP entry point for `/cases/{caseId}/interruptive-acts` (HU31, contract V4
 * §3.9).
 *
 * Its own controller rather than more routes in `CasesController`: the resource
 * is separate from the procedural acts (D-48), and the path shares no segment
 * that could collide with the routes declared there.
 *
 * No permission is declared, like the rest of `/cases`: reading is for any
 * authenticated user (RN11), and registering is restricted by the domain to
 * the responsible lawyer of the case (D-50), which a permission cannot express.
 */
@Controller({ path: 'cases/:caseId/interruptive-acts', version: ['1'] })
export class InterruptiveActsController {
  constructor(
    private readonly registerInterruptiveAct: RegisterInterruptiveAct,
    private readonly listInterruptiveActs: ListInterruptiveActs,
    private readonly mapper: InterruptiveActHttpMapper,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Param('caseId') caseIdParam: string,
    @Body() dto: RegisterInterruptiveActRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: InterruptiveActResponseDto }> {
    const view = await this.registerInterruptiveAct.execute({
      caseId: this.parseCaseId(caseIdParam),
      actor,
      name: dto.name,
      actDate: dto.actDate,
      notes: dto.notes,
    });
    return { data: this.mapper.toResponse(view) };
  }

  @Get()
  async list(
    @Param('caseId') caseIdParam: string,
    @Query() query: ListInterruptiveActsQueryDto,
  ): Promise<PaginatedResponse<InterruptiveActResponseDto>> {
    const pageRequest = toPageRequest(query);
    const page = await this.listInterruptiveActs.execute({ caseId: this.parseCaseId(caseIdParam), ...pageRequest });
    return paginate(
      page.items.map((view) => this.mapper.toResponse(view)),
      page.totalItems,
      pageRequest,
    );
  }

  private parseCaseId(raw: string): number {
    const caseId = Number(raw);
    if (!Number.isInteger(caseId) || caseId <= 0) {
      throw new InvalidCaseIdError();
    }
    return caseId;
  }
}
