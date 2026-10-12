import { ClockPort } from '@shared/domain/clock.port';
import { Role } from '../../domain/entities/role.entity';
import { User } from '../../domain/entities/user.entity';
import { SessionExpiredError } from '../../domain/errors/identity.errors';
import { PasswordHasher } from '../../domain/ports/password-hasher.port';
import { RefreshTokenStore, StoredRefresh } from '../../domain/ports/refresh-token-store.port';
import { RoleRepository } from '../../domain/ports/role.repository';
import { AccessTokenClaims, IssuedAccessToken, TokenIssuer } from '../../domain/ports/token-issuer.port';
import { UserRepository } from '../../domain/ports/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { Permission } from '../../domain/value-objects/permission.vo';
import { Username } from '../../domain/value-objects/username.vo';
import { RefreshSessionUseCase } from './refresh-session.use-case';

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
  // session-refresh path only, so the additions throw rather than
  // pretend to work: a spec that starts needing one should implement
  // it deliberately instead of inheriting a silent stub.
  async nextId(): Promise<number> {
    throw new Error('not used in these specs');
  }
  async existsByUsername(): Promise<boolean> {
    throw new Error('not used in these specs');
  }
  async existsByEmail(): Promise<boolean> {
    throw new Error('not used in these specs');
  }
  async create(): Promise<void> {
    throw new Error('not used in these specs');
  }
  async countActiveByRoleName(): Promise<number> {
    throw new Error('not used in these specs');
  }
  async search(): Promise<never> {
    throw new Error('not used in these specs');
  }
  async existsActiveByLawyerId(): Promise<boolean> {
    throw new Error('not used in these specs');
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
    throw new Error('not used in this test');
  }
}

/**
 * Refresh store fake that actually persists records so the rotation
 * flow can be exercised: `issue` appends, `find` returns the record
 * even if revoked/expired, and `revoke` / `revokeFamily` mutate
 * `revokedAt` in place.
 */
class FakeRefreshStore implements RefreshTokenStore {
  records: StoredRefresh[] = [];
  revokeFamilyCalls: string[] = [];
  private counter = 0;

  seed(record: StoredRefresh): void {
    this.records.push(record);
  }

  async issue(params: { userId: number; familyId: string | null }): Promise<StoredRefresh> {
    this.counter += 1;
    const record: StoredRefresh = {
      token: `refresh-new-${this.counter}`,
      userId: params.userId,
      familyId: params.familyId ?? `fam-${this.counter}`,
      // Mirrors production (`issue` stamps `createdAt` from the
      // clock): matches the fixed `now` every test in this file runs
      // against, since nothing here advances the clock before issuing.
      createdAt: new Date('2026-09-22T10:00:00Z'),
      expiresAt: new Date('2026-09-29T10:00:00Z'),
      revokedAt: null,
    };
    this.records.push(record);
    return record;
  }

  async find(token: string): Promise<StoredRefresh | null> {
    return this.records.find((r) => r.token === token) ?? null;
  }

  async revoke(token: string): Promise<void> {
    const r = this.records.find((r) => r.token === token);
    if (r && r.revokedAt === null) {
      r.revokedAt = new Date('2026-09-22T10:00:00Z');
    }
  }

  async revokeFamily(familyId: string): Promise<void> {
    this.revokeFamilyCalls.push(familyId);
    for (const r of this.records) {
      if (r.familyId === familyId && r.revokedAt === null) {
        r.revokedAt = new Date('2026-09-22T10:00:00Z');
      }
    }
  }

  async revokeAllForUser(): Promise<void> {}

  async findLatestInFamily(
    familyId: string,
  ): Promise<{ createdAt: Date; revokedAt: Date | null } | null> {
    const inFamily = this.records.filter((r) => r.familyId === familyId);
    if (inFamily.length === 0) return null;
    const latest = inFamily[inFamily.length - 1];
    return { createdAt: new Date('2026-09-20T10:00:00Z'), revokedAt: latest.revokedAt };
  }
}

class FakeClock implements ClockPort {
  constructor(private current: Date) {}
  now(): Date {
    return this.current;
  }
  today(): Date {
    return new Date(this.current.toISOString().slice(0, 10) + 'T00:00:00.000Z');
  }
  set(d: Date): void {
    this.current = d;
  }
}

