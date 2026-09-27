import { Inject, Injectable } from "@nestjs/common";
import {
  REFRESH_TOKEN_STORE,
  RefreshTokenStore,
} from "../../domain/ports/refresh-token-store.port";

/**
 * Input command for {@link LogoutUseCase}. `userId` is taken from the
 * `AuthenticatedUser` that `JwtAuthGuard` (P-12) attaches to the
 * request after validating the access token; `refreshToken` is what
 * the controller (P-11) reads from the `refresh_token` cookie. It is
 * `null` when the cookie is absent (client cleared it, TTL elapsed,
 * multi-tab race, etc.). In that case the use case completes silently
 * — logout is idempotent (D-33).
 */
export type LogoutCommand = {
  userId: number;
  refreshToken: string | null;
};

/**
 * Logout use case (HU2). Closes the current session by revoking the
 * refresh family of the presented cookie, without touching the user's
 * other concurrent sessions (D-05/Q-02: concurrent logins are allowed
 * and every login opens its own family).
 *
 * The 401 documented in API v2 §3.1 for `POST /auth/logout` belongs
 * entirely to `JwtAuthGuard` (P-12), which rejects an invalid access
 * token before execution reaches this use case. Once we are here,
 * every branch completes without throwing (D-33): absent cookie,
 * unknown token, or a token whose owner does not match the
 * authenticated caller (D-31) all resolve to a no-op. This keeps
 * logout idempotent (a double click or a network retry simply
 * repeats the same silent no-op) and denies a side-channel that
 * would let an authenticated caller probe other users' familyIds by
 * comparing logout outcomes.
 *
 * `revokeFamily` (D-32) is preferred over `revoke(token)`: it closes
 * the whole rotation lineage of the session, which incidentally
 * covers the D-27 edge case (a transient failure that left two live
 * tokens in the same family). It is idempotent by port contract, so
 * a repeated logout with a token whose family was already revoked
 * still completes cleanly.
 *
 * Deuda (Q-04): when the audit logger lands, the three silent paths
 * (absent, unknown, cross-user) should emit anomaly events without
 * changing the response shape.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_STORE)
    private readonly refreshStore: RefreshTokenStore,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    if (command.refreshToken === null) {
      // No cookie was presented. Nothing to revoke server-side; the
      // session is already gone from the client's perspective.
      return;
    }

    const stored = await this.refreshStore.find(command.refreshToken);
    if (!stored) {
      // Unknown token: never issued, or purged from the store.
      // Complete silently.
      return;
    }

    if (stored.userId !== command.userId) {
      // Cross-user mismatch (D-31): the authenticated caller
      // presented a cookie that belongs to another user. Refuse to
      // act on it, but do not throw — the response must look
      // identical to the "unknown token" path so nothing can be
      // inferred from the outcome.
      return;
    }

    // Kill the whole family (D-32). Idempotent by port contract and
    // safe even when the presented token is already revoked (D-29).
    await this.refreshStore.revokeFamily(stored.familyId);
  }
}
