import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseTtlToSeconds } from "../../../../../config/parse-ttl";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import {
  LoginAttemptRecord,
  LoginLockScope,
  LoginLockTier,
  applyFailure,
  assertUsableTier,
  remainingLockSeconds,
} from "@subsystems/identity/core/domain/login-lock-policy";
import {
  LoginAttemptContext,
  LoginThrottle,
} from "@subsystems/identity/core/domain/ports/login-throttle.port";

/** Width of `login_attempts.identifier`. */
const IDENTIFIER_MAX_LENGTH = 120;

/**
 * Reads one tier from the `<prefix>_THRESHOLD`, `<prefix>_WINDOW` and
 * `<prefix>_LADDER` variables.
 *
 * The ladder is a comma-separated list of the same compact durations
 * used everywhere else in the configuration (`90s,5m,15m`), parsed by
 * the shared helper so the project has one TTL syntax rather than a
 * second one invented here (D-41, D-47).
 *
 * @throws {Error} naming the offending variable, at startup.
 */
function readTier(
  config: ConfigService,
  prefix: string,
  scope: LoginLockScope,
): LoginLockTier {
  const rawThreshold = config.getOrThrow<string>(`${prefix}_THRESHOLD`);
  const threshold = Number(rawThreshold);
  if (!Number.isInteger(threshold)) {
    throw new Error(
      `${prefix}_THRESHOLD must be an integer; got ${JSON.stringify(rawThreshold)}.`,
    );
  }

  const ladderSeconds = config
    .getOrThrow<string>(`${prefix}_LADDER`)
    .split(",")
    .map((step) => step.trim())
    .filter((step) => step.length > 0)
    .map((step) => {
      try {
        return parseTtlToSeconds(step);
      } catch (cause) {
        throw new Error(
          `${prefix}_LADDER has an invalid step ${JSON.stringify(step)}: ${(cause as Error).message}`,
        );
      }
    });

  const tier: LoginLockTier = {
    scope,
    threshold,
    windowSeconds: parseTtlToSeconds(config.getOrThrow<string>(`${prefix}_WINDOW`)),
    ladderSeconds,
  };

  assertUsableTier(tier, prefix);
  return tier;
}

/**
 * Storage key for one tier.
 *
 * The username arrives already normalized by its value object (D-17),
 * which is what makes `Admin` and `admin` share a counter rather than
 * offering two free passes.
 *
 * Truncated rather than allowed to overflow the column: a request
 * carrying an absurd forwarded address would otherwise fail the insert
 * and turn a failed login into a 500. A truncated key is still a
 * perfectly good bucket.
 */
function identifierFor(
  scope: LoginLockScope,
  context: LoginAttemptContext,
): string {
  const key =
    scope === "username"
      ? `u:${context.username}`
      : `u:${context.username}|ip:${context.ip}`;

  return key.slice(0, IDENTIFIER_MAX_LENGTH);
}

/** Shape of the locked row as `$queryRaw` returns it. */
type AttemptRow = {
  consecutive_failures: number;
  last_failed_at: Date;
  locked_until: Date | null;
};

/**
 * {@link LoginThrottle} backed by PostgreSQL through Prisma.
 *
 * The policy itself lives in the domain
 * (`core/domain/login-lock-policy.ts`); this class is storage and
 * nothing else. It consumes the domain's pure functions the same way
 * the other Prisma adapters consume entities and value objects.
 *
 * Why the database and not an in-process map: a counter that forgets
 * on restart is a counter an attacker outlasts, and the deploy of a
 * single container would silently hand back every lock in flight.
 * Postgres is already here and the row is one upsert on a path that
 * then spends a few hundred milliseconds in bcrypt.
 */
