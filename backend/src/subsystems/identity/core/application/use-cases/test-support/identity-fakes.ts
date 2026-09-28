import { Role } from "../../../domain/entities/role.entity";
import { User } from "../../../domain/entities/user.entity";
import { TransactionManagerPort } from "@shared/domain/transaction-manager.port";
import {
  LawyerLookupPort,
  LawyerSummary,
} from "../../../domain/ports/lawyer-lookup.port";
import {
  LawyerRegistrarPort,
  NewLawyer,
} from "../../../domain/ports/lawyer-registrar.port";
import { PasswordHasher } from "../../../domain/ports/password-hasher.port";
import {
  RefreshTokenStore,
  StoredRefresh,
} from "../../../domain/ports/refresh-token-store.port";
import { RoleRepository } from "../../../domain/ports/role.repository";
import {
  UserPage,
  UserRepository,
  UserSearchCriteria,
} from "../../../domain/ports/user.repository";
import { Email } from "../../../domain/value-objects/email.vo";
import { Permission } from "../../../domain/value-objects/permission.vo";
import { Username } from "../../../domain/value-objects/username.vo";

/**
 * In-memory fakes shared by `identity`'s use-case specs (no NestJS,
 * no database — see EJEMPLO_CASO_DE_USO.md's testing guidance).
 */
export class FakeHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

/**
 * The role catalogue both fakes agree on. Shared so that
 * {@link FakeUserRepository.countActiveByRoleName} and
 * {@link FakeRoleRepository} cannot drift apart.
 */
export const FAKE_ROLE_IDS_BY_NAME: Readonly<Record<string, number>> = {
  ADMINISTRATOR: 1,
  LAWYER: 2,
  SECRETARY: 3,
};

/**
 * `byId` is the only source of truth — username/email lookups scan
 * it, rather than keeping side maps that would go stale on `save()`
 * (e.g. after a username change). Fine for the small sets a unit test
 * seeds.
 */
export class FakeUserRepository implements UserRepository {
  private nextIdValue = 1;
  readonly byId = new Map<number, User>();
  readonly created: User[] = [];
  readonly saved: User[] = [];

  async findByUsername(username: Username): Promise<User | null> {
    return (
      [...this.byId.values()].find((u) =>
        u.username.equals(username),
      ) ?? null
    );
  }
  async findById(id: number): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }
  async save(user: User): Promise<void> {
    this.saved.push(user);
    this.byId.set(user.id, user);
  }
  async nextId(): Promise<number> {
    return this.nextIdValue++;
  }
  async existsByUsername(
    username: Username,
    excludingUserId?: number,
  ): Promise<boolean> {
    return [...this.byId.values()].some(
      (u) => u.username.equals(username) && u.id !== excludingUserId,
    );
  }
  async existsByEmail(
    email: Email,
    excludingUserId?: number,
  ): Promise<boolean> {
    return [...this.byId.values()].some(
      (u) => u.email.equals(email) && u.id !== excludingUserId,
    );
  }
  /** Set by a spec to make the next insert fail (rollback tests). */
  failNextCreate?: Error;

  async create(user: User): Promise<void> {
    if (this.failNextCreate !== undefined) {
      const error = this.failNextCreate;
      this.failNextCreate = undefined;
      throw error;
    }
    this.created.push(user);
    this.byId.set(user.id, user);
  }

  /**
   * Resolves role names through {@link FakeRoleRepository}'s fixed
   * catalogue so specs can seed administrators by name without
   * wiring the two fakes together.
   */

  /**
   * Mirrors what the Prisma adapter does in SQL: active users only,
   * newest first, case-insensitive match on username or full name,
   * optional role filter, then the page slice. Kept faithful on
   * purpose — a fake that filtered differently would let specs pass
   * against behaviour production does not have.
   */
  async search(criteria: UserSearchCriteria): Promise<UserPage> {
    const needle = criteria.search?.toLowerCase();

    const matches = [...this.byId.values()]
      .filter((user) => user.isActive())
      .filter(
        (user) =>
          needle === undefined ||
          user.username.toString().toLowerCase().includes(needle) ||
          user.fullName.toLowerCase().includes(needle),
      )
      .filter(
        (user) =>
          criteria.roleId === undefined ||
          user.roleIds.includes(criteria.roleId),
      )
      .sort((a, b) => b.id - a.id);

    const offset = (criteria.page - 1) * criteria.limit;

    return {
      items: matches.slice(offset, offset + criteria.limit),
      totalItems: matches.length,
    };
  }

  async countActiveByRoleName(roleName: string): Promise<number> {
    const roleId = FAKE_ROLE_IDS_BY_NAME[roleName];
    if (roleId === undefined) return 0;
    return [...this.byId.values()].filter(
      (u) => u.isActive() && u.roleIds.includes(roleId),
    ).length;
  }
}

