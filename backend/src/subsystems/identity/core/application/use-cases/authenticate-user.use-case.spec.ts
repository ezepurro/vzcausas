import { ClockPort } from '@shared/domain/clock.port';
import { Role } from '../../domain/entities/role.entity';
import { User } from '../../domain/entities/user.entity';
import {
  InvalidCredentialsError,
  TooManyLoginAttemptsError,
} from '../../domain/errors/identity.errors';
import {
  LoginAttemptRecord,
  LoginLockTier,
  applyFailure,
  remainingLockSeconds,
} from '../../domain/login-lock-policy';
import {
  LoginAttemptContext,
  LoginThrottle,
} from '../../domain/ports/login-throttle.port';
import { LawyerLookupPort, LawyerSummary } from '../../domain/ports/lawyer-lookup.port';
import { PasswordHasher } from '../../domain/ports/password-hasher.port';
import { RefreshTokenStore, StoredRefresh } from '../../domain/ports/refresh-token-store.port';
import { RoleRepository } from '../../domain/ports/role.repository';
import { AccessTokenClaims, IssuedAccessToken, TokenIssuer } from '../../domain/ports/token-issuer.port';
import { UserRepository } from '../../domain/ports/user.repository';
import { Email } from '../../domain/value-objects/email.vo';
import { Permission } from '../../domain/value-objects/permission.vo';
import { Username } from '../../domain/value-objects/username.vo';
import { AuthenticateUserUseCase } from './authenticate-user.use-case';

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

class FakeLawyerLookup implements LawyerLookupPort {
  constructor(private readonly existingIds: readonly number[] = []) {}
  async existsById(lawyerId: number): Promise<boolean> {
    return this.existingIds.includes(lawyerId);
  }
  /** Renders a predictable summary for every id it knows about. */
  async findSummaries(lawyerIds: readonly number[]): Promise<Map<number, LawyerSummary>> {
    return new Map(
      lawyerIds
        .filter((id) => this.existingIds.includes(id))
        .map((id) => [id, { id, fullName: `Lawyer ${id}`, registrationNumber: `1-${id}` }]),
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
    throw new Error('not used in this test');
  }
}

class FakeRefreshStore implements RefreshTokenStore {
  issued: Array<{ userId: number; familyId: string | null }> = [];
  async issue(params: { userId: number; familyId: string | null }): Promise<StoredRefresh> {
    this.issued.push(params);
    return {
      token: `refresh-${params.userId}`,
      userId: params.userId,
      familyId: params.familyId ?? 'fam-1',
      createdAt: new Date('2026-09-21T10:00:00Z'),
      expiresAt: new Date('2026-09-28T10:00:00Z'),
      revokedAt: null,
    };
  }
  async find(): Promise<StoredRefresh | null> {
    return null;
  }
  async revoke(): Promise<void> {}
  async revokeFamily(): Promise<void> {}
  async revokeAllForUser(): Promise<void> {}
  async findLatestInFamily(): Promise<null> {
    return null;
  }
}

/**
 * The tiers these specs run against: the shape `.env.example`
 * recommends. Pinned here rather than read from the environment so
 * the expectations below (five failures, then 90 seconds) stay true
 * regardless of how a deployment is configured.
 */
const TEST_TIERS: readonly LoginLockTier[] = [
  {
    scope: 'username+ip',
    threshold: 5,
    windowSeconds: 15 * 60,
    ladderSeconds: [90, 5 * 60, 15 * 60, 30 * 60, 60 * 60],
  },
  {
    scope: 'username',
    threshold: 25,
    windowSeconds: 60 * 60,
    ladderSeconds: [15 * 60],
  },
];

/**
 * In-memory {@link LoginThrottle} running the **real** policy, so
 * these specs exercise the actual ladder rather than a stub that
 * always answers "not locked".
 *
 * The key building is duplicated from the Prisma adapter on purpose:
 * D-48 keeps fakes and production adapters independent, so a change to
 * the storage encoding cannot quietly make a passing test meaningless.
 */
class FakeLoginThrottle implements LoginThrottle {
  private readonly records = new Map<string, LoginAttemptRecord>();

  /** Contexts whose counters were cleared, in call order. */
  readonly cleared: LoginAttemptContext[] = [];

  constructor(
    private readonly clock: ClockPort,
    private readonly tiers: readonly LoginLockTier[] = TEST_TIERS,
  ) {}

