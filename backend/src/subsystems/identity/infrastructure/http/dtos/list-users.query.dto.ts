import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "@shared/infrastructure/http/pagination/pagination";

/**
 * Query parameters of `GET /users` (§3.2): the shared pagination and
 * `search` fields plus this resource's `role` filter.
 *
 * `role` is only checked to be a string here. Whether the name
 * corresponds to a real role is a question for the role catalogue,
 * so `ListUsers` answers it and raises the contract's
 * `INVALID_REQUEST`; hardcoding the three current names in a
 * validator would mean editing this file every time a role is added.
 */
export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  role?: string;
}
