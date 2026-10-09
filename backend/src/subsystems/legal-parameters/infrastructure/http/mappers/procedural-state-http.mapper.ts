import { ProceduralState } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import { DayType } from '@subsystems/legal-parameters/core/domain/entities/day-types';
import { ProceduralStateJurisdictionEditError } from '@subsystems/legal-parameters/core/domain/errors/procedural-state.errors';
import { RegisterProceduralStateCommand } from '@subsystems/legal-parameters/core/application/use-cases/register-procedural-state.use-case';
import { UpdateProceduralStateCommand } from '@subsystems/legal-parameters/core/application/use-cases/update-procedural-state.use-case';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';
import {
  ProceduralStateResponseDto,
  ProceduralStatesListResponseDto,
  ProceduralStateWithActiveCasesResponseDto,
} from '../dtos/procedural-state.response.dto';
import { RegisterProceduralStateRequestDto } from '../dtos/register-procedural-state.request.dto';
import { UpdateProceduralStateRequestDto } from '../dtos/update-procedural-state.request.dto';

/** Contract defaults of `ProceduralStateCreate` for the optional fields. */
const REGISTER_DEFAULTS = {
  timeLimitDays: 0,
  dayType: DayType.NONE,
  terminal: false,
} as const;

/**
 * Translates between the HTTP DTOs and the `legal-parameters` application
 * layer. The only place that knows both vocabularies (architecture §5.3):
 * the use cases never see a DTO, and the controller never builds a command
 * by hand.
 */
export class ProceduralStateHttpMapper {
  /**
   * Applies the contract's defaults here, so the use case receives a
   * complete command. With no `timeLimitDays` and no `dayType` the state
   * opens no time limit ("Sin plazo"); sending only `timeLimitDays > 0`
   * leaves `dayType` as `NONE`, which the domain rejects as incoherent, as
   * the contract's 400 example shows.
   */
  static toRegisterCommand(dto: RegisterProceduralStateRequestDto): RegisterProceduralStateCommand {
    return {
      name: dto.name,
      jurisdiction: dto.jurisdiction,
      timeLimitDays: dto.timeLimitDays ?? REGISTER_DEFAULTS.timeLimitDays,
      dayType: dto.dayType ?? REGISTER_DEFAULTS.dayType,
      terminal: dto.terminal ?? REGISTER_DEFAULTS.terminal,
    };
  }

  /**
   * Absent fields stay `undefined` ("leave as is"); no default is applied.
   *
   * @throws {ProceduralStateJurisdictionEditError} if the body carries
   *   `jurisdiction`, even with the value the state already has (D-36).
   */
  static toUpdateCommand(dto: UpdateProceduralStateRequestDto, stateId: number): UpdateProceduralStateCommand {
    if (dto.jurisdiction !== undefined) {
      throw new ProceduralStateJurisdictionEditError();
    }

    return {
      id: stateId,
      name: dto.name,
      timeLimitDays: dto.timeLimitDays,
      dayType: dto.dayType,
      terminal: dto.terminal,
    };
  }

  /** Shape of `POST` and `PATCH`: no `activeCases`. */
  static toResponse(state: ProceduralState): ProceduralStateResponseDto {
    return {
      id: state.id,
      name: state.name,
      jurisdiction: state.jurisdiction.code,
      timeLimitDays: state.timeLimitDays,
      // The column is nullable, but the contract never sends null:
      // a state without a day type opens no time limit.
      dayType: state.dayType ?? DayType.NONE,
      terminal: state.terminal,
      active: state.isActive,
    };
  }

  /** Shape of the `GET`s: adds `activeCases`. */
  static toResponseWithActiveCases(state: ProceduralState): ProceduralStateWithActiveCasesResponseDto {
    return {
      ...ProceduralStateHttpMapper.toResponse(state),
      // Depends on the `cases` subsystem, which does not exist yet (contract §3.4).
      activeCases: 0,
    };
  }

  static toListResponse(result: PaginatedResult<ProceduralState>): ProceduralStatesListResponseDto {
    return {
      data: result.items.map((state) => ProceduralStateHttpMapper.toResponseWithActiveCases(state)),
      pagination: {
        page: result.page,
        limit: result.limit,
        totalItems: result.total,
        totalPages: result.totalPages,
      },
    };
  }
}
