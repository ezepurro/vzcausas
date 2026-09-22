/**
 * Contract for the currently authenticated user. Passed explicitly
 * into every use case that requires an actor. Lives in `shared`
 * because every subsystem (cases, deadlines, documents, reporting,
 * ...) consumes it; only `identity` emits it after a successful
 * login.
 *
 * `roleNames` is plural (D-22): API v2 permits multiple roles per
 * user. The effective permission set is the union of the permissions
 * from all roles.
 *
 * `lawyerId` is null for users whose roles do not require a lawyer
 * profile (i.e. only SECRETARY). The invariant "roles include
 * ADMINISTRATOR or LAWYER implies lawyerId is not null" is enforced
 * when the User is created, not here (see Q-07 / D-19 / D-25).
 */
export interface AuthenticatedUser {
  readonly userId: number;
  readonly roleNames: readonly string[];
  readonly lawyerId: number | null;
  readonly permissions: readonly string[];
}
