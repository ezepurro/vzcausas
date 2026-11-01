import { Inject, Injectable } from '@nestjs/common';
import { ActiveCasesCounterPort } from '@subsystems/legal-parameters/core/domain/ports/active-cases-counter.port';
import { CASE_REPOSITORY, CaseRepository } from '../../core/domain/ports/case/case.repository';

/**
 * Implements the {@link ActiveCasesCounterPort} that `legal-parameters`
 * declares, so its `GET /procedural-states` and
 * `GET /procedural-states/{stateId}` can show a real `activeCases` (§8.4)
 * instead of the `0` its stub answered.
 *
 * **The direction is the inverse of every other ACL adapter here, and that is
 * the point.** Everywhere else `cases` declares what it needs and another
 * subsystem adapts — `people/infrastructure/acl/cases-people-lookup.adapter.ts`
 * implements the port of `cases/core/domain/ports/case/people-lookup.port.ts`. In
 * this one `legal-parameters` is the consumer, so it owns the port, and `cases`
 * adapts. The rule stays with the owner either way: "active case" is defined in
 * `cases` (§4), and counted by each module on its own it would drift in four
 * places.
 *
 * **A pass-through on purpose: no use case in between.** There is no rule to
 * apply on top of the number, and the rule that does matter — which cases count
 * as active — lives in {@link CaseRepository} and is tested through the API against
 * a real database (`activeCases` in `test/subsystems/legal-parameters/procedural-states.int.spec.ts`
 * and `legal-qualifications.int.spec.ts`). A use case here
 * would add a hop and a second place to read.
 */
@Injectable()
export class LegalParametersActiveCasesCounterAdapter implements ActiveCasesCounterPort {
  constructor(@Inject(CASE_REPOSITORY) private readonly cases: CaseRepository) {}

  /**
   * One call for the whole batch, never one per id: `GET /procedural-states` is
   * paginated, and a call per row is the N+1 that the port's batch shape exists
   * to prevent.
   *
   * The `0` for a state with no active cases is not filled in here: the port
   * already promises every requested id comes back. Filling it twice would hide
   * a port that stopped keeping its promise.
   */
  async countByStates(stateIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    return this.cases.countActiveByProceduralState(stateIds);
  }

  /**
   * Note this one does **not** go through
   * `countActiveByProceduralState`: the predicates differ. For a legal
   * qualification the initial state counts, and so does a hand-written one.
   */
  async countByQualifications(qualificationIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    return this.cases.countActiveByLegalQualification(qualificationIds);
  }
}
