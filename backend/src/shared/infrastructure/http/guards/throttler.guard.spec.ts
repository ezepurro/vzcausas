import { ThrottlerLimitDetail } from "@nestjs/throttler";
import { TooManyRequestsError } from "@shared/domain/domain-error";
import { AppThrottlerGuard } from "./throttler.guard";

const DETAIL: ThrottlerLimitDetail = {
  limit: 10,
  ttl: 60_000,
  key: "throttler:default:203.0.113.5",
  tracker: "203.0.113.5",
  totalHits: 11,
  timeToExpire: 42,
  isBlocked: true,
  timeToBlockExpire: 37,
};

/**
 * `AppThrottlerGuard` only overrides `throwThrottlingException`, and
 * the override touches no instance state — so it is safe to call
 * directly on a prototype instance built without running
 * `ThrottlerGuard`'s own constructor, which otherwise needs a real
 * `ThrottlerModuleOptions`/storage/`Reflector` trio this test has no
 * use for.
 */
function buildGuard(): AppThrottlerGuard {
  return Object.create(AppThrottlerGuard.prototype) as AppThrottlerGuard;
}

describe("AppThrottlerGuard", () => {
  it("throws TooManyRequestsError instead of the library's own ThrottlerException", async () => {
    const guard = buildGuard();

    await expect(
      (guard as any).throwThrottlingException(undefined, DETAIL),
    ).rejects.toBeInstanceOf(TooManyRequestsError);
  });

  it("carries the standard TOO_MANY_REQUESTS code and a Spanish message", async () => {
    const guard = buildGuard();

    const error = await (guard as any)
      .throwThrottlingException(undefined, DETAIL)
      .catch((caught: TooManyRequestsError) => caught);

    expect(error.code).toBe("TOO_MANY_REQUESTS");
    expect(error.message).toMatch(/Demasiadas peticiones/);
  });

  it("carries timeToBlockExpire as retryAfterSeconds, unconverted", async () => {
    // `ThrottlerStorageService` already reports this in seconds, not
    // milliseconds — this test is a regression guard against a future
    // "helpful" `* 1000` or `/ 1000` sneaking into the override.
    const guard = buildGuard();

    const error = await (guard as any)
      .throwThrottlingException(undefined, DETAIL)
      .catch((caught: TooManyRequestsError) => caught);

    expect(error.details).toEqual({ retryAfterSeconds: 37 });
  });
});
