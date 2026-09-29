import { Inject, Injectable } from "@nestjs/common";
import {
  LAWYER_REPOSITORY,
  LawyerRepository,
} from "../../domain/ports/lawyer.repository";
import { LawyerView } from "./find-lawyer.use-case";

export type FindLawyersQuery = { ids: readonly number[] };

/**
 * Batch sibling of {@link FindLawyerUseCase}, exported by
 * `PeopleModule` so `identity` can resolve the lawyers of a whole
 * page of users in one round trip rather than one query per row.
 *
 * Returns the same flat {@link LawyerView} the single-id use case
 * does — never the entity (§6.3) — and omits ids that do not
 * resolve. Whether a missing lawyer is an error is the caller's
 * question, not ours.
 */
@Injectable()
export class FindLawyersUseCase {
  constructor(
    @Inject(LAWYER_REPOSITORY) private readonly lawyers: LawyerRepository,
  ) {}

  async execute(query: FindLawyersQuery): Promise<LawyerView[]> {
    // An empty request must not reach the database: `IN ()` is either
    // a syntax error or a full scan depending on the driver, and the
    // answer is knowable without asking.
    if (query.ids.length === 0) {
      return [];
    }

    const lawyers = await this.lawyers.findByIds(query.ids);

    return lawyers.map((lawyer) => ({
      id: lawyer.id,
      fullName: lawyer.fullName,
      registrationNumber: lawyer.registrationNumber.toString(),
      active: lawyer.isActive(),
    }));
  }
}