async function makeUser(
  overrides: {
    id?: number;
    username?: string;
    roleIds?: number[];
    lawyerId?: number | null;
    active?: boolean;
  } = {},
): Promise<User> {
  return User.create(
    {
      id: overrides.id ?? 1,
      username: Username.create(overrides.username ?? 'fvazquez'),
      plainPassword: 'password-123',
      fullName: 'Fernando Vázquez',
      email: Email.create('fvazquez@vazquezzarate.com'),
      roleIds: overrides.roleIds ?? [1],
      lawyerId: overrides.lawyerId ?? null,
      active: overrides.active,
    },
    new FakeHasher(),
  );
}

describe('RefreshSessionUseCase', () => {
  const roleAdmin = Role.hydrate({
    id: 1,
    name: 'ADMINISTRATOR',
    permissions: [Permission.create('user:manage'), Permission.create('case:read')],
  });
  const roleLawyer = Role.hydrate({
    id: 2,
    name: 'LAWYER',
    permissions: [Permission.create('case:read'), Permission.create('case:change-status')],
  });

  const now = new Date('2026-09-22T10:00:00Z');
  /** Matches the 30-minute window `.env.example` recommends for CA-1.6. */
  const INACTIVITY_SECONDS = 30 * 60;

  const build = (roles: Role[] = [roleAdmin]) => {
    const users = new FakeUserRepository();
    const rolesRepo = new FakeRoleRepository(roles);
    const tokenIssuer = new FakeTokenIssuer();
    const refreshStore = new FakeRefreshStore();
    const clock = new FakeClock(now);
    const useCase = new RefreshSessionUseCase(
      refreshStore,
      users,
      rolesRepo,
      tokenIssuer,
      clock,
      INACTIVITY_SECONDS,
    );
    return { users, rolesRepo, tokenIssuer, refreshStore, clock, useCase };
  };

  const seedLiveRefresh = (refreshStore: FakeRefreshStore, overrides: Partial<StoredRefresh> = {}): StoredRefresh => {
    const record: StoredRefresh = {
      token: overrides.token ?? 'refresh-old',
      userId: overrides.userId ?? 1,
      familyId: overrides.familyId ?? 'fam-1',
      // Freshly rotated by default, well inside the inactivity window
      // every test below runs against unless it says otherwise.
      createdAt: overrides.createdAt ?? now,
      expiresAt: overrides.expiresAt ?? new Date('2026-09-28T10:00:00Z'),
      revokedAt: overrides.revokedAt === undefined ? null : overrides.revokedAt,
    };
    refreshStore.seed(record);
    return record;
  };

  it('rotates the refresh, issues a new access, keeps the family, does not touch lastLoginAt', async () => {
    const { users, useCase, refreshStore, tokenIssuer } = build();
    const user = await makeUser({ roleIds: [1] });
    users.seed(user);
    const lastLoginBefore = user.lastLoginAt;
    seedLiveRefresh(refreshStore);

    const result = await useCase.execute({ refreshToken: 'refresh-old' });

    expect(result.accessToken).toBe('access-for-1');
    expect(result.expiresIn).toBe(900);
    expect(result.refreshToken).not.toBe('refresh-old');
    expect(result.user).toEqual({
      id: 1,
      username: 'fvazquez',
      roleNames: ['ADMINISTRATOR'],
      lawyerId: null,
      permissions: ['user:manage', 'case:read'],
    });

    // Family preserved on rotation.
    const newRecord = refreshStore.records.find((r) => r.token === result.refreshToken);
    expect(newRecord?.familyId).toBe('fam-1');

    // Old record ended up revoked.
    const oldRecord = refreshStore.records.find((r) => r.token === 'refresh-old');
    expect(oldRecord?.revokedAt).not.toBeNull();

    // The access token proves identity and session only (CA-6.2):
    // `sid` is the (preserved) family id, nothing about roles or
    // permissions travels in the JWT anymore.
    expect(tokenIssuer.issued[0]).toEqual({
      sub: 1,
      sid: 'fam-1',
    });

    // lastLoginAt untouched (D-26).
    expect(user.lastLoginAt).toBe(lastLoginBefore);
  });

  it('unions and dedups permissions across multiple roles', async () => {
    const { users, useCase, refreshStore } = build([roleAdmin, roleLawyer]);
    users.seed(await makeUser({ roleIds: [1, 2], lawyerId: 10 }));
    seedLiveRefresh(refreshStore);

    const result = await useCase.execute({ refreshToken: 'refresh-old' });

    expect(result.user.roleNames).toEqual(['ADMINISTRATOR', 'LAWYER']);
    expect(result.user.permissions).toEqual(['user:manage', 'case:read', 'case:change-status']);
    expect(result.user.lawyerId).toBe(10);
  });

  it('throws SessionExpiredError when the token is unknown', async () => {
    const { useCase } = build();

    await expect(useCase.execute({ refreshToken: 'does-not-exist' })).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it('throws SessionExpiredError and revokes the whole family on reuse', async () => {
    const { useCase, refreshStore, users } = build();
    users.seed(await makeUser());
    seedLiveRefresh(refreshStore, {
      revokedAt: new Date('2026-09-21T10:00:00Z'),
    });

    await expect(useCase.execute({ refreshToken: 'refresh-old' })).rejects.toBeInstanceOf(SessionExpiredError);
    expect(refreshStore.revokeFamilyCalls).toEqual(['fam-1']);
  });

  it('throws SessionExpiredError on natural expiration without touching the family', async () => {
    const { useCase, refreshStore, users } = build();
    users.seed(await makeUser());
    seedLiveRefresh(refreshStore, {
      expiresAt: new Date('2026-09-22T09:59:59Z'),
    });

    await expect(useCase.execute({ refreshToken: 'refresh-old' })).rejects.toBeInstanceOf(SessionExpiredError);
    expect(refreshStore.revokeFamilyCalls).toEqual([]);
  });

  it('throws SessionExpiredError when the user was deleted after the login', async () => {
    const { useCase, refreshStore } = build();
    // No user seeded.
    seedLiveRefresh(refreshStore);

    await expect(useCase.execute({ refreshToken: 'refresh-old' })).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it('throws SessionExpiredError when the user is inactive', async () => {
    const { useCase, refreshStore, users } = build();
    users.seed(await makeUser({ active: false }));
    seedLiveRefresh(refreshStore);

    await expect(useCase.execute({ refreshToken: 'refresh-old' })).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it('fails hard (non-401) when a role id does not resolve', async () => {
    const { useCase, refreshStore, users } = build([roleAdmin]);
    users.seed(await makeUser({ roleIds: [1, 999] }));
    seedLiveRefresh(refreshStore);

    await expect(useCase.execute({ refreshToken: 'refresh-old' })).rejects.not.toBeInstanceOf(SessionExpiredError);
  });

  /**
   * CA-1.6. This is the half of the inactivity rule that keeps it
   * from being undone on contact: without it, the frontend's
   * automatic silent renewal would resurrect an idle session the
   * instant `AccessTokenVerifierAdapter`'s mirror of this same check
   * starts rejecting its access token.
   */
  describe('inactivity (CA-1.6)', () => {
    it('rotates normally just inside the window', async () => {
      const { useCase, refreshStore, users, clock } = build();
      users.seed(await makeUser());
      seedLiveRefresh(refreshStore, {
        createdAt: new Date(now.getTime() - (INACTIVITY_SECONDS - 1) * 1000),
      });
      clock.set(now);

      await expect(useCase.execute({ refreshToken: 'refresh-old' })).resolves.toMatchObject({
        user: { id: 1 },
      });
    });

    it('refuses just past the window', async () => {
      const { useCase, refreshStore, users, clock } = build();
      users.seed(await makeUser());
      seedLiveRefresh(refreshStore, {
        createdAt: new Date(now.getTime() - (INACTIVITY_SECONDS + 1) * 1000),
      });
      clock.set(now);

      await expect(useCase.execute({ refreshToken: 'refresh-old' })).rejects.toBeInstanceOf(
        SessionExpiredError,
      );
    });

    it('leaves the family alone — idleness is not treated as theft', async () => {
      const { useCase, refreshStore, users, clock } = build();
      users.seed(await makeUser());
      seedLiveRefresh(refreshStore, {
        createdAt: new Date(now.getTime() - (INACTIVITY_SECONDS + 1) * 1000),
      });
      clock.set(now);

      await expect(useCase.execute({ refreshToken: 'refresh-old' })).rejects.toBeInstanceOf(
        SessionExpiredError,
      );
      expect(refreshStore.revokeFamilyCalls).toEqual([]);
    });

    it('does not rotate a stale refresh, even though it is otherwise unexpired and unrevoked', async () => {
      // The regression this guards: `expiresAt` (7 days, D-04) is a
      // much longer ceiling than inactivity (30 min). A token that
      // passes the expiry check can still fail the inactivity one.
      const { useCase, refreshStore, users, clock } = build();
      users.seed(await makeUser());
      seedLiveRefresh(refreshStore, {
        createdAt: new Date(now.getTime() - (INACTIVITY_SECONDS + 1) * 1000),
        expiresAt: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      });
      clock.set(now);

      await expect(useCase.execute({ refreshToken: 'refresh-old' })).rejects.toBeInstanceOf(
        SessionExpiredError,
      );
      expect(refreshStore.records.some((r) => r.token !== 'refresh-old')).toBe(false);
    });
  });
});
