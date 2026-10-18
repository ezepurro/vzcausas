/**
 * Progressive lockout policy for failed login attempts (closes Q-03).
 *
 * Pure domain logic: no clock of its own, no storage, no HTTP. The
 * caller supplies the stored counter and the current instant, and gets
 * back the next counter. That is what lets the ladder be tested
 * exhaustively without a database or a fake timer.
 *
 * Why a counter and not an append-only log of attempts: the only
 * questions the policy answers are *"how many in a row"* and *"until
 * when is it locked"*, and a single mutable row answers both with one
 * upsert. An attempt log would be the right shape for the audit trail
 * that Q-04 and `AUDITORIA_Y_TRAZABILIDAD.md` §4 require, which is a
 * separate concern with separate retention rules.
 */

/**
 * Stored state of one throttled key. Absent (`null` at the call site)
 * means the key has no failures on record.
 *
 * `lockedUntil` is deliberately kept after it elapses rather than
 * cleared: it is what {@link applyFailure} measures the decay window
 * from, so forgetting it would make escalation unreachable (see the
 * note there).
 */
export type LoginAttemptRecord = {
  readonly failures: number;
  readonly lastFailedAt: Date;
  readonly lockedUntil: Date | null;
};

/**
 * What a tier counts against. The adapter turns this into a storage
 * key; the domain only needs to know that two attempts share a counter
 * iff they agree on the scope's fields.
 */
export type LoginLockScope = "username" | "username+ip";

/**
 * One layer of the lockout policy. Two are configured, counting
 * against different scopes with different thresholds, because they
 * stop different attacks — see `LoginThrottle` for which and why.
 *
 * - `threshold`: a lock is applied on every Nth consecutive failure.
 * - `windowSeconds`: failures older than this decay to zero, so an
 *   honest user who mistypes once a month never accumulates a lock.
 * - `ladderSeconds`: lock duration per escalation level. The last
 *   entry repeats forever, which is what caps the escalation — an
 *   unbounded ladder turns the policy into a denial of service against
 *   the very account it protects.
 *
 * The values come from the environment, read and validated once at
 * startup by the adapter (`LOGIN_LOCK_*`, see
 * `IMPLEMENTACION_AUTH.md` §6). The domain only describes the shape:
 * keeping the numbers out of here is what lets the study tune the
 * policy without a code change.
 */
export type LoginLockTier = {
  readonly scope: LoginLockScope;
  readonly threshold: number;
  readonly windowSeconds: number;
  readonly ladderSeconds: readonly number[];
};

/**
 * Rejects a tier the policy cannot honour, with a message naming the
 * variable to fix.
 *
 * Called by the adapter at construction so a bad value fails the
 * bootstrap rather than the first login of the day — the same
 * fail-fast split as D-39, where each adapter validates the format of
 * what it owns and the central validator only checks presence.
 *
 * @throws {Error} if the tier would never lock, never release, or
 *   escalate backwards.
 */
export function assertUsableTier(tier: LoginLockTier, prefix: string): void {
  if (!Number.isInteger(tier.threshold) || tier.threshold < 1) {
    throw new Error(
      `${prefix}_THRESHOLD must be an integer of at least 1; got ${tier.threshold}.`,
    );
  }

  if (tier.ladderSeconds.length === 0) {
    throw new Error(
      `${prefix}_LADDER must list at least one duration: with none, the threshold could be reached and nothing would ever be locked.`,
    );
  }

  // The last step repeats forever, so an ever-growing ladder is a
  // permanent lockout waiting to happen. A ceiling is what keeps the
  // policy from becoming a weapon against the account it protects.
  const longest = tier.ladderSeconds[tier.ladderSeconds.length - 1];
  if (longest > MAX_LOCK_SECONDS) {
    throw new Error(
      `${prefix}_LADDER tops out at ${longest}s, above the ${MAX_LOCK_SECONDS}s ceiling. The final step repeats indefinitely, so anyone who knows a username could keep that account shut for that long at will.`,
    );
  }

  const ascends = tier.ladderSeconds.every(
    (seconds, index) => index === 0 || seconds >= tier.ladderSeconds[index - 1],
  );
  if (!ascends) {
    throw new Error(
      `${prefix}_LADDER must not decrease: a later offence cannot earn a lighter lock than an earlier one.`,
    );
  }
}

/**
 * Ceiling for the final ladder step, in seconds (24 hours).
 *
 * Generous — the recommended top step is an hour — because this is a
 * guard rail against a typo or a misunderstanding, not the policy
 * itself. What it rules out is the unbounded case.
 */
export const MAX_LOCK_SECONDS = 24 * 60 * 60;

/**
 * Seconds left on the lock, or `0` when the key is not locked.
 *
 * Rounded up: reporting `0` to a client that is still locked for
 * 400 ms would invite an immediate retry that fails again. Callers
 * surface this as `Retry-After`, and a `Retry-After: 0` reads as
 * "go ahead".
 */
export function remainingLockSeconds(
  record: LoginAttemptRecord | null,
  now: Date,
): number {
  if (record === null || record.lockedUntil === null) {
    return 0;
  }

  const remainingMs = record.lockedUntil.getTime() - now.getTime();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

/**
 * Next counter state after one failed attempt.
 *
 * The decay window is measured from the **end of the previous lock**,
 * not from the last failure. Measuring it from the last failure would
 * make the ladder unclimbable whenever a lock outlasts the window: a
 * 60-minute lock with a 15-minute window would always have decayed by
 * the time the user can try again, so every lock would be level one
 * forever. Counting from the moment the key became usable again gives
 * the attacker exactly `threshold` attempts per level, which is the
 * intent.
 *
 * Nothing here decides whether the attempt was *allowed* — a locked
 * key is rejected before the password is ever verified, so this is only
 * ever called for attempts that actually ran.
 */
export function applyFailure(
  tier: LoginLockTier,
  record: LoginAttemptRecord | null,
  now: Date,
): LoginAttemptRecord {
  const failures = nextFailureCount(tier, record, now);
  const level = failures % tier.threshold === 0 ? failures / tier.threshold : 0;

  if (level === 0) {
    return {
      failures,
      lastFailedAt: now,
      // Carried over, not re-read: a past lock is what the decay
      // window above anchors to.
      lockedUntil: failures === 1 ? null : (record?.lockedUntil ?? null),
    };
  }

  const index = Math.min(level, tier.ladderSeconds.length) - 1;
  return {
    failures,
    lastFailedAt: now,
    lockedUntil: new Date(now.getTime() + tier.ladderSeconds[index] * 1000),
  };
}

function nextFailureCount(
  tier: LoginLockTier,
  record: LoginAttemptRecord | null,
  now: Date,
): number {
  if (record === null) {
    return 1;
  }

  const decayFrom =
    record.lockedUntil !== null &&
    record.lockedUntil.getTime() > record.lastFailedAt.getTime()
      ? record.lockedUntil
      : record.lastFailedAt;

  const elapsedSeconds = (now.getTime() - decayFrom.getTime()) / 1000;
  return elapsedSeconds > tier.windowSeconds ? 1 : record.failures + 1;
}
