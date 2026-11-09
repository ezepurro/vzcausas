import { DayType } from '@subsystems/legal-parameters/core/domain/entities/day-types';
import { JurisdictionCode } from '@subsystems/legal-parameters/core/domain/value-objects/jurisdiction-code';
import { PaginationResponseDto } from '@shared/infrastructure/http/pagination/pagination-response.dto';

/**
 * Procedural state as `POST` and `PATCH` return it (contract V3 §3.4,
 * schema `ProceduralState`): without `activeCases`.
 */
export class ProceduralStateResponseDto {
  id!: number;
  name!: string;
  jurisdiction!: JurisdictionCode;
  timeLimitDays!: number;
  dayType!: DayType;
  terminal!: boolean;
  active!: boolean;
}

/**
 * Procedural state as the `GET`s return it (schema
 * `ProceduralStateWithActiveCases`): the same fields plus `activeCases`.
 */
export class ProceduralStateWithActiveCasesResponseDto extends ProceduralStateResponseDto {
  activeCases!: number;
}

/** Body of `GET /procedural-states`. */
export class ProceduralStatesListResponseDto {
  data!: ProceduralStateWithActiveCasesResponseDto[];
  pagination!: PaginationResponseDto;
}
