/**
 * What `people` needs from `identity` when a lawyer is given de baja (HU15, D-133): the user
 * whose profile is that lawyer stops being a lawyer.
 *
 * Declared here, by the consumer and in its own terms (architecture §6.2). **The adapter lives
 * in `identity`**: `identity/infrastructure/acl/people-lawyer-user.adapter.ts` implements it and
 * `IdentityModule` exports this token. What losing the profile means for the user (the role,
 * the account, the sessions) is `identity`'s rule, not this subsystem's.
 */
export interface LawyerUserPort {
  /**
   * The user linked to this lawyer, if any, loses the link and the `LAWYER` role, which needs a
   * professional profile; if it was their only role, the user is given de baja. Nothing happens
   * when no user is linked. Writes **in the transaction that is open** when it is called, so it
   * is all or nothing with the lawyer's baja.
   */
  unlinkLawyer(lawyerId: number): Promise<void>;
}

export const LawyerUserPort = Symbol("LawyerUserPort");
