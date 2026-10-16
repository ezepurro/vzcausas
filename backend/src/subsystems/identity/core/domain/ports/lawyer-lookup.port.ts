/**
 * DI token for {@link LawyerLookupPort}. See D-09 for the
 * Symbol-as-token convention.
 */
export const LAWYER_LOOKUP = Symbol("LAWYER_LOOKUP");

/**
 * The professional record behind a user's `lawyerId`, in the shape
 * the API contract embeds under `user.lawyer` (§3.2).
 *
 * Deliberately narrower than what `people` knows about a lawyer:
 * `identity` renders these three fields and has no business seeing
 * the rest.
 */
export type LawyerSummary = {
  id: number;
  lastName: string;
  firstName: string;
  registrationNumber: string;
};

/**
 * Declared by `identity`, in its own vocabulary, to reach the
 * `people` subsystem for the one thing it legitimately needs: the
 * lawyer a user is linked to.
 *
 * Implemented by `infrastructure/acl/lawyer-lookup.adapter.ts`, which
 * delegates to `people`'s exported use case. Nothing else in
 * `identity` knows that subsystem exists.
 */
export interface LawyerLookupPort {
  /** `true` if a lawyer with this id exists (and is current). */
  existsById(lawyerId: number): Promise<boolean>;

  /**
   * Resolves several lawyers at once, keyed by id; ids that do not
   * resolve are simply absent from the map.
   *
   * Batched rather than one-at-a-time because `GET /users` renders a
   * whole page of users, each possibly linked to a lawyer: resolving
   * them individually would issue one query per row.
   */
  findSummaries(
    lawyerIds: readonly number[],
  ): Promise<Map<number, LawyerSummary>>;
}
