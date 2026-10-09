import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { RegisterCase } from '../../../core/application/use-cases/register-case.use-case';
import { RegisterProceduralAct } from '../../../core/application/use-cases/register-procedural-act.use-case';
import { AdministrativeCase } from '../../../core/domain/entities/administrative';
import { Amparo } from '../../../core/domain/entities/amparo';
import { InvalidCaseIdError } from '../../../core/domain/errors/case.errors';
import { CaseResponseDto } from '../dtos/case.response.dto';
import { DeadlinePreviewQueryDto } from '../dtos/deadline-preview.query.dto';
import { DeadlinePreviewResponseDto } from '../dtos/deadline-preview.response.dto';
import { ProceduralActResponseDto } from '../dtos/procedural-act.response.dto';
import { RegisterCaseRequestDto } from '../dtos/register-case.request.dto';
import { CaseHttpMapper } from '../mappers/case-http.mapper';
import { RegisterProceduralActRequestDto } from '../dtos/register-procedural-act.request.dto';
import { ProceduralActHttpMapper } from '../mappers/procedural-act-http.mapper';

/**
 * HTTP entry point for `/cases` (API contract §3.7). Any authenticated user
 * can register a case (RN11), so no permission is declared: the global
 * authentication guard is enough.
 *
 * The response is built by {@link CaseHttpMapper}, shared with the listing
 * and the detail: the contract requires the three to return the same
 * resource, so the shape cannot live in a single endpoint.
 */
@Controller({ path: 'cases', version: ['1'] })
export class CasesController {
  constructor(
    private readonly registerCase: RegisterCase,
    private readonly registerProceduralAct: RegisterProceduralAct,
    private readonly proceduralActMapper: ProceduralActHttpMapper,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterCaseRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: CaseResponseDto }> {
    const result = await this.registerCase.execute({ ...dto, createdByUserId: actor.userId });
    return { data: CaseHttpMapper.fromRegisterResult(result) };
  }

  /**
   * HU26. Only the lawyer in charge of the case may register its acts (D-30):
   * the domain checks it, so no permission is declared here either.
   */
  @Post(':caseId/procedural-acts')
  @HttpCode(HttpStatus.CREATED)
  async registerAct(
    @Param('caseId') caseIdParam: string,
    @Body() dto: RegisterProceduralActRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: ProceduralActResponseDto }> {
    const caseId = this.parseCaseId(caseIdParam);
    const result = await this.registerProceduralAct.execute(this.proceduralActMapper.toCommand(caseId, dto, actor));
    return { data: this.proceduralActMapper.toResponse(result) };
  }

  /**
   * The deadline an act would open, without registering it. Same rule as the
   * registration: only the lawyer in charge of the case.
   */
  @Get(':caseId/procedural-acts/deadline-preview')
  async previewDeadline(
    @Param('caseId') caseIdParam: string,
    @Query() query: DeadlinePreviewQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: DeadlinePreviewResponseDto }> {
    const caseId = this.parseCaseId(caseIdParam);
    const result = await this.registerProceduralAct.previewDeadline(
      this.proceduralActMapper.toPreviewQuery(caseId, query, actor),
    );
    return { data: this.proceduralActMapper.toPreviewResponse(result) };
  }

  private parseCaseId(raw: string): number {
    const caseId = Number(raw);
    if (!Number.isInteger(caseId) || caseId <= 0) {
      throw new InvalidCaseIdError();
    }
    return caseId;
  }
}
