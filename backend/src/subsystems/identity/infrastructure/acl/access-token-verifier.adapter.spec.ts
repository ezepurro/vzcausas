import { ClockPort } from "@shared/domain/clock.port";
import { UnauthorizedError } from "@shared/domain/domain-error";
import { Role } from "@subsystems/identity/core/domain/entities/role.entity";
import { User } from "@subsystems/identity/core/domain/entities/user.entity";
import { PasswordHasher } from "@subsystems/identity/core/domain/ports/password-hasher.port";
import { RefreshTokenStore } from "@subsystems/identity/core/domain/ports/refresh-token-store.port";
import { RoleRepository } from "@subsystems/identity/core/domain/ports/role.repository";
import {
  AccessTokenClaims,
  IssuedAccessToken,
  TokenIssuer,
} from "@subsystems/identity/core/domain/ports/token-issuer.port";
import { UserRepository } from "@subsystems/identity/core/domain/ports/user.repository";
import { Email } from "@subsystems/identity/core/domain/value-objects/email.vo";
import { Permission } from "@subsystems/identity/core/domain/value-objects/permission.vo";
import { Username } from "@subsystems/identity/core/domain/value-objects/username.vo";
import { AccessTokenVerifierAdapter } from "./access-token-verifier.adapter";

/**
 * This spec exists to prove the thing `AuthenticateUser` and
 * `RefreshSession`'s specs cannot: that the **access token path**
 * actually rejects a deactivated user (CA-7.3), a closed session
 * (CA-2.3), a stale one (CA-1.6), and reloads permissions instead of
 * trusting the JWT (CA-6.2). All four only matter on the request
 * *after* the token was minted, which is exactly what this adapter
 * sits on — `JwtAuthGuard` calls it on every protected request.
 */

class FakeHasher implements PasswordHasher {
  async hash(p: string): Promise<string> {
    return `hashed:${p}`;
  }
  async verify(p: string, h: string): Promise<boolean> {
    return h === `hashed:${p}`;
  }
}

async function makeUser(overrides: {
  id?: number;
  roleIds?: number[];
  lawyerId?: number | null;
  active?: boolean;
}): Promise<User> {
  return User.create(
    {
      id: overrides.id ?? 1,
      username: Username.create("fvazquez"),
      plainPassword: "password-123",
      lastName: "Vázquez",
      firstName: "Fernando",
      email: Email.create("fvazquez@vazquezzarate.com"),
      roleIds: overrides.roleIds ?? [1],
      lawyerId: overrides.lawyerId ?? null,
      active: overrides.active,
    },
    new FakeHasher(),
  );
}

class FakeUserRepository implements UserRepository {
  private readonly byId = new Map<number, User>();

  seed(user: User): void {
    this.byId.set(user.id, user);
  }
  async findById(id: number): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  // Not used by the adapter under test.
  async findByUsername(): Promise<User | null> {
    throw new Error("not used in this spec");
  }
  async save(): Promise<void> {
    throw new Error("not used in this spec");
  }
  async nextId(): Promise<number> {
    throw new Error("not used in this spec");
  }
  async existsByUsername(): Promise<boolean> {
    throw new Error("not used in this spec");
  }
  async existsByEmail(): Promise<boolean> {
    throw new Error("not used in this spec");
  }
  async create(): Promise<void> {
    throw new Error("not used in this spec");
  }
  async countActiveByRoleName(): Promise<number> {
    throw new Error("not used in this spec");
  }
  async search(): Promise<never> {
    throw new Error("not used in this spec");
  }
  async existsActiveByLawyerId(): Promise<boolean> {
    throw new Error("not used in this spec");
  }
  async findActiveByLawyerId(): Promise<User | null> {
    throw new Error("not used in this spec");
  }
}

/**
 * Mutable on purpose: the CA-6.2 test changes what this returns
 * *between* two `verify()` calls on the same token, to prove the
 * adapter re-reads roles every time instead of trusting anything
 * cached from a previous call or from the token itself.
 */
class FakeRoleRepository implements RoleRepository {
  roles: Role[];
  constructor(roles: Role[]) {
    this.roles = roles;
  }
  async findByIds(ids: readonly number[]): Promise<Role[]> {
    return this.roles.filter((r) => ids.includes(r.getId()));
  }
  async findByNames(): Promise<Role[]> {
    throw new Error("not used in this spec");
  }
}

/** Only `findLatestInFamily` is exercised — the adapter never calls the rest. */
class FakeRefreshTokenStore implements RefreshTokenStore {
  families = new Map<string, { createdAt: Date; revokedAt: Date | null }>();

  async findLatestInFamily(
    familyId: string,
  ): Promise<{ createdAt: Date; revokedAt: Date | null } | null> {
    return this.families.get(familyId) ?? null;
  }

