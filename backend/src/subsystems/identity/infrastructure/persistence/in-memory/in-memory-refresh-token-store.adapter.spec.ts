import { ConfigService } from "@nestjs/config";
import { ClockPort } from "@shared/domain/clock.port";
import { InMemoryRefreshTokenStore } from "./in-memory-refresh-token-store.adapter";

class FakeClock implements ClockPort {
  constructor(private current: Date) {}
  now(): Date {
    return this.current;
  }
  set(d: Date): void {
    this.current = d;
  }
}

class FakeConfigService {
  constructor(private readonly values: Record<string, unknown>) {}
  getOrThrow<T>(key: string): T {
    if (!(key in this.values)) {
      throw new Error(`Config key "${key}" is not defined`);
    }
    return this.values[key] as T;
  }
}

const NOW = new Date("2026-09-23T10:00:00Z");

const build = (ttl = "7d") => {
  const clock = new FakeClock(NOW);
  const store = new InMemoryRefreshTokenStore(
    clock,
    new FakeConfigService({ JWT_REFRESH_TTL: ttl }) as unknown as ConfigService,
  );
  return { clock, store };
};

describe("InMemoryRefreshTokenStore", () => {
  it("issues an opaque token in a brand new family when familyId is null", async () => {
    const { store } = build();

    const issued = await store.issue({ userId: 1, familyId: null });

    expect(issued.token).toBeTruthy();
    expect(issued.familyId).toBeTruthy();
    expect(issued.familyId).not.toBe(issued.token);
    expect(issued.userId).toBe(1);
    expect(issued.revokedAt).toBeNull();
  });

  it("computes expiresAt from the injected clock and JWT_REFRESH_TTL (D-46)", async () => {
    const { store } = build("7d");

    const issued = await store.issue({ userId: 1, familyId: null });

    expect(issued.expiresAt).toEqual(new Date("2026-09-30T10:00:00Z"));
  });

  it("continues an existing family on rotation", async () => {
    const { store } = build();
    const first = await store.issue({ userId: 1, familyId: null });

    const rotated = await store.issue({
      userId: 1,
      familyId: first.familyId,
    });

    expect(rotated.familyId).toBe(first.familyId);
    expect(rotated.token).not.toBe(first.token);
  });

  it("returns revoked records from find instead of hiding them", async () => {
    // This is what lets RefreshSession detect reuse (D-05): the
    // record must come back so the use case can inspect revokedAt.
    const { store } = build();
    const issued = await store.issue({ userId: 1, familyId: null });

    await store.revoke(issued.token);
    const found = await store.find(issued.token);

    expect(found).not.toBeNull();
    expect(found!.revokedAt).toEqual(NOW);
  });

  it("returns null only for tokens that never existed", async () => {
    const { store } = build();

    expect(await store.find("never-issued")).toBeNull();
  });

  it("revokeFamily kills every token of the lineage and leaves other families alone", async () => {
    const { store } = build();
    const a1 = await store.issue({ userId: 1, familyId: null });
    const a2 = await store.issue({ userId: 1, familyId: a1.familyId });
    const other = await store.issue({ userId: 1, familyId: null });

    await store.revokeFamily(a1.familyId);

    expect((await store.find(a1.token))!.revokedAt).not.toBeNull();
    expect((await store.find(a2.token))!.revokedAt).not.toBeNull();
    // A concurrent session of the same user survives (Q-02).
    expect((await store.find(other.token))!.revokedAt).toBeNull();
  });

  it("revokeAllForUser kills every family of that user and nobody else's", async () => {
    const { store } = build();
    const mine = await store.issue({ userId: 1, familyId: null });
    const alsoMine = await store.issue({ userId: 1, familyId: null });
    const theirs = await store.issue({ userId: 2, familyId: null });

    await store.revokeAllForUser(1);

    expect((await store.find(mine.token))!.revokedAt).not.toBeNull();
    expect((await store.find(alsoMine.token))!.revokedAt).not.toBeNull();
    expect((await store.find(theirs.token))!.revokedAt).toBeNull();
  });

  it("keeps the first revocation timestamp when revoked twice", async () => {
    const { store, clock } = build();
    const issued = await store.issue({ userId: 1, familyId: null });

    await store.revoke(issued.token);
    clock.set(new Date("2026-09-23T12:00:00Z"));
    await store.revoke(issued.token);

    // Idempotent: the second call is a no-op, which is what Logout
    // (D-32) and reuse detection (D-29) depend on.
    expect((await store.find(issued.token))!.revokedAt).toEqual(NOW);
  });

  it("hands back copies so callers cannot mutate stored state", async () => {
    const { store } = build();
    const issued = await store.issue({ userId: 1, familyId: null });

    const found = await store.find(issued.token);
    found!.revokedAt = new Date("2026-01-01T00:00:00Z");

    // The store ignores the mutation: revocation only happens
    // through the port's revoke* methods.
    expect((await store.find(issued.token))!.revokedAt).toBeNull();
  });
});
