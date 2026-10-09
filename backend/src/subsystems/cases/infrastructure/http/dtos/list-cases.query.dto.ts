import { Type } from "class-transformer";
import { IsInt, IsOptional, IsPositive } from "class-validator";
import { PaginationQueryDto } from "@shared/infrastructure/http/pagination";

/**
 * Query parameters of `GET /cases`, limited to what HU-9 needs.
 *
 * `search` comes from the base class but is **not** honoured yet: the
 * contract defines it over SAC number, caption and the client's name,
 * and that belongs to HU-20 along with the rest of the filters.
 */
export class ListCasesQueryDto extends PaginationQueryDto {
  /** Cases of one client (CA-9.4). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  clientId?: number;
}
