import { Inject, Injectable } from "@nestjs/common";
import {
  CASE_QUERY,
  CaseQueryPort,
} from "../../domain/ports/case-query.port";
import { CaseListItem } from "../read-models/case-list-item";

export type ListCasesQuery = {
  page: number;
  limit: number;
  clientId?: number;
};

export type ListCasesResult = {
  cases: CaseListItem[];
  totalItems: number;
};

/**
 * `GET /cases` (§3.6 via HU-9's CA-9.4).
 *
 * Scoped to what CA-9.4 asks: the cases of a client, with their
 * procedural state and due date. The endpoint the contract describes
 * in full — every filter, plus `businessDaysRemaining` — is HU-20's,
 * and that field cannot be computed at all until the judicial
 * calendar of non-business days exists.
 *
 * Thin like the other listings: filtering, ordering and counting
 * belong to the query port, which pushes them into SQL.
 */
@Injectable()
export class ListCasesUseCase {
  constructor(@Inject(CASE_QUERY) private readonly cases: CaseQueryPort) {}

  async execute(query: ListCasesQuery): Promise<ListCasesResult> {
    const page = await this.cases.search({
      page: query.page,
      limit: query.limit,
      clientId: query.clientId,
    });

    return { cases: page.items, totalItems: page.totalItems };
  }
}
