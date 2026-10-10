/**
 * What `people` needs from `cases`: how many active cases each lawyer is
 * responsible for, and how many each client is the client of, for the
 * `activeCases` field of `GET /lawyers` and `GET /clients` (§3.3, §3.6).
 *
 * Declared here, by the consumer and in its own terms (architecture §6.2).
 * **The adapter lives in `cases`**:
 * `cases/infrastructure/acl/people-active-cases-counter.adapter.ts` implements
 * it and `CasesModule` exports this token, so the binding arrives through the
 * module import — the mirror of how `cases` receives `PEOPLE_LOOKUP` from here.
 *
 * Which cases count as active is `cases`' rule, not this subsystem's (§4):
 * this port only asks for the number. Note that for a lawyer and for a client
 * a case in the **initial** state counts — only the count per procedural state
 * excludes it.
 */
export interface ActiveCasesCounterPort {
  /**
   * Active cases per responsible lawyer id. This is RN3's "carga de trabajo".
   *
   * Every requested id is present in the result, with `0` when the lawyer has
   * no active case, so callers never have to handle a missing key.
   */
  countByResponsibleLawyer(lawyerIds: readonly number[]): Promise<ReadonlyMap<number, number>>;

  /** Active cases per client id. Same promise about missing keys. */
  countByClient(clientIds: readonly number[]): Promise<ReadonlyMap<number, number>>;
}

export const ActiveCasesCounterPort = Symbol('ActiveCasesCounterPort');
