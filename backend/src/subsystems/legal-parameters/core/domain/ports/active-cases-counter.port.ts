/**
 * What `legal-parameters` needs from `cases`: how many active cases sit in
 * each procedural state, for the `activeCases` field of the `GET`s
 * (contract §3.4). Declared here, by the consumer and in its own terms
 * (architecture §6.2).
 *
 * **The adapter lives in `cases`, not here**:
 * `cases/infrastructure/acl/legal-parameters-active-cases-counter.adapter.ts`
 * implements it and `CasesModule` exports this token, so the binding arrives
 * through the module import — the same way `cases` receives
 * `LEGAL_PARAMETERS_LOOKUP` from this subsystem. There is no use case in
 * between: the adapter delegates straight to the read port of `cases`.
 *
 * Which cases count as active is `cases`' rule, not this subsystem's: this
 * port only asks for the number. Note the rule is **not** simply "active
 * case" — for a procedural state the initial state does not count either, and
 * that asymmetry is documented where it is implemented
 * (`cases/core/domain/ports/case.repository.ts`, `countActiveByProceduralState`).
 */
export interface ActiveCasesCounterPort {
  /**
   * Active cases per state id. Every requested id is present in the
   * result, with `0` when no active case is in it, so callers never have
   * to handle a missing key.
   */
  countByStates(stateIds: readonly number[]): Promise<ReadonlyMap<number, number>>;

  /**
   * Active cases per legal qualification id, for the `activeCases` of
   * `GET /legal-qualifications` and `GET /legal-qualifications/{id}` (CA-47.8).
   * Same promise about missing keys.
   *
   * **The predicate is not the one of `countByStates`**: here a case in the
   * initial state **does** count, and so does one in a hand-written state. A
   * qualification given de baja still counts the cases that hold it (RN12).
   */
  countByQualifications(qualificationIds: readonly number[]): Promise<ReadonlyMap<number, number>>;
}

export const ActiveCasesCounterPort = Symbol('ActiveCasesCounterPort');
