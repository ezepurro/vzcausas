import { ClockPort } from "@shared/domain/clock.port";
import { Role } from "../../domain/entities/role.entity";
import { User } from "../../domain/entities/user.entity";
import { InvalidCredentialsError } from "../../domain/errors/identity.errors";
import {
  LawyerLookupPort,
  LawyerSummary,
} from "../../domain/ports/lawyer-lookup.port";
import { PasswordHasher } from "../../domain/ports/password-hasher.port";
import {
  RefreshTokenStore,
  StoredRefresh,
} from "../../domain/ports/refresh-token-store.port";
import { RoleRepository } from "../../domain/ports/role.repository";
import {
  AccessTokenClaims,
  IssuedAccessToken,
  TokenIssuer,
} from "../../domain/ports/token-issuer.port";
import { UserRepository } from "../../domain/ports/user.repository";
import { Email } from "../../domain/value-objects/email.vo";
import { Permission } from "../../domain/value-objects/permission.vo";
import { Username } from "../../domain/value-objects/username.vo";
import { AuthenticateUserUseCase } from "./authenticate-user.use-case";

class FakeUserRepository implements UserRepository {
  private byUsername = new Map<string, User>();
  private byId = new Map<number, User>();

  seed(user: User): void {
    this.byUsername.set(user.username.toString(), user);
    this.byId.set(user.id, user);
  }

  async findByUsername(username: Username): Promise<User | null> {
    return this.byUsername.get(username.toString()) ?? null;
  }
  async findById(id: number): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }
  async save(user: User): Promise<void> {
    this.byUsername.set(user.username.toString(), user);
    this.byId.set(user.id, user);
  }

  // HU4/HU6/HU7 widened `UserRepository`. These specs exercise the
  // authentication paths only, so the additions throw rather than
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

class FakeRoleRepository implements RoleRepository {
  constructor(private readonly roles: Role[]) {}
  async findByIds(ids: readonly number[]): Promise<Role[]> {
    return this.roles.filter((r) => ids.includes(r.getId()));
  }
  async findByNames(names: readonly string[]): Promise<Role[]> {
    return this.roles.filter((r) => names.includes(r.getName()));
  }
}

