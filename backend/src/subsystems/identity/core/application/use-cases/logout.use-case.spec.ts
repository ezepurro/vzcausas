import {
  RefreshTokenStore,
  StoredRefresh,
} from "../../domain/ports/refresh-token-store.port";
import { LogoutUseCase } from "./logout.use-case";

/**
 * Refresh store fake with real state. Tracks every mutating call so
 * the tests can assert both the effect (records revoked) and the
 * shape of the interaction (which port method was called, which was
 * not).
 */
class FakeRefreshStore implements RefreshTokenStore {
  records: StoredRefresh[] = [];
  revokeFamilyCalls: string[] = [];
  revokeCalls: string[] = [];
  revokeAllForUserCalls: number[] = [];
  private counter = 0;

  seed(record: StoredRefresh): void {
    this.records.push(record);
  }

  async issue(params: {
    userId: number;
    familyId: string | null;
  }): Promise<StoredRefresh> {
    this.counter += 1;
    const record: StoredRefresh = {
      token: `refresh-${this.counter}`,
      userId: params.userId,
      familyId: params.familyId ?? `fam-${this.counter}`,
      createdAt: new Date("2026-09-22T10:00:00Z"),
      expiresAt: new Date("2026-09-29T10:00:00Z"),
      revokedAt: null,
    };
    this.records.push(record);
    return record;
  }

  async find(token: string): Promise<StoredRefresh | null> {
    return this.records.find((r) => r.token === token) ?? null;
  }

  async revoke(token: string): Promise<void> {
    this.revokeCalls.push(token);
    const r = this.records.find((r) => r.token === token);
    if (r && r.revokedAt === null) {
      r.revokedAt = new Date("2026-09-22T10:00:00Z");
    }
  }

  async revokeFamily(familyId: string): Promise<void> {
    this.revokeFamilyCalls.push(familyId);
    for (const r of this.records) {
      if (r.familyId === familyId && r.revokedAt === null) {
        r.revokedAt = new Date("2026-09-22T10:00:00Z");
      }
    }
  }

  async revokeAllForUser(userId: number): Promise<void> {
    this.revokeAllForUserCalls.push(userId);
  }

  async findLatestInFamily(
    familyId: string,
  ): Promise<{ createdAt: Date; revokedAt: Date | null } | null> {
    const inFamily = this.records.filter((r) => r.familyId === familyId);
    if (inFamily.length === 0) return null;
    // No `createdAt` on `StoredRefresh` to sort by in this fake; the
    // seed order is good enough since no test here depends on it.
    const latest = inFamily[inFamily.length - 1];
    return { createdAt: new Date("2026-09-20T10:00:00Z"), revokedAt: latest.revokedAt };
  }
}

const seedRefresh = (
  store: FakeRefreshStore,
  overrides: Partial<StoredRefresh> = {},
): StoredRefresh => {
  const record: StoredRefresh = {
    token: overrides.token ?? "refresh-current",
    userId: overrides.userId ?? 1,
    familyId: overrides.familyId ?? "fam-1",
    createdAt: overrides.createdAt ?? new Date("2026-09-20T10:00:00Z"),
    expiresAt: overrides.expiresAt ?? new Date("2026-09-28T10:00:00Z"),
    revokedAt: overrides.revokedAt === undefined ? null : overrides.revokedAt,
  };
  store.seed(record);
  return record;
};

describe("LogoutUseCase", () => {
  const build = () => {
    const refreshStore = new FakeRefreshStore();
    const useCase = new LogoutUseCase(refreshStore);
    return { refreshStore, useCase };
  };

  it("revokes the whole family of the presented refresh token", async () => {
    const { refreshStore, useCase } = build();
    seedRefresh(refreshStore, { userId: 1, familyId: "fam-1" });

    await useCase.execute({ userId: 1, refreshToken: "refresh-current" });

    expect(refreshStore.revokeFamilyCalls).toEqual(["fam-1"]);
    // Neither `revoke(token)` nor `revokeAllForUser` should ever run
    // in the logout flow — the family is the correct blast radius.
    expect(refreshStore.revokeCalls).toEqual([]);
    expect(refreshStore.revokeAllForUserCalls).toEqual([]);
  });

  it("completes silently when the refresh cookie is absent", async () => {
    const { refreshStore, useCase } = build();

    await expect(
      useCase.execute({ userId: 1, refreshToken: null }),
    ).resolves.toBeUndefined();

    expect(refreshStore.revokeFamilyCalls).toEqual([]);
  });

  it("completes silently when the refresh token is unknown", async () => {
    const { refreshStore, useCase } = build();

    await expect(
      useCase.execute({ userId: 1, refreshToken: "does-not-exist" }),
    ).resolves.toBeUndefined();

    expect(refreshStore.revokeFamilyCalls).toEqual([]);
  });

  it("completes silently when the refresh belongs to another user (D-31)", async () => {
    const { refreshStore, useCase } = build();
    seedRefresh(refreshStore, { userId: 2, familyId: "fam-other" });

    await expect(
      useCase.execute({ userId: 1, refreshToken: "refresh-current" }),
    ).resolves.toBeUndefined();

    // The presented family is not touched — no side-effect on
    // another user's session.
    expect(refreshStore.revokeFamilyCalls).toEqual([]);
  });

  it("is idempotent: a second logout with an already-revoked token still calls revokeFamily and does not throw", async () => {
    const { refreshStore, useCase } = build();
    seedRefresh(refreshStore, {
      userId: 1,
      familyId: "fam-1",
      revokedAt: new Date("2026-09-22T09:00:00Z"),
    });

    await expect(
      useCase.execute({ userId: 1, refreshToken: "refresh-current" }),
    ).resolves.toBeUndefined();

    // The use case does not distinguish "live" from "revoked" at the
    // logout stage: it just tells the store to close the family.
    // The port's own idempotency handles the rest.
    expect(refreshStore.revokeFamilyCalls).toEqual(["fam-1"]);
  });
});
