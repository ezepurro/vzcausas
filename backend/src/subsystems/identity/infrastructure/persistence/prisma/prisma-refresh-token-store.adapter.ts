import { createHash, randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseTtlToSeconds } from "@shared/config/parse-ttl";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import {
  RefreshTokenStore,
  StoredRefresh,
} from "@subsystems/identity/core/domain/ports/refresh-token-store.port";

/**
 * Derives the column value from the token the client holds.
 *
 * The stored form is a digest, never the token itself, so that reading
 * the table yields nothing usable: a dump of `refresh_tokens` does not
 * hand an attacker a set of live sessions. SHA-256 rather than bcrypt
 * is the right tool here — these are full-entropy random values, not
 * passwords, so there is no dictionary to defend against, and the
 * lookup happens on every renewal and must stay cheap.
 */
function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * {@link RefreshTokenStore} backed by PostgreSQL through Prisma.
 *
 * Replaces the in-memory adapter. The consequence worth knowing:
 * sessions now survive a restart, so a developer is no longer logged
 * out every time the dev server reloads.
 *
 * The port speaks in raw token values while the table stores digests.
 * That gap is this adapter's job and does not leak in either
 * direction: the raw value is returned to the caller on
 * {@link issue} because it is the only moment it exists, and on
 * {@link find} it is echoed back from the argument, since a digest
 * cannot be reversed.
 */
@Injectable()
export class PrismaRefreshTokenStore implements RefreshTokenStore {
  private readonly ttlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: ClockPort,
    config: ConfigService,
  ) {
    this.ttlSeconds = parseTtlToSeconds(
      config.getOrThrow<string>("JWT_REFRESH_TTL"),
    );
  }

  async issue(params: {
    userId: number;
    familyId: string | null;
  }): Promise<StoredRefresh> {
    const token = randomUUID();
    // A null familyId opens a new lineage (fresh login); an existing
    // one continues it (rotation).
    const familyId = params.familyId ?? randomUUID();
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1000);

    await this.prisma.db.refreshToken.create({
      data: {
        tokenHash: digest(token),
        userId: params.userId,
        familyId,
        // Set explicitly rather than left to the column's
        // `@default(now())`: the inactivity check (CA-1.6) and
        // `expiresAt` above both need to read the *same* clock, and
        // only the injected `ClockPort` is swappable in tests.
        createdAt: now,
        expiresAt,
      },
    });

    return {
      token,
      userId: params.userId,
      familyId,
      createdAt: now,
      expiresAt,
      revokedAt: null,
    };
  }

  async find(token: string): Promise<StoredRefresh | null> {
    const row = await this.prisma.db.refreshToken.findUnique({
      where: { tokenHash: digest(token) },
    });

    // Revoked and expired rows come back on purpose: the caller
    // inspects those fields, and reuse detection depends on being able
    // to see a token that was already revoked.
    if (!row) {
      return null;
    }

    return {
      // Echoed from the argument — the column holds a digest, and the
      // caller already has the value it asked about.
      token,
      userId: row.userId,
      familyId: row.familyId,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
    };
  }

  async revoke(token: string): Promise<void> {
    await this.markRevoked({ tokenHash: digest(token) });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.markRevoked({ familyId });
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.markRevoked({ userId });
  }

  /**
   * Stamps `revokedAt` on every matching row that is not revoked yet.
   *
   * The `revokedAt: null` filter is what makes revocation idempotent:
   * the first timestamp is preserved, so revoking a family that
   * already contains dead tokens does not rewrite their history.
   * Logout and reuse detection both rely on that, since both revoke
   * sets that may already be partly revoked.
   */
  async findLatestInFamily(
    familyId: string,
  ): Promise<{ createdAt: Date; revokedAt: Date | null } | null> {
    // No digest involved: unlike `find`, the caller never has a raw
    // token value here — only the family id, which travels in plain
    // text as the access token's `sid` claim and was never secret.
    const row = await this.prisma.db.refreshToken.findFirst({
      where: { familyId },
      orderBy: { createdAt: "desc" },
    });

    if (!row) {
      return null;
    }

    return { createdAt: row.createdAt, revokedAt: row.revokedAt };
  }

  private async markRevoked(
    where: { tokenHash: string } | { familyId: string } | { userId: number },
  ): Promise<void> {
    await this.prisma.db.refreshToken.updateMany({
      where: { ...where, revokedAt: null },
      data: { revokedAt: this.clock.now() },
    });
  }
}
