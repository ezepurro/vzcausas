import { Role } from "../../../domain/entities/role.entity";
import { User } from "../../../domain/entities/user.entity";
import { LawyerLookupPort } from "../../../domain/ports/lawyer-lookup.port";
import { PasswordHasher } from "../../../domain/ports/password-hasher.port";
import {
  RefreshTokenStore,
  StoredRefresh,
} from "../../../domain/ports/refresh-token-store.port";
import { RoleRepository } from "../../../domain/ports/role.repository";
import { UserRepository } from "../../../domain/ports/user.repository";
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
  async create(user: User): Promise<void> {
    this.created.push(user);
    this.byId.set(user.id, user);
  }

  /**
   * Resolves role names through {@link FakeRoleRepository}'s fixed
   * catalogue so specs can seed administrators by name without
   * wiring the two fakes together.
   */
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
