import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { DeactivateUserUseCase } from "../../../core/application/use-cases/deactivate-user.use-case";
import { GetUserUseCase } from "../../../core/application/use-cases/get-user.use-case";
import { RegisterUserUseCase } from "../../../core/application/use-cases/register-user.use-case";
import { UpdateUserUseCase } from "../../../core/application/use-cases/update-user.use-case";
import { InvalidUserIdError } from "../../../core/domain/errors/identity.errors";
import { RegisterUserRequestDto } from "../dtos/register-user.request.dto";
import { UpdateUserRequestDto } from "../dtos/update-user.request.dto";
import { UserResponseDto } from "../dtos/user.response.dto";
import { UserHttpMapper } from "../mappers/user-http.mapper";
import { RequirePermissions } from "@shared/infrastructure/http/require-permissions.decorator";
import {
  PaginatedResponse,
  paginate,
  toPageRequest,
} from "@shared/infrastructure/http/pagination";
import { ListUsersUseCase } from "../../../core/application/use-cases/list-users.use-case";
import { ListUsersQueryDto } from "../dtos/list-users.query.dto";

/**
 * HTTP entry point for `/users` (API contract §3.2).
 *
 * Every route declares its permission with `@RequirePermissions`.
 * There is no `@UseGuards` here on purpose: `JwtAuthGuard` and
 * `PermissionsGuard` are registered globally in `AppModule` (D-57,
 * D-65, landed in P-13), so a route is authenticated by default and
 * this decorator only adds the authorization check on top.
 *
 * The permission names below follow `prisma/seed.ts` (`user:create`,
 * `user:read`, …), the catalogue `PrismaRoleRepository` reads — the
 * in-memory repository these permissions were reconciled against was
 * retired in P-15.
 */
@Controller("users")
export class UserController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly deactivateUser: DeactivateUserUseCase,
  ) {}

  @RequirePermissions("user:create")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterUserRequestDto,
  ): Promise<{ data: UserResponseDto }> {
    const result = await this.registerUser.execute(
      UserHttpMapper.toRegisterCommand(dto),
    );
    return { data: UserHttpMapper.toResponse(result) };
  }

  /**
   * Declared before `@Get(":userId")`: Nest matches routes in
   * declaration order, and the parametric one would otherwise
   * swallow `GET /users` as a request for the user whose id is the
   * empty string.
   */
  @RequirePermissions("user:read")
  @Get()
  async list(
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const page = toPageRequest(query);

    const result = await this.listUsers.execute({
      page: page.page,
      limit: page.limit,
      search: query.search,
      role: query.role,
    });

    return paginate(
      result.users.map((listed) => UserHttpMapper.toResponse(listed)),
      result.totalItems,
      page,
    );
  }

  @RequirePermissions("user:read")
  @Get(":userId")
  async getById(
    @Param("userId") userIdParam: string,
  ): Promise<{ data: UserResponseDto }> {
    const result = await this.getUser.execute({
      id: this.parseUserId(userIdParam),
    });
    return { data: UserHttpMapper.toResponse(result) };
  }

  @RequirePermissions("user:update")
  @Patch(":userId")
  async update(
    @Param("userId") userIdParam: string,
    @Body() dto: UpdateUserRequestDto,
  ): Promise<{ data: UserResponseDto }> {
    const result = await this.updateUser.execute(
      UserHttpMapper.toUpdateCommand(dto, this.parseUserId(userIdParam)),
    );
    return { data: UserHttpMapper.toResponse(result) };
  }

  @RequirePermissions("user:delete")
  @Delete(":userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param("userId") userIdParam: string): Promise<void> {
    await this.deactivateUser.execute({ id: this.parseUserId(userIdParam) });
  }

  private parseUserId(raw: string): number {
    const userId = Number(raw);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new InvalidUserIdError();
    }
    return userId;
  }
}
