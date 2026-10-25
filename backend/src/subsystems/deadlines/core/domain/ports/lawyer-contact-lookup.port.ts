/** DI token for {@link LawyerContactLookupPort}. */
export const LAWYER_CONTACT_LOOKUP = Symbol('LAWYER_CONTACT_LOOKUP');

/** What `deadlines` needs to know about a lawyer to send their copy of the digest. */
export interface LawyerContact {
  fullName: string;
  /** `null` if the lawyer has no linked user, or the user has no email (CA-30.5). */
  userEmail: string | null;
}

/**
 * Resolving "does this lawyer have a user with an email" is "who gets
 * notified" logic (N-09), which belongs to `deadlines`, not to HU51/HU52.
 *
 * Declared here, by the consumer, in its own terms (same pattern as
 * `puertos-acl.md`). Implemented in `people/infrastructure/acl/` (or
 * `identity`, wherever the linked user's email lives).
 */
export interface LawyerContactLookupPort {
  findContactByLawyerId(lawyerId: number): Promise<LawyerContact | null>;
}
