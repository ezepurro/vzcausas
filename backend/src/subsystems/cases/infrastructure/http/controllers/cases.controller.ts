import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { PaginatedResponse, paginate, toPageRequest } from '@shared/infrastructure/http/pagination';
import { GetCase } from '../../../core/application/use-cases/get-case.use-case';
import { ListCases } from '../../../core/application/use-cases/list-cases.use-case';
import { ListCustomStates } from '../../../core/application/use-cases/list-custom-states.use-case';
import { RegisterCase } from '../../../core/application/use-cases/register-case.use-case';
import { RegisterProceduralAct } from '../../../core/application/use-cases/register-procedural-act.use-case';
import { InvalidCaseIdError } from '../../../core/domain/errors/case.errors';
import { CaseResponseDto } from '../dtos/case.response.dto';
import { DeadlinePreviewQueryDto } from '../dtos/deadline-preview.query.dto';
import { DeadlinePreviewResponseDto } from '../dtos/deadline-preview.response.dto';
import { ListCasesQueryDto } from '../dtos/list-cases.query.dto';
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
    private readonly listCases: ListCases,
    private readonly getCase: GetCase,
    private readonly listCustomStates: ListCustomStates,
    private readonly registerProceduralAct: RegisterProceduralAct,
    private readonly proceduralActMapper: ProceduralActHttpMapper,
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

  /**
   * `GET /cases/custom-states` (HU20, CA-20.4): los estados escritos a mano que
   * tienen hoy las causas activas, sin repetir y en orden alfabético.
   *
   * **Va declarado ARRIBA de `@Get(':caseId')`, y no es cosmético.** Nest
   * resuelve las rutas en orden de declaración: si estuviera abajo, el
   * parámetro se comería la ruta literal y `/cases/custom-states` respondería
   * `400 INVALID_PATH_PARAMETER` con `caseId: "custom-states"`. El índice del
   * contrato las lista en este mismo orden (§1, líneas 104 y 105).
   *
   * La respuesta no está paginada: es una lista corta de textos.
   */
  @Get('custom-states')
  async customStates(@Query('jurisdiction') jurisdiction?: string): Promise<{ data: string[] }> {
    return { data: await this.listCustomStates.execute({ jurisdiction }) };
  }

  /**
   * `GET /cases/{caseId}` (HU22). Devuelve **el mismo recurso que el listado**.
   *
   * Declarado después de `@Get('custom-states')`: Nest resuelve las rutas en
   * orden de declaración, así que una ruta con parámetro puesta antes se
   * comería a la literal.
   *
   * No choca con `@Get(':caseId/procedural-acts/deadline-preview')` (HU26, más
   * abajo): `:caseId` matchea **un** segmento, y esa ruta tiene tres, así que
   * el orden entre las dos no importa.
   *
   * El `caseId` llega como `string` y lo parsea `parseCaseId` en lugar de
   * dejárselo al pipe: así el error lleva el `INVALID_PATH_PARAMETER` del
   * contrato y no el `VALIDATION_ERROR` genérico.
   */
  @Get(':caseId')
  async getById(@Param('caseId') caseIdParam: string): Promise<{ data: CaseResponseDto }> {
    const item = await this.getCase.execute({ id: this.parseCaseId(caseIdParam) });
    return { data: CaseHttpMapper.toResponse(item) };
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
