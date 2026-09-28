import { ProceduralState } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import { DayType } from '@subsystems/legal-parameters/core/domain/entities/day-types';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';
import { ProceduralStateResponseDto, ProceduralStatesListResponseDto } from '../dtos/procedural-state.response.dto';

/** Translates domain procedural states into the API contract shape. */
export class ProceduralStateHttpMapper {
  static toResponse(state: ProceduralState): ProceduralStateResponseDto {
    return {
      id: state.id,
      name: state.name,
      jurisdiction: state.jurisdiction.code,
      position: state.position,
      timeLimitDays: state.timeLimitDays,
      // The column is nullable, but the contract never sends null:
      // a state without a day type opens no time limit.
      dayType: state.dayType ?? DayType.NONE,
      terminal: state.terminal,
      // Depends on the `cases` subsystem, which does not exist yet (contract §3.4).
      activeCases: 0,
      active: state.isActive,
    };
  }

  static toListResponse(result: PaginatedResult<ProceduralState>): ProceduralStatesListResponseDto {
    return {
      data: result.items.map((state) => ProceduralStateHttpMapper.toResponse(state)),
      pagination: {
        page: result.page,
        limit: result.limit,
        totalItems: result.total,
        totalPages: result.totalPages,
      },
    };
  }
}