@Injectable()
export class PrismaLoginThrottle implements LoginThrottle {
  /**
   * The configured policy, resolved once at startup.
   *
   * Order matters and is relied upon by {@link recordFailure}, which
   * always takes its row locks in this sequence so two concurrent
   * attempts on the same account cannot deadlock by grabbing the two
   * tiers in opposite orders.
   */
  private readonly tiers: readonly LoginLockTier[];

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: ClockPort,
    config: ConfigService,
  ) {
    this.tiers = [
      readTier(config, "LOGIN_LOCK", "username+ip"),
      readTier(config, "LOGIN_LOCK_USER", "username"),
    ];
  }

  async remainingLockSeconds(context: LoginAttemptContext): Promise<number> {
    const identifiers = this.tiers.map((tier) =>
      identifierFor(tier.scope, context),
    );

    // No row lock on the read path: this only decides whether to
    // refuse the attempt, and reading a counter one increment stale
    // can at worst let through an attempt that the write path is about
    // to count anyway.
    const rows = await this.prisma.db.loginAttempt.findMany({
      where: { identifier: { in: identifiers } },
    });

    const now = this.clock.now();
    let wait = 0;
    for (const row of rows) {
      wait = Math.max(
        wait,
        remainingLockSeconds(
          {
            failures: row.consecutiveFailures,
            lastFailedAt: row.lastFailedAt,
            lockedUntil: row.lockedUntil,
          },
          now,
        ),
      );
    }

    return wait;
  }

  /**
   * Counts the failure against every tier and reports the resulting
   * wait.
   *
   * Runs in a transaction with the row locked, rather than as a plain
   * read-modify-write, because the obvious attack on a counter is to
   * race it: ten parallel attempts that all read "4 failures" would
   * all write "5" and lose nine increments, buying twice the attempts
   * the threshold allows. The tiers are always locked in array order
   * so two concurrent attempts on the same account cannot deadlock by
   * grabbing them in opposite orders.
   */
  async recordFailure(context: LoginAttemptContext): Promise<number> {
    return this.prisma.runInTransaction(async () => {
      const now = this.clock.now();
      let wait = 0;

      for (const tier of this.tiers) {
        const identifier = identifierFor(tier.scope, context);
        const current = await this.lockRow(identifier, now);
        const next = applyFailure(tier, current, now);

        await this.prisma.db.loginAttempt.update({
          where: { identifier },
          data: {
            consecutiveFailures: next.failures,
            lastFailedAt: next.lastFailedAt,
            lockedUntil: next.lockedUntil,
          },
        });

        wait = Math.max(wait, remainingLockSeconds(next, now));
      }

      return wait;
    });
  }

  async recordSuccess(context: LoginAttemptContext): Promise<void> {
    const identifiers = this.tiers.map((tier) =>
      identifierFor(tier.scope, context),
    );

    // Deleting rather than zeroing: a counter at zero and no row mean
    // the same thing to the policy, and the row is what the cleanup
    // job would have to remove later anyway.
    await this.prisma.db.loginAttempt.deleteMany({
      where: { identifier: { in: identifiers } },
    });
  }

  /**
   * Takes a row lock on the tier's counter, creating the row first if
   * it does not exist.
   *
   * `FOR UPDATE` can only lock a row that is already there, and the
   * first failure against a key has none — hence the insert, which is
   * `DO NOTHING` so that two concurrent first attempts do not collide
   * on the primary key. The sentinel starts at zero failures, which
   * the policy treats exactly like no record at all.
   */
  private async lockRow(
    identifier: string,
    now: Date,
  ): Promise<LoginAttemptRecord> {
    await this.prisma.db.$executeRaw`
      INSERT INTO login_attempts (identifier, consecutive_failures, last_failed_at)
      VALUES (${identifier}, 0, ${now})
      ON CONFLICT (identifier) DO NOTHING
    `;

    const rows = await this.prisma.db.$queryRaw<AttemptRow[]>`
      SELECT consecutive_failures, last_failed_at, locked_until
      FROM login_attempts
      WHERE identifier = ${identifier}
      FOR UPDATE
    `;

    const row = rows[0];
    return {
      failures: row.consecutive_failures,
      lastFailedAt: row.last_failed_at,
      lockedUntil: row.locked_until,
    };
  }
}
