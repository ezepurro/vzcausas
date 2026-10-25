import { Injectable } from "@nestjs/common";
import { User } from "@subsystems/identity/core/domain/entities/user.entity";
import {
  UserPage,
  UserRepository,
  UserSearchCriteria,
} from "@subsystems/identity/core/domain/ports/user.repository";
import { Email } from "@subsystems/identity/core/domain/value-objects/email.vo";
import { Username } from "@subsystems/identity/core/domain/value-objects/username.vo";
import { ROLE_CATALOG } from "./in-memory-role.repository";

/**
 * Transitional {@link UserRepository} implementation backed by a
 * `Map`. Ships as a production adapter — not a test fake (D-48) — so
 * the HTTP layer can be exercised end to end before the Prisma schema
 * exists. P-15 replaces it with `PrismaUserRepository`.
 *
 * State lives in process memory: it is lost on restart and not shared
 * between instances. That is acceptable precisely because the
 * replacement is already scheduled.
 *
 * The store starts empty (D-44). No user is hardcoded, so nobody can
 * authenticate until {@link InMemoryUserRepository.seed} is called at
 * bootstrap or HU4's `POST /users` lands. The initial data seed is
 * deliberately out of this scope and coordinated with HU4.
 */
@Injectable()
export class InMemoryUserRepository implements UserRepository {
  /**
   * Single source of truth, keyed by id. The username index below
   * points into this same set of aggregates.
   */
  private readonly byId = new Map<number, User>();

  /**
   * Secondary index for the login lookup. Keys are the *normalized*
   * username (D-17: trimmed and lowercased by the value object), so
   * `Admin` and `admin` resolve to the same entry.
   */
  private readonly byUsername = new Map<string, User>();

  /**
   * What username each id is currently indexed under. Needed only to
   * evict the old key on a rename — see {@link index}.
   */
  private readonly usernameById = new Map<number, string>();

  /**
   * Bootstrap hook, deliberately outside the {@link UserRepository}
   * contract (D-44): the port describes what the use cases need, and
   * no use case seeds data. Intended for dev bootstrap and E2E
   * fixtures. The Prisma adapter will not have an equivalent — its
   * data comes from migrations and HU4's endpoints.
   */
  seed(user: User): void {
    this.index(user);
  }

  async findByUsername(username: Username): Promise<User | null> {
    return this.byUsername.get(username.toString()) ?? null;
  }

  async findById(id: number): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async save(user: User): Promise<void> {
    this.index(user);
  }

  /**
   * Ids are handed out from one past the highest in use, so a seeded
   * user (which brings its own id) cannot collide with a registered
   * one. A plain counter would, since `seed()` bypasses this method.
   */
  async nextId(): Promise<number> {
    const highest = [...this.byId.keys()].reduce(
      (max, id) => (id > max ? id : max),
      0,
    );
    return highest + 1;
  }

  async existsByUsername(
    username: Username,
    excludingUserId?: number,
  ): Promise<boolean> {
    const found = this.byUsername.get(username.toString());
    return found !== undefined && found.id !== excludingUserId;
  }

  async existsByEmail(
    email: Email,
    excludingUserId?: number,
  ): Promise<boolean> {
    return [...this.byId.values()].some(
      (user) => user.email.equals(email) && user.id !== excludingUserId,
    );
  }

  async create(user: User): Promise<void> {
    this.index(user);
  }

  /**
   * Resolves the role name against {@link ROLE_CATALOG} because there
   * is no join table to query in memory. Deactivated users are not
   * counted — they cannot administer anything (CA-6.3, CA-7.4).
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
          user.lastName.toLowerCase().includes(needle) ||
          user.firstName.toLowerCase().includes(needle),
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


  async existsActiveByLawyerId(
    lawyerId: number,
    excludingUserId?: number,
  ): Promise<boolean> {
    return [...this.byId.values()].some(
      (user) =>
        user.isActive() &&
        user.lawyerId === lawyerId &&
        user.id !== excludingUserId,
    );
  }

  async findActiveByLawyerId(lawyerId: number): Promise<User | null> {
    return (
      [...this.byId.values()].find(
        (user) => user.isActive() && user.lawyerId === lawyerId,
      ) ?? null
    );
  }

  async countActiveByRoleName(roleName: string): Promise<number> {
    const role = ROLE_CATALOG.find((entry) => entry.name === roleName);
    if (role === undefined) return 0;

    return [...this.byId.values()].filter(
      (user) => user.isActive() && user.roleIds.includes(role.id),
    ).length;
  }

  /**
   * Re-indexes the aggregate under both keys and drops the stale
   * username entry.
   *
   * HU6's `UpdateUser` can rename a user, and leaving the previous
   * key behind would let them go on logging in under the old name —
   * a silent authentication hole, not merely a stale entry. The
   * original comment here assumed renaming was not yet possible.
   *
   * The previous username cannot be read back off the stored
   * aggregate: `UpdateUser` mutates the very instance this map holds,
   * so by the time `save()` arrives it already reports the new name.
   * Hence {@link usernameById}, which records what each id was
   * actually indexed under.
   */
  private index(user: User): void {
    const indexedUnder = this.usernameById.get(user.id);
    const current = user.username.toString();

    if (indexedUnder !== undefined && indexedUnder !== current) {
      this.byUsername.delete(indexedUnder);
    }

    this.byId.set(user.id, user);
    this.byUsername.set(current, user);
    this.usernameById.set(user.id, current);
  }
}
