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
   * Persists changes on an existing user (currently used by
   * `ChangePassword` to store the new password hash). Insertion of
   * new users goes through {@link UserRepository.create}.
   */
  save(user: User): Promise<void>;

  /**
   * Reserves the next primary key value. `User.create()` requires an
   * `id` up front (it validates and hashes in one step), so the use
   * case must obtain one before constructing the aggregate.
   */
  nextId(): Promise<number>;

  /** `true` if a user with this username already exists (HU4, 409). */
  existsByUsername(username: Username): Promise<boolean>;

  /** `true` if a user with this email already exists (HU4, 409). */
  existsByEmail(email: Email): Promise<boolean>;

  /** Inserts a freshly created user. */
  create(user: User): Promise<void>;
}
