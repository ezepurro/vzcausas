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
import {
  PaginatedResponse,
  paginate,
  toPageRequest,
} from "@shared/infrastructure/http/pagination/pagination";
import { RequirePermissions } from "@shared/infrastructure/http/require-permissions.decorator";
import { FindClientUseCase } from "../../../core/application/use-cases/find-client.use-case";
import { ListClientsUseCase } from "../../../core/application/use-cases/list-clients.use-case";
import { RegisterClientUseCase } from "../../../core/application/use-cases/register-client.use-case";
import { UpdateClientUseCase } from "../../../core/application/use-cases/update-client.use-case";
import { InvalidClientIdError } from "../../../core/domain/errors/people.errors";
import { ClientResponseDto } from "../dtos/client.response.dto";
import { ListClientsQueryDto } from "../dtos/list-clients.query.dto";
import { RegisterClientRequestDto } from "../dtos/register-client.request.dto";
import { UpdateClientRequestDto } from "../dtos/update-client.request.dto";
import { ClientHttpMapper } from "../mappers/client-http.mapper";

/**
 * HTTP entry point for `/clients` (API contract §3.6).
 *
 * Authorization: the three profiles read and register clients (matriz
 * de permisos §5.1, 2026-10-11; RN11 — there are no clients of
 * restricted visibility). Registering used to be the Secretary's alone
 * (CA-8.9, D-05). Who holds `client:read` and `client:create` is decided
 * in `prisma/seed.ts`, not here.
 *
 * Modifying is HU10 (`client:update`, the three profiles); deleting is HU11.
 */
@Controller("clients")
export class ClientController {
  constructor(
    private readonly registerClient: RegisterClientUseCase,
    private readonly listClients: ListClientsUseCase,
    private readonly findClient: FindClientUseCase,
    private readonly updateClient: UpdateClientUseCase,
  ) {}

  @RequirePermissions("client:create")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterClientRequestDto,
  ): Promise<{ data: ClientResponseDto }> {
    const result = await this.registerClient.execute(
      ClientHttpMapper.toRegisterCommand(dto),
    );
    return { data: ClientHttpMapper.toRegisteredResponse(result.client) };
  }

  /**
   * Declared before `@Get(":clientId")`: Nest matches routes in
   * declaration order, and the parametric one would otherwise swallow
   * `GET /clients` as a request for the client whose id is the empty
   * string.
   */
  @RequirePermissions("client:read")
  @Get()
  async list(
    @Query() query: ListClientsQueryDto,
  ): Promise<PaginatedResponse<ClientResponseDto>> {
    const page = toPageRequest(query);

    const result = await this.listClients.execute({
      page: page.page,
      limit: page.limit,
      search: query.search,
    });

    return paginate(
      result.clients.map((counted) =>
        ClientHttpMapper.toResponse(counted.client, counted.activeCases),
      ),
      result.totalItems,
      page,
    );
  }

  @RequirePermissions("client:read")
  @Get(":clientId")
  async getById(
    @Param("clientId") clientIdParam: string,
  ): Promise<{ data: ClientResponseDto }> {
    const result = await this.findClient.execute({
      id: this.parseClientId(clientIdParam),
    });
    return {
      data: ClientHttpMapper.toResponse(result.client, result.activeCases),
    };
  }

  /**
   * HU10: corrects a client's data. The three profiles may (CA-10.6), through
   * `client:update`. The client goes back whole, as `GET /clients/{clientId}`
   * shows it; when its name changed, the captions of its cases already show
   * the new one (CA-10.9).
   */
  @RequirePermissions("client:update")
  @Patch(":clientId")
  async update(
    @Param("clientId") clientIdParam: string,
    @Body() dto: UpdateClientRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: ClientResponseDto }> {
    const result = await this.updateClient.execute({
      clientId: this.parseClientId(clientIdParam),
      changes: { ...dto },
      actorUserId: actor.userId,
    });
    return {
      data: ClientHttpMapper.toResponse(result.client, result.activeCases),
    };
  }

  private parseClientId(raw: string): number {
    const clientId = Number(raw);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      throw new InvalidClientIdError();
    }
    return clientId;
  }
}
