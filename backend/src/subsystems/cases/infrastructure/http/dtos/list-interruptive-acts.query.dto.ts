import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_LIMIT } from '@shared/infrastructure/http/pagination';

/**
 * Query of `GET /cases/{caseId}/interruptive-acts` (HU31): pagination and
 * nothing else, so an unknown parameter is rejected instead of ignored. Same
 * reason as `ListProceduralActsQueryDto`.
 */
export class ListInterruptiveActsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;
}
