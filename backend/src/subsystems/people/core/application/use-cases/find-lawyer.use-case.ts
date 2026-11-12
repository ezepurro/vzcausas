import { Inject, Injectable } from "@nestjs/common";
import { ActiveCasesCounterPort } from "../../domain/ports/active-cases-counter.port";
import {
  LAWYER_REPOSITORY,
  LawyerRepository,
} from "../../domain/ports/lawyer.repository";

export type FindLawyerQuery = { id: number };

/**
 * What `people` hands to the outside world when asked about a
 * lawyer. Deliberately a plain object, **not** the {@link Lawyer}
 * entity: §6.3 of the architecture states that a subsystem exposes
 * use cases only — never repositories or entities — so another
 * subsystem can never end up depending on our internals.
 */
export type LawyerView = {
  id: number;
  lastName: string;
  firstName: string;
  /** `null` if the lawyer has no registration number loaded (D-107). */
  registrationNumber: string | null;
  /** Cases where this lawyer is the responsible one (RN3's workload, §3.3). */
  activeCases: number;
  active: boolean;
};

/**
 * Reads a single lawyer. Exported by `PeopleModule` so `identity`'s
 * anti-corruption adapter can resolve a `lawyerId` when registering
 * or updating a user with the LAWYER role.
 *
 * Returns `null` rather than throwing: "this lawyer does not exist"
 * is a legitimate answer to a lookup, and the meaning of that answer
 * (a 422 when registering a user, say) belongs to whoever asked, not
 * here.
 *
 * **`activeCases` is counted here even for callers that do not need it**, and
 * `identity`'s adapter is one of them: it resolves a `lawyerId` on login and
 * throws the number away. The alternative is a second read path for the same
 * resource, and this repo pays for a single one on purpose — the contract
 * requires every lawyer response to have the same shape (§3.3). The cost is
 * one `GROUP BY` on a primary key per lookup. If a login path ever shows up
 * hot, that is the trade to revisit.
 */
@Injectable()
export class FindLawyerUseCase {
  constructor(
    @Inject(LAWYER_REPOSITORY) private readonly lawyers: LawyerRepository,
    @Inject(ActiveCasesCounterPort)
    private readonly activeCasesCounter: ActiveCasesCounterPort,
  ) {}

  async execute(query: FindLawyerQuery): Promise<LawyerView | null> {
    const lawyer = await this.lawyers.findById(query.id);
    if (!lawyer) {
      return null;
    }

    const counts = await this.activeCasesCounter.countByResponsibleLawyer([
      lawyer.id,
    ]);

    return {
      id: lawyer.id,
      lastName: lawyer.lastName,
      firstName: lawyer.firstName,
      registrationNumber: lawyer.registrationNumber?.toString() ?? null,
      activeCases: counts.get(lawyer.id) ?? 0,
      active: lawyer.isActive(),
    };
  }
}
