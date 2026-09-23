import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseTtlToSeconds } from "@shared/config/parse-ttl";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import {
  RefreshTokenStore,
  StoredRefresh,
} from "@subsystems/identity/core/domain/ports/refresh-token-store.port";

/**
 * Transitional {@link RefreshTokenStore} implementation backed by a
 * `Map`. Like {@link InMemoryUserRepository} it is a production
 * adapter, not a test fake (D-48), and P-15 replaces it with the
 * Prisma-backed version.
 *
 * Restarting the process wipes every session: refresh tokens live
 * only in memory, so all clients are pushed back to login. Acceptable
 * for the pre-Prisma window, and worth remembering when testing
 * against a dev server that reloads on change.
 *
 * Two behaviours are load-bearing for the use cases built on top:
 *
 * - {@link find} returns revoked and expired records instead of
 *   hiding them. `RefreshSession` needs to *see* a revoked token to
 *   detect reuse and kill the family (D-05, glossary §7.3); returning
 *   `null` would silently downgrade theft detection to an ordinary
 *   "unknown token" rejection.
 * - Every read hands back a copy. The Prisma adapter will materialize
 *   a fresh object per query, and callers must not be able to mutate
 *   the store by holding onto a returned record — revocation happens
 *   through {@link revoke} and friends, never by assigning to
 *   `revokedAt` on a result.
 */
@Injectable()
export class InMemoryRefreshTokenStore implements RefreshTokenStore {
  /** Keyed by the opaque token value the client holds in its cookie. */
  private readonly records = new Map<string, StoredRefresh>();

  private readonly ttlSeconds: number;

  constructor(
    @Inject(CLOCK) private readonly clock: ClockPort,
    config: ConfigService,
  ) {
    // Mandatory per bitácora §6; fail at bootstrap rather than mint
    // tokens with an implicit lifetime (D-39). The shared parser
    // rejects anything outside `<digits>(s|m|h|d)` (D-41, D-47).
    this.ttlSeconds = parseTtlToSeconds(
      config.getOrThrow<string>("JWT_REFRESH_TTL"),
    );
  }

  async issue(params: {
    userId: number;
    familyId: string | null;
  }): Promise<StoredRefresh> {
    // `randomUUID` for both the token and the family id (D-45): the
    // port only requires opacity, and a v4 UUID is unguessable enough
    // while costing no dependency.
    const record: StoredRefresh = {
      token: randomUUID(),
      userId: params.userId,
      // A null familyId opens a new lineage (fresh login); an existing
      // one continues it (rotation, D-27).
      familyId: params.familyId ?? randomUUID(),
      expiresAt: new Date(this.clock.now().getTime() + this.ttlSeconds * 1000),
      revokedAt: null,
    };

    this.records.set(record.token, record);
    return { ...record };
  }

  async find(token: string): Promise<StoredRefresh | null> {
    const record = this.records.get(token);

    // Revoked and expired records are returned on purpose — see the
    // class docblock. `null` means "never existed".
    return record ? { ...record } : null;
  }

  async revoke(token: string): Promise<void> {
    this.markRevoked(this.records.get(token));
  }

  async revokeFamily(familyId: string): Promise<void> {
    for (const record of this.records.values()) {
      if (record.familyId === familyId) {
        this.markRevoked(record);
      }
    }
  }

  async revokeAllForUser(userId: number): Promise<void> {
    for (const record of this.records.values()) {
      if (record.userId === userId) {
        this.markRevoked(record);
      }
    }
  }

  /**
   * Stamps `revokedAt` unless it is already set. Keeping the first
   * revocation timestamp makes the operation idempotent, which the
   * port promises and which `Logout` (D-32) and reuse detection
   * (D-29) both rely on: they revoke families that may already
   * contain dead tokens.
   */
  private markRevoked(record: StoredRefresh | undefined): void {
    if (record && record.revokedAt === null) {
      record.revokedAt = this.clock.now();
    }
  }
}
