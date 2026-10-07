import { Controller, Get, Query } from "@nestjs/common";
import {
  PaginatedResponse,
  paginate,
  toPageRequest,
} from "@shared/infrastructure/http/pagination";
import { ListCasesUseCase } from "../../../core/application/use-cases/list-cases.use-case";
import { CaseResponseDto } from "../dtos/case.response.dto";
import { ListCasesQueryDto } from "../dtos/list-cases.query.dto";
import { CaseHttpMapper } from "../mappers/case-http.mapper";

/**
 * HTTP entry point for `/cases`.
 *
 * Built for HU-9's CA-9.4 — "las causas de un cliente, con su estado
 * procesal y su vencimiento" — and deliberately no further. The full
 * endpoint, with every filter and `businessDaysRemaining`, is HU-20's.
 *
 * No `@RequirePermissions`: the contract's matrix puts reading cases
 * at "cualquier usuario autenticado", and the global `JwtAuthGuard`
 * already enforces authentication. Declaring a permission here would
 * narrow it, since no role would hold one that is not seeded.
 */
@Controller("cases")
export class CaseController {
  constructor(private readonly listCases: ListCasesUseCase) {}

  @Get()
  async list(
    @Query() query: ListCasesQueryDto,
  ): Promise<PaginatedResponse<CaseResponseDto>> {
    const page = toPageRequest(query);

    const result = await this.listCases.execute({
      page: page.page,
      limit: page.limit,
      clientId: query.clientId,
    });

    return paginate(
      result.cases.map((item) => CaseHttpMapper.toResponse(item)),
      result.totalItems,
      page,
    );
  }
}
