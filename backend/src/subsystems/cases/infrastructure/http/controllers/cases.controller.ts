import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { PaginatedResponse, paginate, toPageRequest } from '@shared/infrastructure/http/pagination';
import { GetCase } from '../../../core/application/use-cases/get-case.use-case';
import { ListCases } from '../../../core/application/use-cases/list-cases.use-case';
import { ListCustomStates } from '../../../core/application/use-cases/list-custom-states.use-case';
import { RegisterCase } from '../../../core/application/use-cases/register-case.use-case';
import { InvalidCaseIdError } from '../../../core/domain/errors/case.errors';
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
    private readonly getCase: GetCase,
    private readonly listCustomStates: ListCustomStates,
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
   * Declarado después de `@Get()`: Nest resuelve las rutas en orden de
   * declaración, así que una ruta con parámetro puesta antes se comería a la
   * literal. Cuando se agregue `@Get('custom-states')` (HU20) tiene que ir
   * **arriba** de este método, por el mismo motivo.
   *
   * El `caseId` llega como `string` y lo parsea el método de abajo en lugar de
   * dejárselo al pipe: así el error lleva el `INVALID_PATH_PARAMETER` del
   * contrato y no el `VALIDATION_ERROR` genérico.
   */
  @Get(':caseId')
  async getById(@Param('caseId') caseIdParam: string): Promise<{ data: CaseResponseDto }> {
    const item = await this.getCase.execute({ id: parseCaseId(caseIdParam) });
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
}

function parseCaseId(raw: string): number {
  const caseId = Number(raw);
  if (!Number.isInteger(caseId) || caseId <= 0) {
    throw new InvalidCaseIdError();
  }
  return caseId;
}
