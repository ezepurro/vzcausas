/**
 * DI token for {@link RefreshTokenStore}. See glossary §7.1 in
 * IMPLEMENTACION_AUTH.md for the Symbol-as-token convention.
 */
export const REFRESH_TOKEN_STORE = Symbol("REFRESH_TOKEN_STORE");

/**
 * A refresh token record as it lives in the store. Returned even when
 * revoked or expired: it is the use case that inspects `revokedAt`
 * and `expiresAt` and decides how to react (e.g. revoke the family on
 * reuse detection, per D-05 and glossary §7.3).
 */
export type StoredRefresh = {
  token: string;
  userId: number;
  familyId: string;
  /**
   * When this specific row was minted. Unlike `expiresAt` (fixed at
   * issuance from `JWT_REFRESH_TTL`), this moves forward on every
   * rotation — which is exactly what makes it usable as "last time
   * this session proved it was still being used" for the inactivity
   * check (CA-1.6, `RefreshSessionUseCase`,
   * `RefreshTokenStore.findLatestInFamily`).
   */
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

/**
 * Persistence port for opaque refresh tokens (D-05, D-08). Supports
 * rotation (issue in an existing `familyId`) and reuse detection
 * (`find` returns revoked records so the use case can call
 * {@link RefreshTokenStore.revokeFamily}).
 *
 * Big picture (see glossary §7.2, §7.3 and §7.5): the refresh token
 * is a long-lived, revocable credential kept in an `HttpOnly` cookie.
 * Unlike the access JWT, it has no data inside; it is just a random
 * identifier persisted here. Each use rotates it (a new one is issued
 * and the previous is revoked) and every family of rotations shares a
 * `familyId` so that reuse of a revoked token can be treated as theft
 * and the whole family can be killed.
 *
 * `expiresAt` is computed internally from `JWT_REFRESH_TTL` (D-04);
 * callers do not supply it. `familyId` is an opaque UUID string.
 */
export interface RefreshTokenStore {
  /**
   * Creates and persists a new refresh token. Pass `familyId: null`
   * to start a new family (fresh login); pass an existing UUID to
   * continue a family (rotation).
   */
  issue(params: {
    userId: number;
    familyId: string | null;
  }): Promise<StoredRefresh>;

  /**
   * Looks up a refresh token by its raw value. Returns the record
   * even if `revokedAt` is set or `expiresAt` is in the past — the
   * caller inspects those fields. Returns `null` only when no record
   * matches the token value.
   */
  find(token: string): Promise<StoredRefresh | null>;

  /** Marks a single token as revoked. Idempotent. */
  revoke(token: string): Promise<void>;

  /**
   * Revokes every token in the given family. Called by
   * `RefreshSession` when a revoked refresh is presented again — a
   * signal of theft (glossary §7.3).
   */
  revokeFamily(familyId: string): Promise<void>;

  /**
   * Revokes every refresh token belonging to a user. Called by
   * `ChangePassword` (Q-01) to force reauthentication on all other
   * devices after a password change, and available for admin-driven
   * lockouts.
   */
  revokeAllForUser(userId: number): Promise<void>;

  /**
   * Reports the most recently issued token in a family: when it was
   * created, and whether it is still live.
   *
   * This is what lets the access-token verifier answer, on every
   * request and without the raw refresh value (the JWT's `sid` claim
   * carries only the family id), two questions: is the session this
   * access token belongs to still open — not logged out, not wiped by
   * a password change, not killed by reuse detection (CA-2.3) — and
   * how long has it sat without being renewed (CA-1.6). A family's
   * newest row is exactly the session's last point of contact with
   * the server: rotation stamps a fresh `createdAt` on every renewal
   * and nothing else touches it.
   *
   * Returns `null` only when the family has never existed — which
   * {@link AccessTokenVerifier} treats as "nothing this opaque to the
   * caller" rather than panicking. A family that existed and was
   * fully revoked still returns its newest row, with `revokedAt` set:
   * this method reports state, the caller decides what it means.
   */
  findLatestInFamily(
    familyId: string,
  ): Promise<{ createdAt: Date; revokedAt: Date | null } | null>;
}
