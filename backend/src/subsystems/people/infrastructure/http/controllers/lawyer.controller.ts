import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { AuthenticatedUser } from "@shared/domain/authenticated-user";
import { CurrentUser } from "@shared/infrastructure/http/current-user.decorator";
import { RequirePermissions } from "@shared/infrastructure/http/require-permissions.decorator";
import {
  PaginatedResponse,
  PaginationQueryDto,
  paginate,
  toPageRequest,
} from "@shared/infrastructure/http/pagination/pagination";
import { FindLawyerUseCase } from "../../../core/application/use-cases/find-lawyer.use-case";
import { ListLawyersUseCase } from "../../../core/application/use-cases/list-lawyers.use-case";
import { RegisterLawyerUseCase } from "../../../core/application/use-cases/register-lawyer.use-case";
import { UpdateLawyerUseCase } from "../../../core/application/use-cases/update-lawyer.use-case";
import {
  InvalidLawyerIdError,
  LawyerNotFoundError,
} from "../../../core/domain/errors/people.errors";
import { LawyerResponseDto } from "../dtos/lawyer.response.dto";
import { RegisterLawyerRequestDto } from "../dtos/register-lawyer.request.dto";
import { UpdateLawyerRequestDto } from "../dtos/update-lawyer.request.dto";
import { LawyerHttpMapper } from "../mappers/lawyer-http.mapper";

/**
 * HTTP entry point for `/lawyers` (API contract §3.3).
 *
 * Authorization works exactly as in `identity`'s `UserController`:
 * the permission is declared here, the guards are registered
 * globally in `AppModule`, and none of it is in force until step
 * P-13 of IMPLEMENTACION_AUTH.md composes the modules. See that
 * controller's docstring for the permission-vocabulary caveat.
 *
 * Every response is wrapped in the contract's `{ data }` envelope —
 * `{ data, pagination }` for the collection.
 */
@Controller("lawyers")
export class LawyerController {
  constructor(
    private readonly registerLawyer: RegisterLawyerUseCase,
    private readonly listLawyers: ListLawyersUseCase,
    private readonly findLawyer: FindLawyerUseCase,
    private readonly updateLawyer: UpdateLawyerUseCase,
  ) {}

  @RequirePermissions("lawyer:create")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterLawyerRequestDto,
  ): Promise<{ data: LawyerResponseDto }> {
    const result = await this.registerLawyer.execute(
      LawyerHttpMapper.toRegisterCommand(dto),
    );
    return { data: LawyerHttpMapper.toRegisteredResponse(result.lawyer) };
  }

  @RequirePermissions("lawyer:read")
  @Get()
  async list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<LawyerResponseDto>> {
    const page = toPageRequest(query);

    const result = await this.listLawyers.execute({
      page: page.page,
      limit: page.limit,
      search: query.search,
    });

    return paginate(
      result.lawyers.map((counted) =>
        LawyerHttpMapper.toResponse(counted.lawyer, counted.activeCases),
      ),
      result.totalItems,
      page,
    );
  }

  /**
   * A deactivated lawyer answers 404, not a payload with
   * `active: false`: §3.3 states that once logically deleted *"no
   * existe forma de consultarlo"*, mirroring how `GET
   * /users/{userId}` treats a deactivated user.
   */
  @RequirePermissions("lawyer:read")
  @Get(":lawyerId")
  async getById(
    @Param("lawyerId") lawyerIdParam: string,
  ): Promise<{ data: LawyerResponseDto }> {
    const lawyerId = this.parseLawyerId(lawyerIdParam);

    const lawyer = await this.findLawyer.execute({ id: lawyerId });
    if (lawyer === null || !lawyer.active) {
      throw new LawyerNotFoundError(lawyerId);
    }

    return { data: LawyerHttpMapper.fromView(lawyer) };
  }

  /**
   * HU14. Only the fields sent are touched. The `403` for anyone who is not an
   * administrator comes from the permission, before the lawyer is read
   * (CA-14.6). The user goes to the audit record (CA-14.5); the correlation id
   * gets there on its own, through `RequestContext`.
   */
  @RequirePermissions("lawyer:update")
  @Patch(":lawyerId")
  async update(
    @Param("lawyerId") lawyerIdParam: string,
    @Body() dto: UpdateLawyerRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: LawyerResponseDto }> {
    const lawyer = await this.updateLawyer.execute({
      lawyerId: this.parseLawyerId(lawyerIdParam),
      changes: {
        lastName: dto.lastName,
        firstName: dto.firstName,
        registrationNumber: dto.registrationNumber,
      },
      actorUserId: actor.userId,
    });
    return { data: LawyerHttpMapper.fromView(lawyer) };
  }

  private parseLawyerId(raw: string): number {
    const lawyerId = Number(raw);
    if (!Number.isInteger(lawyerId) || lawyerId <= 0) {
      throw new InvalidLawyerIdError();
    }
    return lawyerId;
  }
}
