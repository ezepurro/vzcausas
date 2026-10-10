import { Inject, Injectable } from "@nestjs/common";
import { Lawyer } from "../../domain/entities/lawyer.entity";
import { ActiveCasesCounterPort } from "../../domain/ports/active-cases-counter.port";
import {
  LAWYER_REPOSITORY,
  LawyerRepository,
} from "../../domain/ports/lawyer.repository";

export type ListLawyersQuery = {
  page: number;
  limit: number;
  search?: string;
};

/**
 * A lawyer plus his workload. A read model, not an entity: `activeCases`
 * belongs to `cases` and the `Lawyer` entity deliberately does not carry it
 * (`lawyer.entity.ts:12`).
 */
export type LawyerWithActiveCases = {
  lawyer: Lawyer;
  activeCases: number;
};

export type ListLawyersResult = {
  lawyers: LawyerWithActiveCases[];
  totalItems: number;
};

/**
 * `GET /lawyers` (§3.3) — one page of the firm's lawyers.
 *
 * Thin on purpose: the filtering and counting belong to the
 * repository, which can push both into SQL, and there is no business
 * rule to apply on top. It exists rather than letting the controller
 * reach for the port directly so the HTTP layer keeps depending on
 * the application layer and not on persistence (§5.3).
 *
 * A blank or whitespace-only `search` is normalized away: the
 * contract treats the parameter as absent, and passing `""` down
 * would have the repository build a `LIKE '%%'` that matches
 * everything anyway — harmless here, but it hides the intent.
 */
@Injectable()
export class ListLawyersUseCase {
  constructor(
    @Inject(LAWYER_REPOSITORY) private readonly lawyers: LawyerRepository,
    @Inject(ActiveCasesCounterPort)
    private readonly activeCasesCounter: ActiveCasesCounterPort,
  ) {}

  async execute(query: ListLawyersQuery): Promise<ListLawyersResult> {
    const search = query.search?.trim();

    const page = await this.lawyers.search({
      page: query.page,
      limit: query.limit,
      search: search && search.length > 0 ? search : undefined,
    });

    // The counts for the whole page in a single call, never one per lawyer.
    // An empty page needs none: skip the trip to `cases`.
    const counts =
      page.items.length > 0
        ? await this.activeCasesCounter.countByResponsibleLawyer(
            page.items.map((lawyer) => lawyer.id),
          )
        : new Map<number, number>();

    return {
      lawyers: page.items.map((lawyer) => ({
        lawyer,
        activeCases: counts.get(lawyer.id) ?? 0,
      })),
      totalItems: page.totalItems,
    };
  }
}
