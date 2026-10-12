import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerLimitDetail } from "@nestjs/throttler";
import { TooManyRequestsError } from "@shared/domain/domain-error";

/**
 * Per-IP request volume limiter (Q-03's "mitigación mínima"), on top
 * of and independent from the per-account login lockout
 * (`LoginThrottle`). They defend against different things:
 *
 * - The login lockout counts *wrong passwords against one account*
 *   and is blind to volume — a hundred hosts failing four times each
 *   never trips it (that is exactly why it has a username-only
 *   backstop, see `LoginThrottle`'s doc).
 * - This guard counts *requests from one address*, regardless of
 *   which account or endpoint they target. It is what stops password
 *   spraying (one password against two hundred usernames — one
 *   failure per account, but two hundred requests from one IP) and
 *   what keeps a burst of traffic from spending the server's CPU on
 *   bcrypt before any account-level check even runs.
 *
 * **Why this class exists instead of using `ThrottlerGuard` as-is**:
 * its default rejection is a bare `ThrottlerException` with Nest's own
 * English message and no `details`. Overriding
 * {@link throwThrottlingException} routes every block through the
 * same {@link TooManyRequestsError} → `DomainErrorFilter` path the
 * login lockout already uses (`TooManyLoginAttemptsError`), so a
 * client handles both 429 flavours identically: one envelope shape,
 * one `Retry-After` header, one `details.retryAfterSeconds`. Without
 * this override, the per-IP case would need a second, divergent
 * branch in the filter.
 *
 * `timeToBlockExpire` is already in seconds — `ThrottlerStorageService`
 * converts internally — so it is used as `retryAfterSeconds` directly.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(
    _context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new TooManyRequestsError(
      "TOO_MANY_REQUESTS",
      "Demasiadas peticiones. Esperá un momento antes de reintentar.",
      { retryAfterSeconds: throttlerLimitDetail.timeToBlockExpire },
    );
  }
}
