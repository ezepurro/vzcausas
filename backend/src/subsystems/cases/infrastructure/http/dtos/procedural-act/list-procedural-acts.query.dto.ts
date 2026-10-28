import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_LIMIT } from '@shared/infrastructure/http/pagination/pagination';

/**
 * Query of `GET /cases/{caseId}/procedural-acts` (HU27): pagination and
 * nothing else.
 *
 * Not the shared `PaginationQueryDto`, because that one also accepts
 * `search`, and a case's timeline has nothing to search: a `?search=` would be
 * taken and silently ignored. Here it is rejected as an unknown parameter.
 */
export class ListProceduralActsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(1, { message: 'Debe ser mayor o igual a 1.' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(1, { message: 'Debe ser mayor o igual a 1.' })
  @Max(MAX_LIMIT, { message: `Debe ser como máximo ${MAX_LIMIT}.` })
  limit?: number;
}
