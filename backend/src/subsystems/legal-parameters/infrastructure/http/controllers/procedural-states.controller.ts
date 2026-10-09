import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '@shared/infrastructure/http/require-permissions.decorator';
import { ViewProceduralStates } from '@subsystems/legal-parameters/core/application/use-cases/view-procedural-states.use-case';
import { GetProceduralState } from '@subsystems/legal-parameters/core/application/use-cases/get-procedural-state.use-case';
import { RegisterProceduralState } from '@subsystems/legal-parameters/core/application/use-cases/register-procedural-state.use-case';
import { UpdateProceduralState } from '@subsystems/legal-parameters/core/application/use-cases/update-procedural-state.use-case';
import { DeactivateProceduralState } from '@subsystems/legal-parameters/core/application/use-cases/deactivate-procedural-state.use-case';
import { ProceduralStateIdError } from '@subsystems/legal-parameters/core/domain/errors/procedural-state.errors';
import { getStatesQueryDto } from '../dtos/get-states.dto';
import {
  ProceduralStateResponseDto,
  ProceduralStatesListResponseDto,
  ProceduralStateWithActiveCasesResponseDto,
} from '../dtos/procedural-state.response.dto';
import { RegisterProceduralStateRequestDto } from '../dtos/register-procedural-state.request.dto';
import { UpdateProceduralStateRequestDto } from '../dtos/update-procedural-state.request.dto';
import { ProceduralStateHttpMapper } from '../mappers/procedural-state-http.mapper';

/**
 * HTTP entry point for `/procedural-states` (contract V3 §3.4).
 *
 * Every single-resource response is wrapped in the contract's `{ data }`
 * envelope; the listing returns `{ data, pagination }`.
 *
 * Authorization: `JwtAuthGuard` and `PermissionsGuard` are global
 * (`AppModule`), so every route already requires a session. Writing
 * (HU45, HU17, HU46) is ADMINISTRATOR-only and declares its permission
 * with `@RequirePermissions`; ADMINISTRATOR receives them through
 * `ROLE_PERMISSIONS` in `prisma/seed.ts`. The `GET`s carry no decorator:
 * reading is open to any authenticated user (contract §3.4, D-03).
 */
@Controller({ path: 'procedural-states', version: ['1'] })
export class ProceduralStatesController {
  constructor(
    private readonly findProcStateUseCase: ViewProceduralStates,
    private readonly getProceduralState: GetProceduralState,
    private readonly registerProceduralState: RegisterProceduralState,
    private readonly updateProceduralState: UpdateProceduralState,
    private readonly deactivateProceduralState: DeactivateProceduralState,
  ) {}

  /** HU45. */
  @RequirePermissions('procedural-state:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterProceduralStateRequestDto): Promise<{ data: ProceduralStateResponseDto }> {
    const procState = await this.registerProceduralState.execute(ProceduralStateHttpMapper.toRegisterCommand(dto));
    return { data: ProceduralStateHttpMapper.toResponse(procState) };
  }

  /**
   * Declared before `@Get(':stateId')`: Nest matches routes in declaration
   * order, so the parametric one must come after the listing.
   */
  @Get()
  async findAll(@Query() query: getStatesQueryDto): Promise<ProceduralStatesListResponseDto> {
    const result = await this.findProcStateUseCase.getAll(query);
    return ProceduralStateHttpMapper.toListResponse(result);
  }

  @Get(':stateId')
  async getById(@Param('stateId') stateIdParam: string): Promise<{ data: ProceduralStateWithActiveCasesResponseDto }> {
    const procState = await this.getProceduralState.execute({ id: this.parseStateId(stateIdParam) });
    return { data: ProceduralStateHttpMapper.toResponseWithActiveCases(procState) };
  }

  /** HU17. */
  @RequirePermissions('procedural-state:update')
  @Patch(':stateId')
  async update(
    @Param('stateId') stateIdParam: string,
    @Body() dto: UpdateProceduralStateRequestDto,
  ): Promise<{ data: ProceduralStateResponseDto }> {
    const procState = await this.updateProceduralState.execute(
      ProceduralStateHttpMapper.toUpdateCommand(dto, this.parseStateId(stateIdParam)),
    );
    return { data: ProceduralStateHttpMapper.toResponse(procState) };
  }

  /** HU46. Logical deletion; answers 204 with no body. */
  @RequirePermissions('procedural-state:delete')
  @Delete(':stateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('stateId') stateIdParam: string): Promise<void> {
    await this.deactivateProceduralState.execute({ id: this.parseStateId(stateIdParam) });
  }

  /**
   * The contract's `StateIdParam` is an integer ≥ 1. Parsed by hand rather
   * than with `ParseIntPipe` so the error carries the contract's code
   * (`INVALID_PATH_PARAMETER`), same as `parseUserId` in `identity`.
   */
  private parseStateId(raw: string): number {
    const stateId = Number(raw);
    if (!Number.isInteger(stateId) || stateId <= 0) {
      throw new ProceduralStateIdError();
    }
    return stateId;
  }
}
