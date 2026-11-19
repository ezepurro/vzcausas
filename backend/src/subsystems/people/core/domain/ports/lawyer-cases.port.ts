/**
 * What `people` needs from `cases` to give a lawyer de baja (HU15, D-143): which
 * active cases the lawyer is responsible for, and the means to hand each one to
 * another lawyer or leave it without a responsible ("Sin asignar").
 *
 * Declared here, by the consumer and in its own terms (architecture §6.2).
 * **The adapter lives in `cases`**:
 * `cases/infrastructure/acl/people-lawyer-cases.adapter.ts` implements it and
 * `CasesModule` exports this token, the same way as {@link ActiveCasesCounterPort}.
 *
 * Which cases are active, and what reassigning one means (its audit record, its
 * Drive folder), are `cases`' rules, not this subsystem's (§4): this port only
 * asks. Everything it takes and returns is primitive.
 */
export interface LawyerCasesPort {
  /**
   * The ids of the cases of the lawyer that are active: in force and not in a terminal
   * state, the initial one included. The ones in a terminal state stay with the lawyer
   * as history (D-143) and are not here.
   */
  findActiveCaseIdsOf(lawyerId: number): Promise<number[]>;

  /**
   * How many cases in force the lawyer is still responsible for. Once the active ones have been
   * handed over, those are exactly the ones in a terminal state, which stay with the lawyer as
   * their history (D-143): it tells `documents` whether the lawyer's own folder stays with them
   * (D-132). Which cases are in force and which are terminal is `cases`' rule, not this
   * subsystem's.
   */
  countCasesInForceOf(lawyerId: number): Promise<number>;

  /**
   * Hands each case to another lawyer or, with `responsibleLawyerId` `null`, leaves it
   * orphaned (D-143). Writes the cases and their audit record **in the transaction
   * that is open** when it is called, so it is all or nothing with the lawyer's baja.
   * Nothing goes to Drive here: see {@link announceFolderMoves}.
   *
   * @throws if a case is not an active case of `lawyerId`: the caller has already
   *   checked it, so this is broken data and not a user error.
   */
  reassign(order: LawyerCasesReassignment): Promise<void>;

  /**
   * Tells Drive that the folders of these cases have to follow their new lawyer, or
   * `Sin asignar`. Called **after** the transaction commits. It never throws: if Drive
   * is down the cases are already saved and the folders are corrected later (D-104).
   */
  announceFolderMoves(caseIds: readonly number[]): Promise<void>;
}

export type LawyerCasesReassignment = {
  /** The lawyer given de baja: the cases must be theirs. */
  fromLawyerId: number;
  reassignments: readonly { caseId: number; responsibleLawyerId: number | null }[];
  /** Whoever gives the lawyer de baja: the audit record of each case names them. */
  actorUserId: number;
};

export const LawyerCasesPort = Symbol('LawyerCasesPort');
