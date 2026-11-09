import { PaginationQueryDto } from "@shared/infrastructure/http/pagination/pagination";

/**
 * Query parameters of `GET /clients` (§3.6): the shared pagination
 * and `search` fields, with no filter of its own.
 *
 * Extends the helper in `@shared/infrastructure/http/pagination/pagination`, the
 * same one `/lawyers` uses — **not** the similarly named
 * `DefaultedPaginationQueryDto` next to it, whose paginator
 * reports `totalPages: 0` for an empty collection while the contract
 * shows `1`.
 */
export class ListClientsQueryDto extends PaginationQueryDto {}
