import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { GetUserUseCase } from "../../../core/application/use-cases/get-user.use-case";
import { RegisterUserUseCase } from "../../../core/application/use-cases/register-user.use-case";
import { InvalidUserIdError } from "../../../core/domain/errors/identity.errors";
import { RegisterUserRequestDto } from "../dtos/register-user.request.dto";
import { UserResponseDto } from "../dtos/user.response.dto";
import { UserHttpMapper } from "../mappers/user-http.mapper";

// TODO: @UseGuards(JwtAuthGuard, PermissionsGuard) + @RequirePermissions("user:create"|"user:read")
// — pendiente de que exista el login (EP-01/HU-1..3). El contrato exige
// rol ADMINISTRATOR; hoy este controlador queda sin protección.
@Controller("users")
export class UserController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly getUser: GetUserUseCase,
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
    const userId = Number(userIdParam);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new InvalidUserIdError();
    }

    const result = await this.getUser.execute({ id: userId });
    return UserHttpMapper.toResponse(result);
  }
}
