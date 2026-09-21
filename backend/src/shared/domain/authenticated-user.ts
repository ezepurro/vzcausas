/**
 * Contract for the currently authenticated user. Passed explicitly into
 * every use case that requires an actor. Lives in `shared` because every
 * subsystem (cases, deadlines, documents, reporting, ...) consumes it;
 * only `identity` emits it after a successful login.
 *
 * `lawyerId` is null for users whose role is not ABOGADO (i.e. for
 * ADMINISTRADOR or SECRETARIA). The invariant "role ABOGADO implies
 * lawyerId is not null" is enforced when the User is created, not here
 * (see Q-07 / D-19 in IMPLEMENTACION_AUTH.md).
 */
export interface AuthenticatedUser {
  readonly userId: number;
  readonly roleName: string;
  readonly lawyerId: number | null;
  readonly permissions: readonly string[];
}
