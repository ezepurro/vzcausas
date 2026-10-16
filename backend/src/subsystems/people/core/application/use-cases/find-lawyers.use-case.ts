import { Inject, Injectable } from "@nestjs/common";
import {
  LAWYER_REPOSITORY,
  LawyerRepository,
} from "../../domain/ports/lawyer.repository";
import { LawyerView } from "./find-lawyer.use-case";

export type FindLawyersQuery = { ids: readonly number[] };

/**
 * What the batch lookup answers: {@link LawyerView} **without**
 * `activeCases`.
 *
 * The only caller is `identity`, resolving the lawyer behind a page of users,
 * and it has no `activeCases` to render. Returning the full `LawyerView` would
 * force a count per page that nobody reads — and unlike the single-id case,
 * here it is not one extra `GROUP BY` but one over a whole page.
 */
export type LawyerSummaryView = Omit<LawyerView, 'activeCases'>;

/**
 * Batch sibling of {@link FindLawyerUseCase}, exported by
 * `PeopleModule` so `identity` can resolve the lawyers of a whole
 * page of users in one round trip rather than one query per row.
 *
 * Returns a flat {@link LawyerSummaryView} — never the entity (§6.3) — and
 * omits ids that do not resolve. Whether a missing lawyer is an error is the
 * caller's question, not ours.
 */
@Injectable()
export class FindLawyersUseCase {
  constructor(
    @Inject(LAWYER_REPOSITORY) private readonly lawyers: LawyerRepository,
  ) {}

  async execute(query: FindLawyersQuery): Promise<LawyerSummaryView[]> {
    // An empty request must not reach the database: `IN ()` is either
    // a syntax error or a full scan depending on the driver, and the
    // answer is knowable without asking.
    if (query.ids.length === 0) {
      return [];
    }

    const lawyers = await this.lawyers.findByIds(query.ids);

    return lawyers.map((lawyer) => ({
      id: lawyer.id,
      lastName: lawyer.lastName,
      firstName: lawyer.firstName,
      registrationNumber: lawyer.registrationNumber.toString(),
      active: lawyer.isActive(),
    }));
  }
}
