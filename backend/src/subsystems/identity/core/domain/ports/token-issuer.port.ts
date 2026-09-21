/**
 * DI token for {@link TokenIssuer}. See glossary §7.1 in
 * IMPLEMENTACION_AUTH.md for the Symbol-as-token convention.
 */
export const TOKEN_ISSUER = Symbol("TOKEN_ISSUER");

/**
 * Claims embedded in every access token (D-06). `sub` is the standard
 * JWT subject claim; the rest are custom claims consumed by
 * `JwtAuthGuard` and `PermissionsGuard` so authorization on each
 * request does not need a database round-trip.
 *
 * See glossary §7.4 in IMPLEMENTACION_AUTH.md for the intent of each
 * field in plain language.
 */
export type AccessTokenClaims = {
  sub: number;
  role: string;
  lawyerId: number | null;
  permissions: string[];
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