export class FakeRoleRepository implements RoleRepository {
  private readonly roles = [
    Role.create({
      id: FAKE_ROLE_IDS_BY_NAME.ADMINISTRATOR,
      name: "ADMINISTRATOR",
      permissions: [],
    }),
    Role.create({
      id: FAKE_ROLE_IDS_BY_NAME.LAWYER,
      name: "LAWYER",
      permissions: [],
    }),
    Role.create({
      id: FAKE_ROLE_IDS_BY_NAME.SECRETARY,
      name: "SECRETARY",
      permissions: [Permission.create("case:read")],
    }),
  ];

  async findByIds(ids: readonly number[]): Promise<Role[]> {
    return this.roles.filter((role) => ids.includes(role.getId()));
  }
  async findByNames(names: readonly string[]): Promise<Role[]> {
    return this.roles.filter((role) => names.includes(role.getName()));
  }
}

export class FakeLawyerLookup implements LawyerLookupPort {
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

/** Records which users had their sessions revoked (HU7). */
export class FakeRefreshTokenStore implements RefreshTokenStore {
  readonly revokedForUsers: number[] = [];

  async issue(): Promise<StoredRefresh> {
    throw new Error("not used in these specs");
  }
  async find(): Promise<StoredRefresh | null> {
    return null;
  }
  async revoke(): Promise<void> {}
  async revokeFamily(): Promise<void> {}
  async revokeAllForUser(userId: number): Promise<void> {
    this.revokedForUsers.push(userId);
  }
}

/**
 * Records the lawyers it was asked to create so a spec can assert
 * both that one was registered and that a rolled-back registration
 * left nothing behind.
 *
 * `failWith` makes the registration throw, which is how the specs
 * exercise the "matrícula already taken" path without involving
 * `people`.
 */
export class FakeLawyerRegistrar implements LawyerRegistrarPort {
  readonly registered: NewLawyer[] = [];
  private nextId = 100;

  constructor(private readonly failWith?: Error) {}

  async register(lawyer: NewLawyer): Promise<LawyerSummary> {
    if (this.failWith !== undefined) {
      throw this.failWith;
    }

    this.registered.push(lawyer);
    return {
      id: this.nextId++,
      fullName: lawyer.fullName,
      registrationNumber: lawyer.registrationNumber,
    };
  }
}

/**
 * Runs the work and, when it throws, undoes whatever the repositories
 * recorded during it — the observable part of a rollback, which is
 * what the specs need to assert.
 *
 * Deliberately not a no-op passthrough: a fake that merely called
 * `work()` would let a spec claim atomicity that the real manager
 * provides and this test never exercised.
 */
export class FakeTransactionManager implements TransactionManagerPort {
  calls = 0;

  constructor(
    private readonly users?: FakeUserRepository,
    private readonly registrar?: FakeLawyerRegistrar,
  ) {}

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    this.calls++;

    const usersBefore = this.users ? [...this.users.byId.keys()] : [];
    const lawyersBefore = this.registrar
      ? this.registrar.registered.length
      : 0;

    try {
      return await work();
    } catch (error) {
      if (this.users) {
        for (const id of [...this.users.byId.keys()]) {
          if (!usersBefore.includes(id)) this.users.byId.delete(id);
        }
        this.users.created.length = 0;
      }
      if (this.registrar) {
        this.registrar.registered.length = lawyersBefore;
      }
      throw error;
    }
  }
}
