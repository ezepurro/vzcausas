/**
 * What `legal-parameters` needs from `cases`: how many active cases sit in
 * each procedural state, for the `activeCases` field of the `GET`s
 * (contract §3.4). Declared here, by the consumer and in its own terms
 * (architecture §6.2). The adapter in `infrastructure/acl` is meant to
 * implement it by invoking a use case that `cases` exports; until `cases`
 * provides one, a stub answers `0` (`StubActiveCasesCounterAdapter`).
 *
 * Which cases count as active is `cases`' rule, not this subsystem's: this
 * port only asks for the number.
 */
export interface ActiveCasesCounterPort {
  /**
   * Active cases per state id. Every requested id is present in the
   * result, with `0` when no active case is in it, so callers never have
   * to handle a missing key.
   */
  countByStates(stateIds: readonly number[]): Promise<ReadonlyMap<number, number>>;
}

export const ActiveCasesCounterPort = Symbol('ActiveCasesCounterPort');