  async issue(): Promise<never> {
    throw new Error("not used in this spec");
  }
  async find(): Promise<null> {
    throw new Error("not used in this spec");
  }
  async revoke(): Promise<void> {
    throw new Error("not used in this spec");
  }
  async revokeFamily(): Promise<void> {
    throw new Error("not used in this spec");
  }
  async revokeAllForUser(): Promise<void> {
    throw new Error("not used in this spec");
  }
}

class FakeClock implements ClockPort {
  constructor(private current: Date) {}
  now(): Date {
    return this.current;
  }
  today(): Date {
    return new Date(this.current.toISOString().slice(0, 10) + "T00:00:00.000Z");
  }
  set(d: Date): void {
    this.current = d;
  }
}

class FakeTokenIssuer implements TokenIssuer {
  constructor(private readonly claims: AccessTokenClaims | Error) {}
  verified: string[] = [];
  async verify(token: string): Promise<AccessTokenClaims> {
    this.verified.push(token);
    if (this.claims instanceof Error) throw this.claims;
    return this.claims;
  }
  async issue(): Promise<IssuedAccessToken> {
    throw new Error("not used in this spec");
  }
}

const NOW = new Date("2026-10-11T12:00:00.000Z");
const INACTIVITY_SECONDS = 30 * 60;
const CLAIMS: AccessTokenClaims = { sub: 1, sid: "fam-1" };

const roleAdmin = () =>
  Role.hydrate({
    id: 1,
    name: "ADMINISTRATOR",
    permissions: [Permission.create("user:manage"), Permission.create("case:read")],
  });
const roleLawyer = () =>
  Role.hydrate({
    id: 2,
    name: "LAWYER",
    permissions: [Permission.create("case:read"), Permission.create("case:change-status")],
  });

function build(options: {
  claims?: AccessTokenClaims | Error;
  roles?: Role[];
} = {}) {
  const users = new FakeUserRepository();
  const roles = new FakeRoleRepository(options.roles ?? [roleAdmin()]);
  const refreshStore = new FakeRefreshTokenStore();
  const clock = new FakeClock(NOW);
  const tokenIssuer = new FakeTokenIssuer(options.claims ?? CLAIMS);

  const adapter = new AccessTokenVerifierAdapter(
    tokenIssuer,
    users,
    roles,
    refreshStore,
    clock,
    INACTIVITY_SECONDS,
  );

  return { users, roles, refreshStore, clock, tokenIssuer, adapter };
}

/** A live, freshly rotated family — the default "everything is fine" fixture. */
function seedLiveFamily(
  refreshStore: FakeRefreshTokenStore,
  overrides: { familyId?: string; createdAt?: Date; revokedAt?: Date | null } = {},
): void {
  refreshStore.families.set(overrides.familyId ?? "fam-1", {
    createdAt: overrides.createdAt ?? NOW,
    revokedAt: overrides.revokedAt ?? null,
  });
}

