import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { RegisterUserUseCase } from "../../../core/application/use-cases/register-user.use-case";
import { RegisterUserRequestDto } from "../dtos/register-user.request.dto";
import { UserResponseDto } from "../dtos/user.response.dto";
import { UserHttpMapper } from "../mappers/user-http.mapper";

// TODO: @UseGuards(JwtAuthGuard, PermissionsGuard) + @RequirePermissions("user:create")
// — pendiente de que exista el login (EP-01/HU-1..3). El contrato exige
// rol ADMINISTRATOR; hoy este endpoint queda sin protección.
@Controller("users")
export class UserController {
  constructor(private readonly registerUser: RegisterUserUseCase) {}

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
}
