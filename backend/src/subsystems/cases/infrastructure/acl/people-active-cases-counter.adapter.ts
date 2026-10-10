import { Inject, Injectable } from '@nestjs/common';
import { ActiveCasesCounterPort } from '@subsystems/people/core/domain/ports/active-cases-counter.port';
import { CASE_QUERY, CaseQueryPort } from '../../core/domain/ports/case-query.port';

/**
 * Implements the {@link ActiveCasesCounterPort} that `people` declares, so
 * `GET /lawyers` and `GET /clients` can show a real `activeCases` (§8.4)
 * instead of the constant their mappers held.
 *
 * Same shape and same reasoning as
 * `legal-parameters-active-cases-counter.adapter.ts`: a pass-through, because
 * there is no rule to apply on top of the number and the rule that matters —
 * which cases are active — lives in {@link CaseQueryPort}, tested against a
 * real database in `test/subsystems/cases/case-query.int.spec.ts`.
 *
 * **The predicate here is not the one for procedural states.** A case in the
 * initial state counts for its lawyer and its client; only
 * `countActiveByProceduralState` excludes it. That asymmetry is documented on
 * the port it belongs to, and getting it wrong here would hide exactly the
 * cases a freshly loaded firm has most of.
 */
@Injectable()
export class PeopleActiveCasesCounterAdapter implements ActiveCasesCounterPort {
  constructor(@Inject(CASE_QUERY) private readonly cases: CaseQueryPort) {}

  /** One call for the whole page, never one per lawyer: `GET /lawyers` is paginated. */
  async countByResponsibleLawyer(lawyerIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    return this.cases.countActiveByResponsibleLawyer(lawyerIds);
  }

  /** One call for the whole page, never one per client. */
  async countByClient(clientIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    return this.cases.countActiveByClient(clientIds);
  }
}