describe("AccessTokenVerifierAdapter", () => {
  it("builds the actor from fresh database state, not from the token", async () => {
    const { users, refreshStore, adapter } = build();
    users.seed(await makeUser({ id: 1, roleIds: [1], lawyerId: 10 }));
    seedLiveFamily(refreshStore);

    // The claims carry nothing but identity and session (sub, sid):
    // if the actor comes back correct, it was read from the fakes,
    // because there is nowhere else it could have come from.
    await expect(adapter.verify("a-token")).resolves.toEqual({
      userId: 1,
      roleNames: ["ADMINISTRATOR"],
      lawyerId: 10,
      permissions: ["user:manage", "case:read"],
    });
  });

  it("preserves a null lawyerId", async () => {
    const { users, refreshStore, adapter } = build();
    users.seed(await makeUser({ id: 1, lawyerId: null }));
    seedLiveFamily(refreshStore);

    const actor = await adapter.verify("a-token");
    expect(actor.lawyerId).toBeNull();
  });

  it("forwards the token it was given to the issuer", async () => {
    const { users, refreshStore, tokenIssuer, adapter } = build();
    users.seed(await makeUser({ id: 1 }));
    seedLiveFamily(refreshStore);

    await adapter.verify("the-exact-token");

    expect(tokenIssuer.verified).toEqual(["the-exact-token"]);
  });

  it("lets the issuer's own rejection through untouched", async () => {
    const failure = new UnauthorizedError(
      "UNAUTHENTICATED",
      "La autenticación es requerida o el token proporcionado no es válido.",
    );
    const { adapter } = build({ claims: failure });

    await expect(adapter.verify("bad-token")).rejects.toBe(failure);
  });

  describe("CA-7.3 — deactivated or deleted user", () => {
    it("rejects when the user no longer exists", async () => {
      const { refreshStore, adapter } = build();
      // No user seeded.
      seedLiveFamily(refreshStore);

      await expect(adapter.verify("a-token")).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("rejects when the user was deactivated after the token was issued", async () => {
      const { users, refreshStore, adapter } = build();
      users.seed(await makeUser({ id: 1, active: false }));
      seedLiveFamily(refreshStore);

      await expect(adapter.verify("a-token")).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
      });
    });

    it("never reaches the family or role checks for a deactivated user", async () => {
      // Order matters for cost, not just correctness: a deactivated
      // user is the cheapest possible rejection, before any session
      // bookkeeping is even looked at.
      const { users, refreshStore, adapter } = build();
      users.seed(await makeUser({ id: 1, active: false }));
      // Deliberately no live family seeded — if the adapter reached
      // that check it would also reject, masking this one.
      const findSpy = jest.spyOn(refreshStore, "findLatestInFamily");

      await adapter.verify("a-token").catch(() => undefined);

      expect(findSpy).not.toHaveBeenCalled();
    });
  });

  describe("CA-2.3 — session closed", () => {
    it("rejects when the family was never issued", async () => {
      const { users, adapter } = build();
      users.seed(await makeUser({ id: 1 }));
      // No family seeded at all.

      await expect(adapter.verify("a-token")).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("rejects when the family was revoked by logout", async () => {
      const { users, refreshStore, adapter } = build();
      users.seed(await makeUser({ id: 1 }));
      seedLiveFamily(refreshStore, { revokedAt: new Date("2026-10-11T11:00:00Z") });

      await expect(adapter.verify("a-token")).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("rejects when the family was revoked by a password change elsewhere", async () => {
      // Same mechanism as logout from this adapter's point of view —
      // `revokedAt` is set either way — but worth naming explicitly
      // since it is the scenario that motivated reverting D-38.
      const { users, refreshStore, adapter } = build();
      users.seed(await makeUser({ id: 1 }));
      seedLiveFamily(refreshStore, { revokedAt: NOW });

      await expect(adapter.verify("a-token")).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("CA-1.6 — inactivity", () => {
    it("accepts a session just inside the window", async () => {
      const { users, refreshStore, adapter } = build();
      users.seed(await makeUser({ id: 1 }));
      seedLiveFamily(refreshStore, {
        createdAt: new Date(NOW.getTime() - (INACTIVITY_SECONDS - 1) * 1000),
      });

      await expect(adapter.verify("a-token")).resolves.toMatchObject({ userId: 1 });
    });

    it("rejects a session just past the window", async () => {
      const { users, refreshStore, adapter } = build();
      users.seed(await makeUser({ id: 1 }));
      seedLiveFamily(refreshStore, {
        createdAt: new Date(NOW.getTime() - (INACTIVITY_SECONDS + 1) * 1000),
      });

      await expect(adapter.verify("a-token")).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("CA-6.2 — permissions reloaded fresh", () => {
    it("reflects a role change on the very next call, without a new token", async () => {
      const { users, refreshStore, roles, adapter } = build({ roles: [roleAdmin()] });
      users.seed(await makeUser({ id: 1, roleIds: [1] }));
      seedLiveFamily(refreshStore);

      const before = await adapter.verify("a-token");
      expect(before.permissions).toEqual(["user:manage", "case:read"]);

      // The catalogue changes underneath — same token, same request
      // cycle in spirit, nothing re-issued.
      roles.roles = [roleLawyer()];
      users.seed(await makeUser({ id: 1, roleIds: [2] }));

      const after = await adapter.verify("a-token");
      expect(after.roleNames).toEqual(["LAWYER"]);
      expect(after.permissions).toEqual(["case:read", "case:change-status"]);
    });

    it("picks up a revoked role immediately, not after the token expires", async () => {
      // The concrete CA-6.2 scenario: an admin demotes someone mid-session.
      const { users, refreshStore, adapter } = build({ roles: [roleAdmin(), roleLawyer()] });
      users.seed(await makeUser({ id: 1, roleIds: [1, 2] }));
      seedLiveFamily(refreshStore);

      const before = await adapter.verify("a-token");
      expect(before.roleNames).toEqual(["ADMINISTRATOR", "LAWYER"]);

      users.seed(await makeUser({ id: 1, roleIds: [2] }));

      const after = await adapter.verify("a-token");
      expect(after.roleNames).toEqual(["LAWYER"]);
      expect(after.permissions).not.toContain("user:manage");
    });
  });

  it("fails hard (non-401) when a role id does not resolve", async () => {
    const { users, refreshStore, adapter } = build({ roles: [roleAdmin()] });
    users.seed(await makeUser({ id: 1, roleIds: [1, 999] }));
    seedLiveFamily(refreshStore);

    await expect(adapter.verify("a-token")).rejects.not.toBeInstanceOf(UnauthorizedError);
  });
});
