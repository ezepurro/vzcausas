import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { ValidationError } from "@shared/domain/domain-error";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Query parameters shared by every paginated collection in the API
 * contract (`GET /users` §3.2, `GET /lawyers` §3.3). Both endpoints
 * specify the same defaults and bounds, so they are declared once
 * here and extended with whatever filters each resource adds.
 *
 * `@Type(() => Number)` is required: query strings arrive as text and
 * the global `ValidationPipe` runs with `transform: true`, so without
 * it `@IsInt` would reject even a well-formed `?page=2`.
 */
export class PaginationQueryDto {
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

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  search?: string;
}

/** `pagination` block the contract attaches to every list response. */
export type PaginationMetaDto = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

/** Envelope of a paginated collection: `{ data, pagination }`. */
export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationMetaDto;
};

/**
 * Normalized page request handed to the application layer, with the
 * contract's defaults already applied so no use case has to know
 * them.
 */
export type PageRequest = { page: number; limit: number };

export function toPageRequest(query: PaginationQueryDto): PageRequest {
  return {
    page: query.page ?? DEFAULT_PAGE,
    limit: query.limit ?? DEFAULT_LIMIT,
  };
}

/**
 * Builds the response envelope.
 *
 * `totalPages` is 1 for an empty collection, never 0: the contract's
 * `page` starts at 1, so reporting 0 pages would describe a range no
 * valid request can land in and makes "page 1 of 0" appear in the UI.
 */
export function paginate<T>(
  items: T[],
  totalItems: number,
  page: PageRequest,
): PaginatedResponse<T> {
  return {
    data: items,
    pagination: {
      page: page.page,
      limit: page.limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / page.limit)),
    },
  };
}

/**
 * Emitted when `page` or `limit` fall outside the contract's bounds.
 *
 * Exists so the response carries the contract's own
 * `INVALID_PAGINATION` code rather than the generic
 * `VALIDATION_ERROR` the pipe would produce — the same reason
 * `InvalidUserIdError` exists for path parameters.
 */
export class InvalidPaginationError extends ValidationError {
  constructor() {
    super("INVALID_PAGINATION", "Los parámetros de paginación no son válidos.", {
      page: "Debe ser un número entero mayor o igual a 1.",
      limit: `Debe ser un número entero entre 1 y ${MAX_LIMIT}.`,
    });
  }
}
