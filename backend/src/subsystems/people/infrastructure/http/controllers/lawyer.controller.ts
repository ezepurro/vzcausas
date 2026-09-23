import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { RegisterLawyerUseCase } from "../../../core/application/use-cases/register-lawyer.use-case";
import { LawyerResponseDto } from "../dtos/lawyer.response.dto";
import { RegisterLawyerRequestDto } from "../dtos/register-lawyer.request.dto";
import { LawyerHttpMapper } from "../mappers/lawyer-http.mapper";

// TODO: @UseGuards(JwtAuthGuard, PermissionsGuard) + @RequirePermissions("lawyer:create")
// — pendiente de que exista el login (EP-01/HU-1..3). El contrato exige
// rol ADMINISTRATOR; hoy este endpoint queda sin protección.
@Controller("lawyers")
export class LawyerController {
  constructor(private readonly registerLawyer: RegisterLawyerUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterLawyerRequestDto,
  ): Promise<LawyerResponseDto> {
    const result = await this.registerLawyer.execute(
      LawyerHttpMapper.toRegisterCommand(dto),
    );
    return LawyerHttpMapper.toResponse(result.lawyer);
  }
}