  private keyed(
    context: LoginAttemptContext,
  ): Array<readonly [LoginLockTier, string]> {
    return this.tiers.map(
      (tier) =>
        [
          tier,
          tier.scope === 'username'
            ? `u:${context.username}`
            : `u:${context.username}|ip:${context.ip}`,
        ] as const,
    );
  }

  async remainingLockSeconds(context: LoginAttemptContext): Promise<number> {
    const now = this.clock.now();
    let wait = 0;
    for (const [, key] of this.keyed(context)) {
      wait = Math.max(
        wait,
        remainingLockSeconds(this.records.get(key) ?? null, now),
      );
    }
    return wait;
  }

  async recordFailure(context: LoginAttemptContext): Promise<number> {
    const now = this.clock.now();
    let wait = 0;
    for (const [tier, key] of this.keyed(context)) {
      const next = applyFailure(tier, this.records.get(key) ?? null, now);
      this.records.set(key, next);
      wait = Math.max(wait, remainingLockSeconds(next, now));
    }
    return wait;
  }

  async recordSuccess(context: LoginAttemptContext): Promise<void> {
    this.cleared.push(context);
    for (const [, key] of this.keyed(context)) {
      this.records.delete(key);
    }
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
    password?: string;
    roleIds?: number[];
    lawyerId?: number | null;
    active?: boolean;
  } = {},
): Promise<User> {
  return User.create(
    {
      id: overrides.id ?? 1,
      username: Username.create(overrides.username ?? 'fvazquez'),
      plainPassword: overrides.password ?? 'password-123',
      fullName: 'Fernando Vázquez',
      email: Email.create('fvazquez@vazquezzarate.com'),
      roleIds: overrides.roleIds ?? [1],
      lawyerId: overrides.lawyerId ?? null,
      active: overrides.active,
    },
    new FakeHasher(),
  );
}

describe('AuthenticateUserUseCase', () => {
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

  const now = new Date('2026-09-21T10:00:00Z');

  const CALLER_IP = '203.0.113.5';

  const build = (roles: Role[] = [roleAdmin], knownLawyerIds: number[] = []) => {
    const users = new FakeUserRepository();
    const rolesRepo = new FakeRoleRepository(roles);
    const hasher = new FakeHasher();
    const tokenIssuer = new FakeTokenIssuer();
    const refreshStore = new FakeRefreshStore();
    const clock = new FakeClock(now);
    const lawyerLookup = new FakeLawyerLookup(knownLawyerIds);
    const throttle = new FakeLoginThrottle(clock);
    const useCase = new AuthenticateUserUseCase(
      users,
      rolesRepo,
      hasher,
      tokenIssuer,
      refreshStore,
      clock,
      lawyerLookup,
      throttle,
    );

    /**
     * Calls the use case with a default caller address, so only the
     * specs that care about the address have to mention it.
     *
     * Field by field rather than `{ ip: CALLER_IP, ...command }`: an
     * explicit `ip: undefined` in the argument would override the
     * default through the spread, and the counter key would silently
     * differ between a helper that passes the field and a caller that
     * omits it — which is exactly the false pass this helper exists to
     * avoid.
     */
    const login = (command: {
      username: string;
      password: string;
      ip?: string;
    }) =>
      useCase.execute({
        username: command.username,
        password: command.password,
        ip: command.ip ?? CALLER_IP,
      });

    return {
      users,
      rolesRepo,
      hasher,
      tokenIssuer,
      refreshStore,
      clock,
      lawyerLookup,
      throttle,
      useCase,
      login,
    };
  };

  it('issues tokens and user info on successful login', async () => {
    const { users, login, tokenIssuer, refreshStore } = build();
    users.seed(await makeUser({ roleIds: [1] }));

    const result = await login({
      username: 'fvazquez',
      password: 'password-123',
    });

    expect(result.accessToken).toBe('access-for-1');
    expect(result.expiresIn).toBe(900);
    expect(result.refreshToken).toBe('refresh-1');
    expect(result.user.id).toBe(1);
    expect(result.user.username).toBe('fvazquez');
    expect(result.user.roleNames).toEqual(['ADMINISTRATOR']);
    expect(result.user.lawyer).toBeNull();
    expect(result.user.previousLoginAt).toBeNull();
    // The access token now proves identity and session, nothing else
    // (CA-6.2): `sid` is the family the login just opened. Roles,
    // lawyerId and permissions no longer travel in the JWT — they are
    // read fresh from the database on every request instead
    // (`AccessTokenVerifierAdapter`), which is what lets a change to
    // either take effect without waiting for the token to expire.
    expect(tokenIssuer.issued[0]).toEqual({
      sub: 1,
      sid: 'fam-1',
    });
    expect(refreshStore.issued[0]).toEqual({ userId: 1, familyId: null });
  });

  it('lists every roleName in the response when the user has more than one', async () => {
    // Permission union moved out of this use case entirely — it now
    // happens in `AccessTokenVerifierAdapter` on every request. What
    // this use case still owns is the login *response*, which lists
    // role names (§3.1's `roles` field), not permissions.
    const { users, login } = build([roleAdmin, roleLawyer]);
    users.seed(await makeUser({ roleIds: [1, 2], lawyerId: 10 }));

    const result = await login({ username: 'fvazquez', password: 'password-123' });

    expect(result.user.roleNames).toEqual(['ADMINISTRATOR', 'LAWYER']);
  });

  it('embeds the linked professional record under user.lawyer', async () => {
    const { users, login } = build([roleAdmin, roleLawyer], [10]);
    users.seed(await makeUser({ roleIds: [1, 2], lawyerId: 10 }));

    const result = await login({
      username: 'fvazquez',
      password: 'password-123',
    });

    expect(result.user.lawyer).toEqual({
      id: 10,
      fullName: 'Lawyer 10',
      registrationNumber: '1-10',
    });
  });

  it('renders lawyer as null when the link does not resolve', async () => {
    // The user points at lawyer 99, which the lookup does not know: a
    // deactivated record reads the same as no link at all, and must
    // not keep its user from logging in.
    const { users, login } = build([roleAdmin], [10]);
    users.seed(await makeUser({ roleIds: [1], lawyerId: 99 }));

    const result = await login({
      username: 'fvazquez',
      password: 'password-123',
    });

    expect(result.user.lawyer).toBeNull();
  });

  it('throws InvalidCredentialsError when the user does not exist', async () => {
    const { login } = build();

    await expect(login({ username: 'nobody', password: 'password-123' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('throws InvalidCredentialsError on wrong password', async () => {
    const { users, login } = build();
    users.seed(await makeUser());

    await expect(login({ username: 'fvazquez', password: 'wrong' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('throws InvalidCredentialsError when the user is inactive', async () => {
    const { users, login } = build();
    users.seed(await makeUser({ active: false }));

    await expect(login({ username: 'fvazquez', password: 'password-123' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('throws InvalidCredentialsError on malformed username', async () => {
    const { login } = build();

    await expect(login({ username: '!!bad!!', password: 'password-123' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('fails hard (non-401) when a role id does not resolve', async () => {
    const { users, login } = build([roleAdmin]); // only role 1 exists
    users.seed(await makeUser({ roleIds: [1, 999] }));

    await expect(login({ username: 'fvazquez', password: 'password-123' })).rejects.not.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('rotates lastLoginAt: returns previous, stores current, persists', async () => {
    const { users, login, clock } = build();
    users.seed(await makeUser());

    // First login: previous is null (fresh user).
    const first = await login({
      username: 'fvazquez',
      password: 'password-123',
    });
    expect(first.user.previousLoginAt).toBeNull();

    // Second login later: previous is the first login's timestamp.
    const later = new Date('2026-09-21T15:00:00Z');
    clock.set(later);
    const second = await login({
      username: 'fvazquez',
      password: 'password-123',
    });
    expect(second.user.previousLoginAt).toEqual(now);

    // And the stored user reflects the second login.
    const stored = await users.findByUsername(Username.create('fvazquez'));
    expect(stored!.lastLoginAt).toEqual(later);
  });

  /**
   * Progressive lockout (Q-03). The ladder itself is covered
   * exhaustively in `login-lock-policy.spec.ts`; what these assert is
   * the use case's part — when it consults, when it counts, and that
   * the opacity of D-18 survives.
   */
  describe('progressive lockout', () => {
    /** Burns `count` wrong passwords and returns the last error. */
    const failTimes = async (
      login: (c: { username: string; password: string; ip?: string }) => Promise<unknown>,
      count: number,
      ip?: string,
    ): Promise<unknown> => {
      let last: unknown;
      for (let i = 0; i < count; i += 1) {
        last = await login({ username: 'fvazquez', password: 'wrong', ip }).catch(
          (error: unknown) => error,
        );
      }
      return last;
    };

    it('locks the caller on the fifth consecutive failure', async () => {
      const { users, login } = build();
      users.seed(await makeUser());

      const fifth = await failTimes(login, 5);

      expect(fifth).toBeInstanceOf(TooManyLoginAttemptsError);
      expect((fifth as TooManyLoginAttemptsError).details).toEqual({
        retryAfterSeconds: 90,
      });
    });

    it('reports the lock on the attempt that trips it, not the one after', async () => {
      const { users, login } = build();
      users.seed(await makeUser());

      // Four failures are still plain credential errors: nothing has
      // been closed yet and saying otherwise would be a lie.
      const fourth = await failTimes(login, 4);
      expect(fourth).toBeInstanceOf(InvalidCredentialsError);
    });

    it('refuses the right password while the lock stands', async () => {
      const { users, login } = build();
      users.seed(await makeUser());
      await failTimes(login, 5);

      await expect(
        login({ username: 'fvazquez', password: 'password-123' }),
      ).rejects.toBeInstanceOf(TooManyLoginAttemptsError);
    });

    it('never reaches the password check while locked', async () => {
      // The point of consulting the throttle before verifying: bcrypt
      // at cost 12 is the expensive part, and a locked caller must not
      // be able to make the server spend it.
      const { users, login, hasher } = build();
      users.seed(await makeUser());
      await failTimes(login, 5);

      const verify = jest.spyOn(hasher, 'verify');
      await login({ username: 'fvazquez', password: 'password-123' }).catch(
        () => undefined,
      );

      expect(verify).not.toHaveBeenCalled();
    });

    it('lets the caller back in once the lock elapses', async () => {
      const { users, login, clock } = build();
      users.seed(await makeUser());
      await failTimes(login, 5);

      clock.set(new Date(now.getTime() + 91_000));

      await expect(
        login({ username: 'fvazquez', password: 'password-123' }),
      ).resolves.toMatchObject({ user: { username: 'fvazquez' } });
    });

    it('does not lock a lawyer out because of failures from another address', async () => {
      // Why the primary tier is scoped to username+ip: otherwise
      // anyone who knows a username could close that account at will.
      const { users, login } = build();
      users.seed(await makeUser());

      await failTimes(login, 5, '198.51.100.9');

      await expect(
        login({ username: 'fvazquez', password: 'password-123', ip: '203.0.113.5' }),
      ).resolves.toMatchObject({ user: { username: 'fvazquez' } });
    });

    it('counts failures against a username that does not exist', async () => {
      // Load bearing for D-18: if only real accounts could be locked,
      // the 429 would answer "does this user exist?" — exactly the
      // question the opaque 401 refuses to answer.
      const { login } = build();

      let last: unknown;
      for (let i = 0; i < 5; i += 1) {
        last = await login({ username: 'nobody', password: 'wrong' }).catch(
          (error: unknown) => error,
        );
      }

      expect(last).toBeInstanceOf(TooManyLoginAttemptsError);
    });

    it('clears the counters on a successful login', async () => {
      const { users, login, throttle } = build();
      users.seed(await makeUser());
      await failTimes(login, 4);

      await login({ username: 'fvazquez', password: 'password-123' });

      expect(throttle.cleared).toEqual([
        { username: 'fvazquez', ip: CALLER_IP },
      ]);
      // And the slate really is clean: five more failures are needed,
      // not one.
      const next = await failTimes(login, 4);
      expect(next).toBeInstanceOf(InvalidCredentialsError);
    });

    it('counts an inactive user\'s failures too', async () => {
      const { users, login } = build();
      users.seed(await makeUser({ active: false }));

      const fifth = await failTimes(login, 5);

      expect(fifth).toBeInstanceOf(TooManyLoginAttemptsError);
    });

    it('does not count a malformed username, which has no stable key', async () => {
      const { login } = build();

      for (let i = 0; i < 6; i += 1) {
        await expect(
          login({ username: '!!bad!!', password: 'password-123' }),
        ).rejects.toBeInstanceOf(InvalidCredentialsError);
      }
    });
  });
});