class FakeLawyerLookup implements LawyerLookupPort {
  constructor(private readonly existingIds: readonly number[] = []) {}
  async existsById(lawyerId: number): Promise<boolean> {
    return this.existingIds.includes(lawyerId);
  }
  /** Renders a predictable summary for every id it knows about. */
  async findSummaries(
    lawyerIds: readonly number[],
  ): Promise<Map<number, LawyerSummary>> {
    return new Map(
      lawyerIds
        .filter((id) => this.existingIds.includes(id))
        .map((id) => [
          id,
          { id, fullName: `Lawyer ${id}`, registrationNumber: `1-${id}` },
        ]),
    );
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

class FakeTokenIssuer implements TokenIssuer {
  issued: AccessTokenClaims[] = [];
  async issue(claims: AccessTokenClaims): Promise<IssuedAccessToken> {
    this.issued.push(claims);
    return { token: `access-for-${claims.sub}`, expiresIn: 900 };
  }
  async verify(): Promise<AccessTokenClaims> {
    throw new Error("not used in this test");
  }
}

class FakeRefreshStore implements RefreshTokenStore {
  issued: Array<{ userId: number; familyId: string | null }> = [];
  async issue(params: {
    userId: number;
    familyId: string | null;
  }): Promise<StoredRefresh> {
    this.issued.push(params);
    return {
      token: `refresh-${params.userId}`,
      userId: params.userId,
      familyId: params.familyId ?? "fam-1",
      expiresAt: new Date("2026-09-28T10:00:00Z"),
      revokedAt: null,
    };
  }
  async find(): Promise<StoredRefresh | null> {
    return null;
  }
  async revoke(): Promise<void> {}
  async revokeFamily(): Promise<void> {}
  async revokeAllForUser(): Promise<void> {}
}

class FakeClock implements ClockPort {
  constructor(private current: Date) {}
  now(): Date {
    return this.current;
  }
  set(d: Date): void {
    this.current = d;
  }
  /** Las sesiones no miran la fecha civil; existe para cumplir el puerto. */
  today(): Date {
    const d = this.current;
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }
}

async function makeUser(
  overrides: {
    id?: number;
    username?: string;
    password?: string;
    roleIds?: number[];
    lawyerId?: number | null;
    active?: boolean;
  } = {},
): Promise<User> {
  return User.create(
    {
      id: overrides.id ?? 1,
      username: Username.create(overrides.username ?? "fvazquez"),
      plainPassword: overrides.password ?? "password-123",
      fullName: "Fernando Vázquez",
      email: Email.create("fvazquez@vazquezzarate.com"),
      roleIds: overrides.roleIds ?? [1],
      lawyerId: overrides.lawyerId ?? null,
      active: overrides.active,
    },
    new FakeHasher(),
  );
}

describe("AuthenticateUserUseCase", () => {
  const roleAdmin = Role.hydrate({
    id: 1,
    name: "ADMINISTRATOR",
    permissions: [
      Permission.create("user:manage"),
      Permission.create("case:read"),
    ],
  });
  const roleLawyer = Role.hydrate({
    id: 2,
    name: "LAWYER",
    permissions: [
      Permission.create("case:read"),
      Permission.create("case:change-status"),
    ],
  });

  const now = new Date("2026-09-21T10:00:00Z");

  const build = (roles: Role[] = [roleAdmin], knownLawyerIds: number[] = []) => {
    const users = new FakeUserRepository();
    const rolesRepo = new FakeRoleRepository(roles);
    const hasher = new FakeHasher();
    const tokenIssuer = new FakeTokenIssuer();
    const refreshStore = new FakeRefreshStore();
    const clock = new FakeClock(now);
    const lawyerLookup = new FakeLawyerLookup(knownLawyerIds);
    const useCase = new AuthenticateUserUseCase(
      users,
      rolesRepo,
      hasher,
      tokenIssuer,
      refreshStore,
      clock,
      lawyerLookup,
    );
    return {
      users,
      rolesRepo,
      hasher,
      tokenIssuer,
      refreshStore,
      clock,
      lawyerLookup,
      useCase,
    };
  };

  it("issues tokens and user info on successful login", async () => {
    const { users, useCase, tokenIssuer, refreshStore } = build();
    users.seed(await makeUser({ roleIds: [1] }));

    const result = await useCase.execute({
      username: "fvazquez",
      password: "password-123",
    });

    expect(result.accessToken).toBe("access-for-1");
    expect(result.expiresIn).toBe(900);
    expect(result.refreshToken).toBe("refresh-1");
    expect(result.user.id).toBe(1);
    expect(result.user.username).toBe("fvazquez");
    expect(result.user.roleNames).toEqual(["ADMINISTRATOR"]);
    expect(result.user.lawyer).toBeNull();
    expect(result.user.previousLoginAt).toBeNull();
    expect(tokenIssuer.issued[0]).toEqual({
      sub: 1,
      roles: ["ADMINISTRATOR"],
      lawyerId: null,
      permissions: ["user:manage", "case:read"],
    });
    expect(refreshStore.issued[0]).toEqual({ userId: 1, familyId: null });
  });

  it("unions and dedups permissions across multiple roles", async () => {
    const { users, useCase, tokenIssuer } = build([roleAdmin, roleLawyer]);
    users.seed(await makeUser({ roleIds: [1, 2], lawyerId: 10 }));

    await useCase.execute({ username: "fvazquez", password: "password-123" });

    expect(tokenIssuer.issued[0].permissions).toEqual([
      "user:manage",
      "case:read",
      "case:change-status",
    ]);
    expect(tokenIssuer.issued[0].roles).toEqual(["ADMINISTRATOR", "LAWYER"]);
    expect(tokenIssuer.issued[0].lawyerId).toBe(10);
  });

  it("embeds the linked professional record under user.lawyer", async () => {
    const { users, useCase } = build([roleAdmin, roleLawyer], [10]);
    users.seed(await makeUser({ roleIds: [1, 2], lawyerId: 10 }));

    const result = await useCase.execute({
      username: "fvazquez",
      password: "password-123",
    });

    expect(result.user.lawyer).toEqual({
      id: 10,
      fullName: "Lawyer 10",
      registrationNumber: "1-10",
    });
  });

  it("renders lawyer as null when the link does not resolve", async () => {
    // The user points at lawyer 99, which the lookup does not know: a
    // deactivated record reads the same as no link at all, and must
    // not keep its user from logging in.
    const { users, useCase } = build([roleAdmin], [10]);
    users.seed(await makeUser({ roleIds: [1], lawyerId: 99 }));

    const result = await useCase.execute({
      username: "fvazquez",
      password: "password-123",
    });

    expect(result.user.lawyer).toBeNull();
  });

  // The access token keeps carrying the bare id: it is a credential,
  // not a view. Only the HTTP response embeds the record.
  it("still puts the bare lawyerId in the access token claims", async () => {
    const { users, useCase, tokenIssuer } = build([roleLawyer], [10]);
    users.seed(await makeUser({ roleIds: [2], lawyerId: 10 }));

    await useCase.execute({ username: "fvazquez", password: "password-123" });

    expect(tokenIssuer.issued[0].lawyerId).toBe(10);
  });

  it("throws InvalidCredentialsError when the user does not exist", async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ username: "nobody", password: "password-123" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("throws InvalidCredentialsError on wrong password", async () => {
    const { users, useCase } = build();
    users.seed(await makeUser());

    await expect(
      useCase.execute({ username: "fvazquez", password: "wrong" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("throws InvalidCredentialsError when the user is inactive", async () => {
    const { users, useCase } = build();
    users.seed(await makeUser({ active: false }));

    await expect(
      useCase.execute({ username: "fvazquez", password: "password-123" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("throws InvalidCredentialsError on malformed username", async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ username: "!!bad!!", password: "password-123" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("fails hard (non-401) when a role id does not resolve", async () => {
    const { users, useCase } = build([roleAdmin]); // only role 1 exists
    users.seed(await makeUser({ roleIds: [1, 999] }));

    await expect(
      useCase.execute({ username: "fvazquez", password: "password-123" }),
    ).rejects.not.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rotates lastLoginAt: returns previous, stores current, persists", async () => {
    const { users, useCase, clock } = build();
    users.seed(await makeUser());

    // First login: previous is null (fresh user).
    const first = await useCase.execute({
      username: "fvazquez",
      password: "password-123",
    });
    expect(first.user.previousLoginAt).toBeNull();

    // Second login later: previous is the first login's timestamp.
    const later = new Date("2026-09-21T15:00:00Z");
    clock.set(later);
    const second = await useCase.execute({
      username: "fvazquez",
      password: "password-123",
    });
    expect(second.user.previousLoginAt).toEqual(now);

    // And the stored user reflects the second login.
    const stored = await users.findByUsername(Username.create("fvazquez"));
    expect(stored!.lastLoginAt).toEqual(later);
  });
});
