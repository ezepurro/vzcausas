import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { PaginatedResponse, paginate, toPageRequest } from '@shared/infrastructure/http/pagination';
import { ListCases } from '../../../core/application/use-cases/list-cases.use-case';
import { RegisterCase } from '../../../core/application/use-cases/register-case.use-case';
import { CaseResponseDto } from '../dtos/case.response.dto';
import { ListCasesQueryDto } from '../dtos/list-cases.query.dto';
import { RegisterCaseRequestDto } from '../dtos/register-case.request.dto';
import { CaseHttpMapper } from '../mappers/case-http.mapper';

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
    private readonly listCases: ListCases,
  ) {}

  /**
   * `GET /cases` (HU20). No role is required beyond being authenticated, and
   * nothing here narrows the result by the caller: RN11 says the whole firm
   * sees every case.
   *
   * Declared before any `@Get(':caseId')`: Nest matches routes in declaration
   * order, so a parameterised route added above this one would swallow it.
   */
  @Get()
  async list(@Query() query: ListCasesQueryDto): Promise<PaginatedResponse<CaseResponseDto>> {
    const page = await this.listCases.execute(CaseHttpMapper.toSearchCriteria(query));
    return paginate(page.items.map(CaseHttpMapper.toResponse), page.totalItems, toPageRequest(query));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterCaseRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: CaseResponseDto }> {
    const result = await this.registerCase.execute({ ...dto, createdByUserId: actor.userId });
    return { data: CaseHttpMapper.fromRegisterResult(result) };
  }
}
