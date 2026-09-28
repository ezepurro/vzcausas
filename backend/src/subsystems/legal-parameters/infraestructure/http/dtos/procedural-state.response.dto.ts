import { DayType } from '@subsystems/legal-parameters/core/domain/entities/day-types';
import { JurisdictionCode } from '@subsystems/legal-parameters/core/domain/value-objects/jurisdiction-code';
import { PaginationResponseDto } from '../../../../../common/pagination/paginated-response.dto';
/** Procedural state resource (API_CONTRACT_V2 §3.4). */
export class ProceduralStateResponseDto {
  id!: number;
  name!: string;
  jurisdiction!: JurisdictionCode;
  position!: number;
  timeLimitDays!: number;
  dayType!: DayType;
  terminal!: boolean;
  activeCases!: number;
  active!: boolean;
}

/** Body of `GET /procedural-states`. */
export class ProceduralStatesListResponseDto {
  data!: ProceduralStateResponseDto[];
  pagination!: PaginationResponseDto;
}
