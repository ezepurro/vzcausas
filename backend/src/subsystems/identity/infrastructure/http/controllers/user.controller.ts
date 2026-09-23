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

// TODO: @UseGuards(JwtAuthGuard, PermissionsGuard) + @RequirePermissions("user:create"|"user:read"|"user:update"|"user:delete")
// — pendiente de que exista el login (EP-01/HU-1..3). El contrato exige
// rol ADMINISTRATOR; hoy este controlador queda sin protección.
@Controller("users")
export class UserController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly deactivateUser: DeactivateUserUseCase,
  ) {}

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

  @Get(":userId")
  async getById(@Param("userId") userIdParam: string): Promise<UserResponseDto> {
    const result = await this.getUser.execute({
      id: this.parseUserId(userIdParam),
    });
    return UserHttpMapper.toResponse(result);
  }

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
