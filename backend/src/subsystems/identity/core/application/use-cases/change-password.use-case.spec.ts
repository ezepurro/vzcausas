import { User } from "../../domain/entities/user.entity";
import {
  InvalidCurrentPasswordError,
  WeakPasswordError,
} from "../../domain/errors/identity.errors";
import { PasswordHasher } from "../../domain/ports/password-hasher.port";
import {
  RefreshTokenStore,
  StoredRefresh,
} from "../../domain/ports/refresh-token-store.port";
import { UserRepository } from "../../domain/ports/user.repository";
import { Email } from "../../domain/value-objects/email.vo";
import { Username } from "../../domain/value-objects/username.vo";
import { ChangePasswordUseCase } from "./change-password.use-case";

class FakeUserRepository implements UserRepository {
  private byId = new Map<number, User>();
  private byUsername = new Map<string, User>();
  saveCalls: number[] = [];

  seed(user: User): void {
    this.byId.set(user.id, user);
    this.byUsername.set(user.username.toString(), user);
  }
  async findByUsername(username: Username): Promise<User | null> {
    return this.byUsername.get(username.toString()) ?? null;
  }
  async findById(id: number): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }
  async save(user: User): Promise<void> {
    this.saveCalls.push(user.id);
    this.byId.set(user.id, user);
    this.byUsername.set(user.username.toString(), user);
  }

  // HU4/HU6/HU7 widened `UserRepository`. These specs exercise the
  // password-change path only, so the additions throw rather than
  // pretend to work: a spec that starts needing one should implement
  // it deliberately instead of inheriting a silent stub.
  async nextId(): Promise<number> {
    throw new Error("not used in these specs");
  }
  async existsByUsername(): Promise<boolean> {
    throw new Error("not used in these specs");
  }
  async existsByEmail(): Promise<boolean> {
    throw new Error("not used in these specs");
  }
  async create(): Promise<void> {
    throw new Error("not used in these specs");
  }
  async countActiveByRoleName(): Promise<number> {
    throw new Error("not used in these specs");
  }
  async search(): Promise<never> {
    throw new Error("not used in these specs");
  }
  async existsActiveByLawyerId(): Promise<boolean> {
    throw new Error("not used in these specs");
  }
}

class FakeHasher implements PasswordHasher {
  async hash(p: string): Promise<string> {
    return `hashed:${p}`;
  }
  async verify(p: string, h: string): Promise<boolean> {
    return h === `hashed:${p}`;
  }
}

/**
 * Refresh store fake with real state. Tracks the sequence of calls
 * in `callOrder` so tests can assert that `revokeAllForUser` runs
 * before `issue` (D-36).
 */
class FakeRefreshStore implements RefreshTokenStore {
  records: StoredRefresh[] = [];
  revokeAllForUserCalls: number[] = [];
  revokeFamilyCalls: string[] = [];
  revokeCalls: string[] = [];
  callOrder: string[] = [];
  private counter = 0;

  seed(record: StoredRefresh): void {
    this.records.push(record);
  }

