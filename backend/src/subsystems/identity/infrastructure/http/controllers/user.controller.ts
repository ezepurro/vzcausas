import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
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

/**
 * HTTP entry point for `/users` (API contract §3.2).
 *
 * Every route declares its permission with `@RequirePermissions`.
 * There is no `@UseGuards` here on purpose: `JwtAuthGuard` and
 * `PermissionsGuard` are registered globally in `AppModule` (D-57,
 * D-65), so a route is authenticated by default and this decorator
 * only adds the authorization check on top.
 *
 * ⚠️ NOT IN FORCE YET. That global registration is step P-13 of
 * IMPLEMENTACION_AUTH.md, still pending — `feat/auth` ships the
 * guards but composes no module. Until P-13 lands these decorators
 * are inert metadata and the endpoints answer unauthenticated. The
 * same is true of `AuthController`, which has been decorated since
 * P-12 for the same reason.
 *
 * ⚠️ The permission names below follow `prisma/seed.ts`
 * (`user:create`, `user:read`, …). `InMemoryRoleRepository` grants a
 * coarser set instead (`user:manage`), so whichever of the two is
 * bound to `ROLE_REPOSITORY` decides whether these checks pass. The
 * two vocabularies have to be reconciled at the final merge; picking
 * the seed's here is not a verdict, just the one that matches the
 * database the HU endpoints actually write to.
 */
@Controller("users")
export class UserController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly deactivateUser: DeactivateUserUseCase,
  ) {}

  @RequirePermissions("user:create")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterUserRequestDto,
  ): Promise<UserResponseDto> {
    const result = await this.registerUser.execute(
      UserHttpMapper.toRegisterCommand(dto),
    );
    return UserHttpMapper.toResponse(result);
  }

  @RequirePermissions("user:read")
  @Get(":userId")
  async getById(@Param("userId") userIdParam: string): Promise<UserResponseDto> {
    const result = await this.getUser.execute({
      id: this.parseUserId(userIdParam),
    });
    return UserHttpMapper.toResponse(result);
  }

  @RequirePermissions("user:update")
  @Patch(":userId")
  async update(
    @Param("userId") userIdParam: string,
    @Body() dto: UpdateUserRequestDto,
  ): Promise<UserResponseDto> {
    const result = await this.updateUser.execute(
      UserHttpMapper.toUpdateCommand(dto, this.parseUserId(userIdParam)),
    );
    return UserHttpMapper.toResponse(result);
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
