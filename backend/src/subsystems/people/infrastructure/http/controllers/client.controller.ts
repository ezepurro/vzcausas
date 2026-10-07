import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { RequirePermissions } from "@shared/infrastructure/http/require-permissions.decorator";
import { RegisterClientUseCase } from "../../../core/application/use-cases/register-client.use-case";
import { ClientResponseDto } from "../dtos/client.response.dto";
import { RegisterClientRequestDto } from "../dtos/register-client.request.dto";
import { ClientHttpMapper } from "../mappers/client-http.mapper";

/**
 * HTTP entry point for `/clients` (API contract §3.6).
 *
 * Only the registration endpoint lives here: the listing and the
 * single-client read are HU-9.
 *
 * Authorization follows the same shape as the rest of the project —
 * the permission is declared here and the global guards registered in
 * `AppModule` enforce it. `client:create` is seeded to SECRETARY
 * alone, which is what denies Administrator and Lawyer (CA-8.9).
 */
@Controller("clients")
export class ClientController {
  constructor(private readonly registerClient: RegisterClientUseCase) {}

  @RequirePermissions("client:create")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterClientRequestDto,
  ): Promise<{ data: ClientResponseDto }> {
    const result = await this.registerClient.execute(
      ClientHttpMapper.toRegisterCommand(dto),
    );
    return { data: ClientHttpMapper.toResponse(result.client) };
  }
}
