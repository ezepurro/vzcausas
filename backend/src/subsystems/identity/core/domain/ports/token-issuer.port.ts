/**
 * DI token for {@link TokenIssuer}. See glossary §7.1 in
 * IMPLEMENTACION_AUTH.md for the Symbol-as-token convention.
 */
export const TOKEN_ISSUER = Symbol("TOKEN_ISSUER");

/**
 * Claims embedded in every access token (D-06, narrowed by the
 * revocation work that closed CA-2.3/CA-6.2).
 *
 * Until then this carried `roles`, `lawyerId` and `permissions` too,
 * on the premise that authorization could be read off the token
 * without touching the database (D-06's original justification,
 * echoed in `MODULO_AUTH.md` §5 Nivel 1 — now corrected there). That
 * premise is what made the token itself unrevocable in practice: a
 * signed JWT cannot be told that the role it was minted with just
 * changed. Authorization now comes from the database on every request
 * ({@link AccessTokenVerifier}, which `JwtAuthGuard` calls), so the
 * token's job shrinks to what a signature can actually prove —
 * *this is user N, from session S* — and nothing it asserts about
 * permissions can go stale.
 *
 * `sid` is the refresh token's `familyId` at the moment this access
 * token was issued (D-05's rotation lineage). It is what lets the
 * verifier ask "is the session behind this token still open" without
 * the raw refresh value, which it never has.
 */
export type AccessTokenClaims = {
  sub: number;
  sid: string;
};

/**
 * Result of issuing an access token. `expiresIn` is in seconds, per
 * the JWT convention and the shape of the API contract's login
 * response.
 */
export type IssuedAccessToken = {
  token: string;
  expiresIn: number;
};

/**
 * Signing and verification of the access token JWT (D-06, HS256).
 * The refresh token is opaque and lives in {@link RefreshTokenStore};
 * this port only handles the short-lived JWT.
 *
 * Big picture (see glossary §7.2 and §7.4): after login the server
 * hands the client a signed "badge" (the access token). On every
 * request the client sends the badge in the `Authorization` header;
 * the server verifies the signature and reads the claims without
 * hitting the database.
 */
export interface TokenIssuer {
  /**
   * Signs a new access token with the given claims. The `exp` claim
   * is derived internally from `JWT_ACCESS_TTL` (D-04).
   */
  issue(claims: AccessTokenClaims): Promise<IssuedAccessToken>;

  /**
   * Verifies the token's signature and expiration and returns the
   * decoded claims.
   *
   * @throws {UnauthorizedError} if the token is malformed, has an
   *   invalid signature or is expired.
   */
  verify(token: string): Promise<AccessTokenClaims>;
}
