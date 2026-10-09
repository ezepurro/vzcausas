import { Inject, Injectable } from "@nestjs/common";
import { Client } from "../../domain/entities/client.entity";
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from "../../domain/ports/client.repository";

export type ListClientsQuery = {
  page: number;
  limit: number;
  search?: string;
};

export type ListClientsResult = {
  clients: Client[];
  totalItems: number;
};

/**
 * `GET /clients` (§3.6, HU-9) — one page of the firm's clients.
 *
 * Thin on purpose, like {@link ListLawyersUseCase}: the filtering,
 * ordering and counting belong to the repository, which pushes all
 * three into SQL, and there is no business rule to apply on top.
 *
 * A blank or whitespace-only `search` is normalized away: the
 * contract treats the parameter as absent, and passing `""` down
 * would have the repository build a `LIKE '%%'` that matches
 * everything anyway — harmless, but it hides the intent.
 */
@Injectable()
export class ListClientsUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
  ) {}

  async execute(query: ListClientsQuery): Promise<ListClientsResult> {
    const search = query.search?.trim();

    const page = await this.clients.search({
      page: query.page,
      limit: query.limit,
      search: search && search.length > 0 ? search : undefined,
    });

    return { clients: page.items, totalItems: page.totalItems };
  }
}
