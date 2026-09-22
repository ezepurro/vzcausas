import { User } from "../entities/user.entity";
import { Username } from "../value-objects/username.vo";

/**
 * DI token for {@link UserRepository}. See D-09 and glossary §7.1 in
 * IMPLEMENTACION_AUTH.md for the Symbol-as-token convention.
 */
export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

/**
 * Persistence port for the {@link User} aggregate. Exposes only what
 * the auth use cases (login, change password) need. HU4's user
 * administration will extend this port with `create`, `deleteById`,
 * `findAll`, `existsByUsername`, etc. — the frontier is additive; do
 * not remove or repurpose existing methods.
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
   * new users is HU4's concern and is not covered by this method.
   */
  save(user: User): Promise<void>;
}
