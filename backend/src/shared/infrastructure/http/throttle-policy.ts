import { parseTtlToSeconds } from "@shared/config/parse-ttl";

/**
 * The stricter per-IP limit for `POST /auth/login` and
 * `POST /auth/refresh`, read lazily from `THROTTLE_AUTH_LIMIT` /
 * `THROTTLE_AUTH_WINDOW` (Q-03's "mitigación mínima").
 *
 * This is **not** read through `ConfigService` like the rest of the
 * project's policy knobs (D-39): it is consumed from inside
 * `@Throttle()`'s `limit`/`ttl` resolver functions on
 * `AuthController`, which `@nestjs/throttler` evaluates per request.
 * Those functions are plain closures captured at decorator-evaluation
 * time — before Nest's DI container exists — so there is no
 * constructor to inject `ConfigService` into. Reading `process.env`
 * directly at call time has precedent in this codebase
 * (`PrismaService`'s constructor does the same for `DATABASE_URL`).
 *
 * Presence is still enforced at boot by `env.validation.ts`; what
 * happens here is *format* validation, same split as every other
 * adapter (D-39) — just triggered by the first request instead of by
 * a constructor, because a decorator closure has no constructor to
 * run in. The parsed result is cached after the first successful
 * call, so the cost of re-parsing is paid at most once per process.
 *
 * The generous, API-wide default limit is configured separately, in
 * `AppModule`'s `ThrottlerModule.forRootAsync`, which *does* have
 * `ConfigService` available and validates at boot in the usual way.
 */

let cached: { limit: number; ttlMs: number } | null = null;

function parse(): { limit: number; ttlMs: number } {
  const rawLimit = process.env.THROTTLE_AUTH_LIMIT;
  const limit = Number(rawLimit);
  if (!rawLimit || !Number.isInteger(limit) || limit < 1) {
    throw new Error(
      `THROTTLE_AUTH_LIMIT must be a positive integer; got ${JSON.stringify(rawLimit)}.`,
    );
  }

  const rawWindow = process.env.THROTTLE_AUTH_WINDOW;
  if (!rawWindow) {
    throw new Error("THROTTLE_AUTH_WINDOW is required but was not set.");
  }
  const ttlMs = parseTtlToSeconds(rawWindow) * 1000;

  return { limit, ttlMs };
}

function policy(): { limit: number; ttlMs: number } {
  cached ??= parse();
  return cached;
}

export function authThrottleLimit(): number {
  return policy().limit;
}

export function authThrottleTtlMs(): number {
  return policy().ttlMs;
}
