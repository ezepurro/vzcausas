import {
  MAX_LOCK_SECONDS,
  LoginAttemptRecord,
  LoginLockTier,
  applyFailure,
  assertUsableTier,
  remainingLockSeconds,
} from "./login-lock-policy";

/**
 * The shape `.env.example` recommends for the primary tier (username
 * + IP): locks on every 5th consecutive failure, escalating 90s → 5m
 * → 15m → 30m → 60m, with failures decaying after 15 minutes of
 * quiet.
 *
 * Written out here rather than read from the environment: these tests
 * are about the *mechanics* of the ladder, and they have to keep
 * meaning the same thing whatever a deployment configures.
 */
const TIER: LoginLockTier = {
  scope: "username+ip",
  threshold: 5,
  windowSeconds: 15 * 60,
  ladderSeconds: [90, 5 * 60, 15 * 60, 30 * 60, 60 * 60],
};

const T0 = new Date("2026-10-11T12:00:00.000Z");

function at(secondsFromT0: number): Date {
  return new Date(T0.getTime() + secondsFromT0 * 1000);
}

/** Replays `count` failures one second apart, starting at T0. */
function failTimes(count: number): LoginAttemptRecord | null {
  let record: LoginAttemptRecord | null = null;
  for (let i = 0; i < count; i += 1) {
    record = applyFailure(TIER, record, at(i));
  }
  return record;
}

describe("remainingLockSeconds", () => {
  it("reports no lock for a key with nothing on record", () => {
    expect(remainingLockSeconds(null, T0)).toBe(0);
  });

  it("reports no lock while the failure count is below the threshold", () => {
    expect(remainingLockSeconds(failTimes(4), at(4))).toBe(0);
  });

  it("rounds up, so a key with milliseconds left never reports zero", () => {
    // A `Retry-After: 0` reads as "go ahead" and invites a retry that
    // the policy would reject again.
    const record: LoginAttemptRecord = {
      failures: 5,
      lastFailedAt: T0,
      lockedUntil: new Date(T0.getTime() + 400),
    };
    expect(remainingLockSeconds(record, T0)).toBe(1);
  });

  it("reports no lock once the lock has elapsed", () => {
    const record = failTimes(5);
    expect(remainingLockSeconds(record, at(4 + 90))).toBe(0);
  });
});

describe("applyFailure", () => {
  it("starts counting from one for a key with nothing on record", () => {
    const record = applyFailure(TIER, null, T0);

    expect(record.failures).toBe(1);
    expect(record.lockedUntil).toBeNull();
    expect(record.lastFailedAt).toEqual(T0);
  });

  it("locks for the first ladder step on reaching the threshold", () => {
    const record = failTimes(5);

    expect(record?.failures).toBe(5);
    // Fifth failure happens at T0+4s; 90s of lock from there.
    expect(remainingLockSeconds(record, at(4))).toBe(90);
  });

  it("does not lock on the attempts between two thresholds", () => {
    // Failures 6 through 9 keep the expired level-1 lock on record but
    // must not extend it.
    const afterFive = failTimes(5);
    let record = afterFive;

    for (let i = 1; i <= 4; i += 1) {
      record = applyFailure(TIER, record, at(100 + i));
      expect(remainingLockSeconds(record, at(100 + i))).toBe(0);
    }

    expect(record?.failures).toBe(9);
  });

  it("escalates one ladder step per threshold crossed", () => {
    let record = failTimes(5);
    const locks: number[] = [remainingLockSeconds(record, at(4))];

    // Each round: wait out the current lock, then burn five more.
    let t = 100;
    for (let level = 2; level <= 5; level += 1) {
      for (let i = 0; i < 5; i += 1) {
        t += 1;
        record = applyFailure(TIER, record, at(t));
      }
      locks.push(remainingLockSeconds(record, at(t)));
      t += locks[locks.length - 1];
    }

    expect(locks).toEqual([90, 300, 900, 1_800, 3_600]);
  });

  it("caps the escalation at the last ladder step", () => {
    // The cap is what keeps the policy from becoming a denial of
    // service against the account it protects: anyone who knows a
    // username could otherwise lock it out permanently.
    let record = failTimes(5);
    let t = 100;

    for (let level = 2; level <= 8; level += 1) {
      for (let i = 0; i < 5; i += 1) {
        t += 1;
        record = applyFailure(TIER, record, at(t));
      }
      t += remainingLockSeconds(record, at(t));
    }

    expect(record?.failures).toBe(40);
    expect(remainingLockSeconds(record, at(t - 3_600))).toBe(3_600);
  });

  it("decays the count after a quiet window", () => {
    const record = applyFailure(TIER, failTimes(4), at(4 + 901));

    expect(record.failures).toBe(1);
    expect(record.lockedUntil).toBeNull();
  });

  it("measures the decay window from the end of the lock, not the last failure", () => {
    // Regression guard for the ladder being unclimbable. The level-1
    // lock (90s) is shorter than the window (900s) here, but the
    // level-5 lock (3600s) is not: anchoring decay on `lastFailedAt`
    // would reset the count every time a lock outlasts the window, so
    // no key could ever reach level 2.
    const locked: LoginAttemptRecord = {
      failures: 5,
      lastFailedAt: T0,
      lockedUntil: at(3_600),
    };

    // One second after the lock lifts: well past 900s from the last
    // failure, but no time at all has passed since the key became
    // usable.
    const record = applyFailure(TIER, locked, at(3_601));

    expect(record.failures).toBe(6);
  });

  it("keeps an elapsed lock on record so the next level can be reached", () => {
    const record = applyFailure(TIER, failTimes(5), at(200));

    expect(record.failures).toBe(6);
    expect(record.lockedUntil).not.toBeNull();
    expect(remainingLockSeconds(record, at(200))).toBe(0);
  });

  it("honours a tier that locks on every failure", () => {
    const strict: LoginLockTier = { ...TIER, threshold: 1 };
    const record = applyFailure(strict, null, T0);

    expect(remainingLockSeconds(record, T0)).toBe(90);
  });
});

