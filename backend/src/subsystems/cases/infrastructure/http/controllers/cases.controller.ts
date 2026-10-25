import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { PaginatedResponse, paginate, toPageRequest } from '@shared/infrastructure/http/pagination';
import { DeclarePrescription } from '../../../core/application/use-cases/declare-prescription.use-case';
import { GetCase } from '../../../core/application/use-cases/get-case.use-case';
import { GetProceduralAct } from '../../../core/application/use-cases/get-procedural-act.use-case';
import { ListCases } from '../../../core/application/use-cases/list-cases.use-case';
import { ListCustomStates } from '../../../core/application/use-cases/list-custom-states.use-case';
import { ListProceduralActs } from '../../../core/application/use-cases/list-procedural-acts.use-case';
import { RegisterCase } from '../../../core/application/use-cases/register-case.use-case';
import { RegisterProceduralAct } from '../../../core/application/use-cases/register-procedural-act.use-case';
import { RequestCaseFolder } from '../../../core/application/use-cases/request-case-folder.use-case';
import {
  CaseFolderUnavailableError,
  InvalidCaseIdError,
  InvalidProceduralActIdError,
} from '../../../core/domain/errors/case.errors';
import { CaseFolderResponseDto, CaseResponseDto } from '../dtos/case.response.dto';
import { DeadlinePreviewQueryDto } from '../dtos/deadline-preview.query.dto';
import { DeclarePrescriptionRequestDto } from '../dtos/declare-prescription.request.dto';
import { DeadlinePreviewResponseDto } from '../dtos/deadline-preview.response.dto';
import { ListCasesQueryDto } from '../dtos/list-cases.query.dto';
import { ListProceduralActsQueryDto } from '../dtos/list-procedural-acts.query.dto';
import { ProceduralActResponseDto } from '../dtos/procedural-act.response.dto';
import { RegisterCaseRequestDto } from '../dtos/register-case.request.dto';
import { RequestCaseFolderRequestDto } from '../dtos/request-case-folder.request.dto';
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
    private readonly requestCaseFolder: RequestCaseFolder,
    private readonly listCases: ListCases,
    private readonly getCase: GetCase,
    private readonly listCustomStates: ListCustomStates,
    private readonly registerProceduralAct: RegisterProceduralAct,
    private readonly listProceduralActs: ListProceduralActs,
    private readonly getProceduralAct: GetProceduralAct,
    private readonly proceduralActMapper: ProceduralActHttpMapper,
    private readonly caseMapper: CaseHttpMapper,
    private readonly declarePrescription: DeclarePrescription,
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
    return paginate(
      page.items.map((item) => this.caseMapper.toResponse(item)),
      page.totalItems,
      toPageRequest(query),
    );
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
    return { data: this.caseMapper.toResponse(item) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterCaseRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: CaseResponseDto }> {
    const result = await this.registerCase.execute({ ...dto, createdByUserId: actor.userId });
    return { data: this.caseMapper.fromRegisterResult(result) };
  }

  /**
   * `POST /cases/{caseId}/folder` (HU39): creates the folder of a case that has
   * none, or tries again after a failure. Idempotent: if the folder exists, or
   * is already being created, nothing new is asked and `200` returns it as it is.
   *
   * It waits for the answer up to a limit (`CASE_FOLDER_WAIT_MS`): a folder that
   * fails answers `502`; one still being created answers `200` with `CREATING`,
   * and the client reads the end of it with `GET /cases/{caseId}`.
   *
   * `copyTemplates` (HU40, `true` if omitted) also copies the templates of the
   * jurisdiction; on a `CREATED` folder with templates pending it copies only those.
   */
  @Post(':caseId/folder')
  @HttpCode(HttpStatus.OK)
  async createFolder(
    @Param('caseId') caseIdParam: string,
    @Body() dto: RequestCaseFolderRequestDto,
  ): Promise<{ data: CaseFolderResponseDto | null }> {
    const result = await this.requestCaseFolder.execute({
      caseId: this.parseCaseId(caseIdParam),
      copyTemplates: dto?.copyTemplates,
    });
    if (result.outcome === 'ERROR') {
      throw new CaseFolderUnavailableError();
    }
    return { data: result.folder && { ...result.folder } };
  }

  /**
   * `POST /cases/{caseId}/prescription` (HU33): marks a criminal case as
   * prescribed. `200`, not `201`: nothing new is created — the case changes and
   * goes back whole, as `GET /cases/{caseId}` shows it (D-54).
   *
   * No permission is declared: an administrator or any lawyer may do it
   * (CA-33.1), and the domain refuses the secretariat with the contract's own
   * `403` text, which the permissions guard could not give.
   */
  @Post(':caseId/prescription')
  @HttpCode(HttpStatus.OK)
  async markPrescribed(
    @Param('caseId') caseIdParam: string,
    @Body() dto: DeclarePrescriptionRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: CaseResponseDto }> {
    const item = await this.declarePrescription.execute({ ...dto, caseId: this.parseCaseId(caseIdParam), actor });
    return { data: this.caseMapper.toResponse(item) };
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

  /**
   * `GET /cases/{caseId}/procedural-acts` (HU27): the timeline of the case,
   * newest first. Any authenticated user, for any case (RN11): reading acts is
   * not limited to the responsible lawyer, registering them is.
   *
   * Each act goes out through the same `toResponse` as the `POST`.
   */
  @Get(':caseId/procedural-acts')
  async listActs(
    @Param('caseId') caseIdParam: string,
    @Query() query: ListProceduralActsQueryDto,
  ): Promise<PaginatedResponse<ProceduralActResponseDto>> {
    const pageRequest = toPageRequest(query);
    const page = await this.listProceduralActs.execute({ caseId: this.parseCaseId(caseIdParam), ...pageRequest });
    return paginate(
      page.items.map((view) => this.proceduralActMapper.toResponse(view)),
      page.totalItems,
      pageRequest,
    );
  }

  /**
   * `GET /cases/{caseId}/procedural-acts/{actId}` (HU27, CA-27.8).
   *
   * **Declarado después de `deadline-preview`, y no es cosmético.** Las dos
   * rutas tienen tres segmentos: si esta estuviera arriba, `:actId` se comería
   * la literal y la previsualización respondería `400 INVALID_PATH_PARAMETER`
   * con `actId: "deadline-preview"`.
   */
  @Get(':caseId/procedural-acts/:actId')
  async getAct(
    @Param('caseId') caseIdParam: string,
    @Param('actId') actIdParam: string,
  ): Promise<{ data: ProceduralActResponseDto }> {
    const view = await this.getProceduralAct.execute({
      caseId: this.parseCaseId(caseIdParam),
      actId: this.parseActId(actIdParam),
    });
    return { data: this.proceduralActMapper.toResponse(view) };
  }

  private parseCaseId(raw: string): number {
    const caseId = Number(raw);
    if (!Number.isInteger(caseId) || caseId <= 0) {
      throw new InvalidCaseIdError();
    }
    return caseId;
  }

  private parseActId(raw: string): number {
    const actId = Number(raw);
    if (!Number.isInteger(actId) || actId <= 0) {
      throw new InvalidProceduralActIdError();
    }
    return actId;
  }
}