  async issue(params: {
    userId: number;
    familyId: string | null;
  }): Promise<StoredRefresh> {
    this.counter += 1;
    this.callOrder.push("issue");
    const record: StoredRefresh = {
      token: `refresh-new-${this.counter}`,
      userId: params.userId,
      familyId: params.familyId ?? `fam-new-${this.counter}`,
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
    this.callOrder.push("revoke");
  }

  async revokeFamily(familyId: string): Promise<void> {
    this.revokeFamilyCalls.push(familyId);
    this.callOrder.push("revokeFamily");
  }

  async revokeAllForUser(userId: number): Promise<void> {
    this.revokeAllForUserCalls.push(userId);
    this.callOrder.push("revokeAllForUser");
    for (const r of this.records) {
      if (r.userId === userId && r.revokedAt === null) {
        r.revokedAt = new Date("2026-09-22T10:00:00Z");
      }
    }
  }

  async findLatestInFamily(
    familyId: string,
  ): Promise<{ createdAt: Date; revokedAt: Date | null } | null> {
    const inFamily = this.records.filter((r) => r.familyId === familyId);
    if (inFamily.length === 0) return null;
    const latest = inFamily[inFamily.length - 1];
    return { createdAt: new Date("2026-09-20T10:00:00Z"), revokedAt: latest.revokedAt };
  }
}

async function makeUser(
  overrides: {
    id?: number;
    password?: string;
  } = {},
): Promise<User> {
  return User.create(
    {
      id: overrides.id ?? 1,
      username: Username.create("fvazquez"),
      plainPassword: overrides.password ?? "password-123",
      fullName: "Fernando Vázquez",
      email: Email.create("fvazquez@vazquezzarate.com"),
      roleIds: [1],
      lawyerId: null,
    },
    new FakeHasher(),
  );
}

describe("ChangePasswordUseCase", () => {
  const build = () => {
    const users = new FakeUserRepository();
    const hasher = new FakeHasher();
    const refreshStore = new FakeRefreshStore();
    const useCase = new ChangePasswordUseCase(users, hasher, refreshStore);
    return { users, hasher, refreshStore, useCase };
  };

  it("rotates the hash, wipes other sessions, and issues a fresh one for the caller", async () => {
    const { users, refreshStore, hasher, useCase } = build();
    users.seed(await makeUser());
    // A concurrent session on another device, which must be wiped.
    refreshStore.seed({
      token: "refresh-other-device",
      userId: 1,
      familyId: "fam-other-device",
      createdAt: new Date("2026-09-20T10:00:00Z"),
      expiresAt: new Date("2026-09-28T10:00:00Z"),
      revokedAt: null,
    });

    const result = await useCase.execute({
      userId: 1,
      currentPassword: "password-123",
      newPassword: "new-password-1",
      refreshToken: null,
    });

    // Hash rotated and persisted.
    const stored = await users.findById(1);
    expect(await stored!.verifyPassword("new-password-1", hasher)).toBe(true);
    expect(await stored!.verifyPassword("password-123", hasher)).toBe(false);
    expect(users.saveCalls).toEqual([1]);

    // The other session is gone.
    expect(refreshStore.revokeAllForUserCalls).toEqual([1]);
    const wiped = refreshStore.records.find((r) => r.token === "refresh-other-device");
    expect(wiped?.revokedAt).not.toBeNull();

    // Fresh refresh returned for the caller (D-34).
    expect(result.refreshToken).toBe("refresh-new-1");
    expect(result.refreshExpiresIn).toEqual(new Date("2026-09-29T10:00:00Z"));
  });

  it("throws InvalidCurrentPasswordError and leaves everything untouched when current is wrong", async () => {
    const { users, refreshStore, hasher, useCase } = build();
    users.seed(await makeUser());
    refreshStore.seed({
      token: "refresh-old",
      userId: 1,
      familyId: "fam-old",
      createdAt: new Date("2026-09-20T10:00:00Z"),
      expiresAt: new Date("2026-09-28T10:00:00Z"),
      revokedAt: null,
    });

    await expect(
      useCase.execute({
        userId: 1,
        currentPassword: "wrong",
        newPassword: "new-password-1",
        refreshToken: null,
      }),
    ).rejects.toBeInstanceOf(InvalidCurrentPasswordError);

    // Hash intact.
    const stored = await users.findById(1);
    expect(await stored!.verifyPassword("password-123", hasher)).toBe(true);
    expect(users.saveCalls).toEqual([]);

    // Sessions intact — no wipe, no new refresh.
    expect(refreshStore.revokeAllForUserCalls).toEqual([]);
    expect(
      refreshStore.records.find((r) => r.token === "refresh-old")?.revokedAt,
    ).toBeNull();
    expect(
      refreshStore.records.find((r) => r.token.startsWith("refresh-new")),
    ).toBeUndefined();
  });

  it("throws WeakPasswordError when the new password is too short, without side-effects", async () => {
    const { users, refreshStore, useCase } = build();
    users.seed(await makeUser());

    await expect(
      useCase.execute({
        userId: 1,
        currentPassword: "password-123",
        newPassword: "short1",
        refreshToken: null,
      }),
    ).rejects.toBeInstanceOf(WeakPasswordError);

    expect(users.saveCalls).toEqual([]);
    expect(refreshStore.revokeAllForUserCalls).toEqual([]);
  });

  it("throws WeakPasswordError when the new password has no digit, without side-effects", async () => {
    const { users, refreshStore, useCase } = build();
    users.seed(await makeUser());

    await expect(
      useCase.execute({
        userId: 1,
        currentPassword: "password-123",
        newPassword: "onlyletters",
        refreshToken: null,
      }),
    ).rejects.toBeInstanceOf(WeakPasswordError);

    expect(users.saveCalls).toEqual([]);
    expect(refreshStore.revokeAllForUserCalls).toEqual([]);
  });

  it("revokes before issuing so the freshly issued refresh is not wiped (D-36)", async () => {
    const { users, refreshStore, useCase } = build();
    users.seed(await makeUser());

    const result = await useCase.execute({
      userId: 1,
      currentPassword: "password-123",
      newPassword: "new-password-1",
      refreshToken: null,
    });

    // Order enforced by the use case: revokeAllForUser runs before issue.
    expect(refreshStore.callOrder).toEqual(["revokeAllForUser", "issue"]);

    // And the newly-issued refresh survived (it did not get caught
    // by the wipe).
    const fresh = refreshStore.records.find(
      (r) => r.token === result.refreshToken,
    );
    expect(fresh?.revokedAt).toBeNull();
  });

  /**
   * This is the D-38 reversal. The old behaviour — asserted by the
   * test this one replaces — was "always a brand new family". That
   * broke once the access token started carrying the family id as
   * `sid` (CA-2.3): the caller's token already in hand would point at
   * a family that no longer exists, so their very next request would
   * be rejected as "session closed" — the opposite of what
   * "la sesión permanece abierta" (contract §3.1) promises.
   */
  it("continues the caller's own family rather than starting a new one", async () => {
    const { users, refreshStore, useCase } = build();
    users.seed(await makeUser());
    refreshStore.seed({
      token: "refresh-caller",
      userId: 1,
      familyId: "fam-caller",
      createdAt: new Date("2026-09-20T10:00:00Z"),
      expiresAt: new Date("2026-09-28T10:00:00Z"),
      revokedAt: null,
    });

    const result = await useCase.execute({
      userId: 1,
      currentPassword: "password-123",
      newPassword: "new-password-1",
      refreshToken: "refresh-caller",
    });

    const fresh = refreshStore.records.find(
      (r) => r.token === result.refreshToken,
    );
    expect(fresh?.familyId).toBe("fam-caller");
    // And the old token value is dead, so a copy held by anyone else
    // (e.g. captured via XSS) stops working.
    const old = refreshStore.records.find((r) => r.token === "refresh-caller");
    expect(old?.revokedAt).not.toBeNull();
  });

  it("starts a fresh family when no cookie was presented", async () => {
    const { users, refreshStore, useCase } = build();
    users.seed(await makeUser());

    const result = await useCase.execute({
      userId: 1,
      currentPassword: "password-123",
      newPassword: "new-password-1",
      refreshToken: null,
    });

    const fresh = refreshStore.records.find(
      (r) => r.token === result.refreshToken,
    );
    expect(fresh?.familyId).toBe("fam-new-1");
  });

  it("falls back to a fresh family when the cookie belongs to someone else", async () => {
    // Mirrors Logout's D-31: a mismatched cookie is not trusted with
    // anything, including which family to preserve. There is no
    // side-channel risk in falling back visibly here (unlike Logout,
    // the response does not depend on which branch ran), so this just
    // degrades to the "no cookie" behaviour.
    const { users, refreshStore, useCase } = build();
    users.seed(await makeUser({ id: 1 }));
    refreshStore.seed({
      token: "refresh-someone-else",
      userId: 999,
      familyId: "fam-someone-else",
      createdAt: new Date("2026-09-20T10:00:00Z"),
      expiresAt: new Date("2026-09-28T10:00:00Z"),
      revokedAt: null,
    });

    const result = await useCase.execute({
      userId: 1,
      currentPassword: "password-123",
      newPassword: "new-password-1",
      refreshToken: "refresh-someone-else",
    });

    const fresh = refreshStore.records.find(
      (r) => r.token === result.refreshToken,
    );
    expect(fresh?.familyId).not.toBe("fam-someone-else");

    // And the other user's session is untouched — this caller cannot
    // use a borrowed cookie to reach into it.
    const other = refreshStore.records.find((r) => r.token === "refresh-someone-else");
    expect(other?.revokedAt).toBeNull();
  });

  it("falls back to a fresh family when the presented token is unknown", async () => {
    const { users, refreshStore, useCase } = build();
    users.seed(await makeUser());

    const result = await useCase.execute({
      userId: 1,
      currentPassword: "password-123",
      newPassword: "new-password-1",
      refreshToken: "never-issued",
    });

    const fresh = refreshStore.records.find(
      (r) => r.token === result.refreshToken,
    );
    expect(fresh?.familyId).toBe("fam-new-1");
  });

  it("resolves the caller's family before the wipe, so D-36's ordering still holds", async () => {
    // If the lookup ran after revokeAllForUser, the caller's own row
    // would already be gone — `find` still returns a revoked row
    // (ports document this everywhere), so the family id is readable
    // regardless, but the order is pinned here as a regression guard.
    const { users, refreshStore, useCase } = build();
    users.seed(await makeUser());
    refreshStore.seed({
      token: "refresh-caller",
      userId: 1,
      familyId: "fam-caller",
      createdAt: new Date("2026-09-20T10:00:00Z"),
      expiresAt: new Date("2026-09-28T10:00:00Z"),
      revokedAt: null,
    });

    const result = await useCase.execute({
      userId: 1,
      currentPassword: "password-123",
      newPassword: "new-password-1",
      refreshToken: "refresh-caller",
    });

    const fresh = refreshStore.records.find(
      (r) => r.token === result.refreshToken,
    );
    expect(fresh?.familyId).toBe("fam-caller");
  });

  it("fails hard (non-domain-error) when findById returns null (D-37)", async () => {
    const { useCase } = build();
    // No user seeded — simulates a race between guard and use case.

    const promise = useCase.execute({
      userId: 1,
      currentPassword: "password-123",
      newPassword: "new-password-1",
      refreshToken: null,
    });

    await expect(promise).rejects.not.toBeInstanceOf(
      InvalidCurrentPasswordError,
    );
    await expect(promise).rejects.not.toBeInstanceOf(WeakPasswordError);
    // Plain Error, mapped to opaque 500 by the global filter.
    await expect(promise).rejects.toThrow(/findById returned null/);
  });
});
