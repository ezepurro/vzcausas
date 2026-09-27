import { User } from "../entities/user.entity";
import { Email } from "../value-objects/email.vo";
import { Username } from "../value-objects/username.vo";

/**
 * DI token for {@link UserRepository}. See D-09 and glossary §7.1 in
 * IMPLEMENTACION_AUTH.md for the Symbol-as-token convention.
 */
export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

/**
 * Persistence port for the {@link User} aggregate. Exposes what the
 * auth use cases (login, change password) and HU4's `RegisterUser`
 * need. The frontier is additive; do not remove or repurpose existing
 * methods.
 */
export interface UserRepository {
  /**
   * Resolves a user by their login identifier. Returns `null` if no
   * user matches. The lookup must respect the value-object's
   * normalization rules (D-17: trimmed, lowercased).
   */
  findByUsername(username: Username): Promise<User | null>;

  /** Loads a user by primary key. Returns `null` if none. */
  findById(id: number): Promise<User | null>;

  /**
   * Persists every mutable field of an existing user: password hash
   * (`ChangePassword`), `lastLoginAt` (`AuthenticateUser`), and
   * profile/roles/lawyerId (`UpdateUser`, HU6). Insertion of new
   * users goes through {@link UserRepository.create}.
   */
  save(user: User): Promise<void>;

  /**
   * Reserves the next primary key value. `User.create()` requires an
   * `id` up front (it validates and hashes in one step), so the use
   * case must obtain one before constructing the aggregate.
   */
  nextId(): Promise<number>;

  /**
   * `true` if a user with this username already exists (HU4, 409).
   * `excludingUserId` lets `UpdateUser` (HU6) check without
   * conflicting with the user's own current username.
   */
  existsByUsername(
    username: Username,
    excludingUserId?: number,
  ): Promise<boolean>;

  /**
   * `true` if a user with this email already exists (HU4, 409). Same
   * `excludingUserId` use as {@link UserRepository.existsByUsername}.
   */
  existsByEmail(email: Email, excludingUserId?: number): Promise<boolean>;

  /** Inserts a freshly created user. */
  create(user: User): Promise<void>;

  /**
   * Counts the **active** users holding the role with this name.
   *
   * Exists for the "last administrator" rule (CA-6.3, CA-7.4): before
   * removing the ADMINISTRATOR role from someone, or deactivating
   * them, the use case must know whether anyone else would be left to
   * administer the system.
   *
   * Takes a role *name* rather than an id because that is what the
   * rule is expressed in ("ADMINISTRATOR"); resolving the id first
   * would cost a second round trip for no gain. Deactivated users
   * must not be counted — they cannot administer anything.
   */
  countActiveByRoleName(roleName: string): Promise<number>;

  /**
   * One page of users, newest-first, for `GET /users` (§3.2).
   *
   * Only active users are returned: a logically deleted one *"no
   * aparece en ningún listado"* per the contract, the same rule
   * `GetUser` applies when it answers 404.
   *
   * Returns the total alongside the page because the `pagination`
   * block needs it and counting belongs to the database.
   */
  search(criteria: UserSearchCriteria): Promise<UserPage>;
}

/**
 * `search` matches a free-text fragment against username and full
 * name; `roleId` narrows to users holding that role. The use case
 * resolves the role *name* the contract exposes into an id before
 * calling, so the repository never has to know role vocabulary.
 */
export type UserSearchCriteria = {
  page: number;
  limit: number;
  search?: string;
  roleId?: number;
};

export type UserPage = { items: User[]; totalItems: number };