/**
 * Guard rails on what a deployment may configure. Now that the policy
 * comes from `LOGIN_LOCK_*` in the environment, a typo there is the
 * realistic failure — and the adapter runs these at startup so it
 * surfaces as a bootstrap error naming the variable, not as a lockout
 * that behaves oddly weeks later.
 */
describe("assertUsableTier", () => {
  it("accepts the configuration .env.example recommends", () => {
    expect(() => assertUsableTier(TIER, "LOGIN_LOCK")).not.toThrow();
  });

  it("accepts a single-step ladder, which the backstop tier uses", () => {
    const backstop: LoginLockTier = {
      scope: "username",
      threshold: 25,
      windowSeconds: 60 * 60,
      ladderSeconds: [15 * 60],
    };

    expect(() => assertUsableTier(backstop, "LOGIN_LOCK_USER")).not.toThrow();
  });

  it("rejects an empty ladder, which would never lock anything", () => {
    expect(() =>
      assertUsableTier({ ...TIER, ladderSeconds: [] }, "LOGIN_LOCK"),
    ).toThrow(/LOGIN_LOCK_LADDER/);
  });

  it("rejects a ladder above the ceiling, since the last step repeats forever", () => {
    expect(() =>
      assertUsableTier(
        { ...TIER, ladderSeconds: [90, MAX_LOCK_SECONDS + 1] },
        "LOGIN_LOCK",
      ),
    ).toThrow(/ceiling/);
  });

  it("rejects a ladder that goes backwards", () => {
    expect(() =>
      assertUsableTier({ ...TIER, ladderSeconds: [300, 90] }, "LOGIN_LOCK"),
    ).toThrow(/decrease/);
  });

  it("rejects a threshold below one", () => {
    expect(() =>
      assertUsableTier({ ...TIER, threshold: 0 }, "LOGIN_LOCK"),
    ).toThrow(/LOGIN_LOCK_THRESHOLD/);
  });

  it("names the offending variable, so the error is actionable", () => {
    // The whole point of failing at startup: whoever edited the
    // `.env` should not have to read the source to find out which
    // line they broke.
    expect(() =>
      assertUsableTier({ ...TIER, ladderSeconds: [] }, "LOGIN_LOCK_USER"),
    ).toThrow(/LOGIN_LOCK_USER_LADDER/);
  });
});
