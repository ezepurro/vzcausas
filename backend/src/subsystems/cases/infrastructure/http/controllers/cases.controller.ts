import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { RegisterCase } from '../../../core/application/use-cases/register-case.use-case';
import { CaseResponseDto } from '../dtos/case.response.dto';
import { RegisterCaseRequestDto } from '../dtos/register-case.request.dto';
import { CaseHttpMapper } from '../mappers/case-http.mapper';

/**
 * HTTP entry point for `/cases` (API contract §3.7). Any authenticated user
 * can register a case (RN11), so no permission is declared: the global
 * authentication guard is enough.
 *
 * The response is built by {@link CaseHttpMapper}, shared with the listing
 * and the detail: the contract requires the three to return the same
 * resource, so the shape cannot live in a single endpoint.
 */
@Controller({ path: 'cases', version: ['1'] })
export class CasesController {
  constructor(private readonly registerCase: RegisterCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterCaseRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ data: CaseResponseDto }> {
    const result = await this.registerCase.execute({ ...dto, createdByUserId: actor.userId });
    return { data: CaseHttpMapper.fromRegisterResult(result) };
  }
}
