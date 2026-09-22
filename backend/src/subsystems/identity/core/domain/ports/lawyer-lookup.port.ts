/**
 * DI token for {@link LawyerLookupPort}. See D-09 for the
 * Symbol-as-token convention.
 */
export const LAWYER_LOOKUP = Symbol("LAWYER_LOOKUP");

/**
 * Declared by `identity`, in its own vocabulary, to validate that a
 * `lawyerId` supplied to `RegisterUser` refers to an existing lawyer
 * in the `people` subsystem (RN via API contract §3.2: a user with
 * role `LAWYER` must reference one).
 *
 * `people` does not exist yet (it is HU-12's scope, tracked
 * separately). Until then, `infrastructure/acl/lawyer-lookup.adapter.ts`
 * provides a stub implementation of this port so `identity` can be
 * built and tested end-to-end without a hard dependency on `people`.
 * When `people` lands, only that adapter needs to change — this
 * interface and everything that depends on it stay untouched.
 */
export interface LawyerLookupPort {
  /** `true` if a lawyer with this id exists (and is current). */
  existsById(lawyerId: number): Promise<boolean>;
}
