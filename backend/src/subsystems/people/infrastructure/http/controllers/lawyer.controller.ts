import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { RegisterLawyerUseCase } from "../../../core/application/use-cases/register-lawyer.use-case";
import { LawyerResponseDto } from "../dtos/lawyer.response.dto";
import { RegisterLawyerRequestDto } from "../dtos/register-lawyer.request.dto";
import { LawyerHttpMapper } from "../mappers/lawyer-http.mapper";
import { RequirePermissions } from "@shared/infrastructure/http/require-permissions.decorator";

/**
 * HTTP entry point for `/lawyers` (API contract §3.3).
 *
 * Authorization works exactly as in `identity`'s `UserController`:
 * the permission is declared here, the guards are registered
 * globally in `AppModule`, and none of it is in force until step
 * P-13 of IMPLEMENTACION_AUTH.md composes the modules. See that
 * controller's docstring for the permission-vocabulary caveat.
 */
@Controller("lawyers")
export class LawyerController {
  constructor(private readonly registerLawyer: RegisterLawyerUseCase) {}

  @RequirePermissions("lawyer:create")
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
