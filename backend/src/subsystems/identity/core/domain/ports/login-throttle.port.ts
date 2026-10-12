/**
 * DI token for {@link LoginThrottle}. See glossary §7.1 in
 * IMPLEMENTACION_AUTH.md for the Symbol-as-token convention.
 */
export const LOGIN_THROTTLE = Symbol("LOGIN_THROTTLE");

/**
 * Who is attempting to log in, as far as the throttle is concerned.
 *
 * `username` is the **normalized** value (the `Username` value object's
 * string), so `Admin` and `admin` share one counter — otherwise D-17's
 * normalization would be trivially bypassable by varying the case.
 *
 * `ip` is whatever the request resolved to. It is a string and not a
 * parsed address on purpose: the throttle only ever uses it as a map
 * key, and an unparseable value is still a usable bucket.
 */
export type LoginAttemptContext = {
  readonly username: string;
  readonly ip: string;
};

/**
 * Consecutive-failure lockout for `POST /auth/login` (closes Q-03).
 *
 * Two tiers are applied to every attempt, because they stop different
 * attacks and a single one has a hole either way:
 *
 * - **username + ip** is the primary lock, the one the feature was
 *   asked for. Keying it on the pair rather than on the username alone
 *   is what stops a stranger from locking a lawyer out of their own
 *   account by failing on purpose.
 * - **username alone** is a backstop with a deliberately high
 *   threshold. Without it, a distributed attempt walks straight
 *   through the primary lock: a hundred hosts failing four times each
 *   is four hundred guesses at one account and not a single lock,
 *   because no (username, ip) pair ever reaches five.
 *
 * Neither tier is a substitute for the per-IP request throttle, which
 * caps volume regardless of which account is targeted and is the only
 * one of the three that sees password spraying (one password against
 * two hundred usernames leaves one failure per account).
 *
 * **The counters are keyed on the submitted username, not on a user
 * id, and a username that does not exist is counted all the same.**
 * That is load bearing: D-18 answers an unknown user and a wrong
 * password with the same opaque 401 precisely so callers cannot
 * enumerate accounts, and a lock that only existed for real users
 * would hand that distinction straight back — "this one locked, so
 * this one exists".
 */
export interface LoginThrottle {
  /**
   * Seconds the caller must wait, or `0` when the attempt may proceed.
   *
   * Called **before** the password is verified, so a locked key costs
   * no bcrypt work. At cost 12 (D-07) each hash is a few hundred
   * milliseconds of CPU, which is itself worth denying to an attacker.
   */
  remainingLockSeconds(context: LoginAttemptContext): Promise<number>;

  /**
   * Records one failed attempt against every tier and reports the
   * resulting wait, or `0` if the attempt merely failed without
   * tripping a lock.
   *
   * It returns the wait rather than nothing so the attempt that
   * *causes* the lock can say so immediately. Answering "invalid
   * credentials" on the fifth try and "too many attempts" on the sixth
   * reads as two unrelated problems to someone who simply forgot their
   * password.
   */
  recordFailure(context: LoginAttemptContext): Promise<number>;

  /** Clears every tier's counter for the context. Idempotent. */
  recordSuccess(context: LoginAttemptContext): Promise<void>;
}
