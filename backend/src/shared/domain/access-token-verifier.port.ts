import { AuthenticatedUser } from "./authenticated-user";

/**
 * DI token for {@link AccessTokenVerifier}. See D-09 and glossary §7.1
 * in IMPLEMENTACION_AUTH.md for the Symbol-as-token convention.
 */
export const ACCESS_TOKEN_VERIFIER = Symbol("ACCESS_TOKEN_VERIFIER");

/**
 * What the shared kernel needs in order to authenticate a request:
 * turn the bearer token of an incoming call into the actor behind it.
 *
 * Declared here, in `shared`, rather than reused from `identity`'s
 * `TokenIssuer` (D-55). `JwtAuthGuard` is consumed by every subsystem
 * and therefore lives in the kernel; if the kernel imported from
 * `identity`, the module everyone depends on would itself depend on a
 * subsystem — the inversion that rule 5 of
 * `ARQUITECTURA_BACKEND_V1.md` §5.4 forbids. So the consumer declares
 * the need in its own vocabulary and `identity` supplies an adapter
 * (§6).
 *
 * The port deliberately speaks of {@link AuthenticatedUser} and not of
 * JWT claims: the kernel does not care that the credential is a signed
 * token, only that it identifies an actor. Swapping HS256 for opaque
 * tokens or an external identity provider would replace the adapter
 * and leave this untouched.
 *
 * @throws {UnauthorizedError} implementations must reject an invalid,
 *   expired or malformed token with this error, so the global filter
 *   renders the contract's opaque 401 `UNAUTHENTICATED`.
 */
export interface AccessTokenVerifier {
  verify(token: string): Promise<AuthenticatedUser>;
}
