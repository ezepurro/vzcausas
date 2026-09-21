import { ValidationError } from "@shared/domain/domain-error";
import {
  InvalidCurrentPasswordError,
  WeakPasswordError,
} from "../errors/identity.errors";
import { PasswordHasher } from "../ports/password-hasher.port";
import { Username } from "../value-objects/username.vo";

const MIN_PASSWORD_LENGTH = 8;
/**
 * bcrypt truncates inputs longer than 72 bytes; rejecting longer
 * passwords up front avoids silent truncation surprises.
 */
const MAX_PASSWORD_BYTES = 72;

/**
 * Aggregate root of the `identity` subsystem. Encapsulates a user's
 * credentials and role/lawyer references.
 *
 * The password hash is deliberately private: there is no public
 * getter, so nothing outside the entity can read it. Verification and
 * change happen through {@link User.verifyPassword} and
 * {@link User.changePassword}, both of which receive a
 * {@link PasswordHasher} instead of importing one — the entity stays
 * infrastructure-agnostic.
 *
 * Two static factories are exposed:
 * - {@link User.hydrate} is used by repositories to rebuild the
 *   aggregate from persisted data without re-running creation checks.
 * - {@link User.create} is used to build a fresh user, validating
 *   invariants and hashing the plain password. Consumed by HU4 (out
 *   of the current login scope) but shipped now so the same
 *   invariants are enforced later.
 */
export class User {
  private constructor(
    private readonly _id: number,
    private readonly _username: Username,
    private _passwordHash: string,
    private readonly _roleId: number,
    private readonly _lawyerId: number | null,
    private readonly _active: boolean,
  ) {}

  /**
   * Rebuilds a {@link User} from persisted data. Skips creation-time
   * validation because the database is trusted to hold well-formed
   * records.
   */
  static hydrate(props: {
    id: number;
    username: Username;
    passwordHash: string;
    roleId: number;
    lawyerId: number | null;
    active: boolean;
  }): User {
    return new User(
      props.id,
      props.username,
      props.passwordHash,
      props.roleId,
      props.lawyerId,
      props.active,
    );
  }

  /**
   * Creates a fresh {@link User}. Validates structural invariants
   * (positive integer ids, well-formed lawyerId, password policy)
   * and hashes the plain password before storing it.
   *
   * The cross-invariant "role ABOGADO implies lawyerId is not null"
   * (see Q-07, D-19) cannot be checked here because this factory
   * only receives `roleId`, not the role name. That check is
   * expected to happen in the calling use case (HU4's
   * `RegisterUserUseCase`).
   *
   * @throws {ValidationError} on structural invariant violations.
   * @throws {WeakPasswordError} if the password does not meet the
   *   policy in D-03.
   */
  static async create(
    props: {
      id: number;
      username: Username;
      plainPassword: string;
      roleId: number;
      lawyerId: number | null;
      active?: boolean;
    },
    hasher: PasswordHasher,
  ): Promise<User> {
    if (!Number.isInteger(props.id) || props.id <= 0) {
      throw new ValidationError(
        "INVALID_USER",
        "User id must be a positive integer.",
      );
    }

    if (!Number.isInteger(props.roleId) || props.roleId <= 0) {
      throw new ValidationError(
        "INVALID_USER",
        "User role id must be a positive integer.",
      );
    }

    if (
      props.lawyerId !== null &&
      (!Number.isInteger(props.lawyerId) || props.lawyerId <= 0)
    ) {
      throw new ValidationError(
        "INVALID_USER",
        "lawyerId must be a positive integer or null.",
      );
    }

    User.validatePasswordRules(props.plainPassword);
    const hash = await hasher.hash(props.plainPassword);

    return new User(
      props.id,
      props.username,
      hash,
      props.roleId,
      props.lawyerId,
      props.active ?? true,
    );
  }

  /**
   * Verifies a plain-text password against the stored hash without
   * exposing the hash to the caller.
   */
  verifyPassword(plain: string, hasher: PasswordHasher): Promise<boolean> {
    return hasher.verify(plain, this._passwordHash);
  }

  /**
   * Changes the user's password after verifying the current one and
   * validating the new one against the policy.
   *
   * @throws {InvalidCurrentPasswordError} if `currentPlain` does not
   *   match the stored hash.
   * @throws {WeakPasswordError} if `newPlain` fails the policy check.
   */
  async changePassword(
    currentPlain: string,
    newPlain: string,
    hasher: PasswordHasher,
  ): Promise<void> {
    const ok = await hasher.verify(currentPlain, this._passwordHash);
    if (!ok) {
      throw new InvalidCurrentPasswordError();
    }
    User.validatePasswordRules(newPlain);
    this._passwordHash = await hasher.hash(newPlain);
  }

  get id(): number {
    return this._id;
  }

  get username(): Username {
    return this._username;
  }

  get roleId(): number {
    return this._roleId;
  }

  get lawyerId(): number | null {
    return this._lawyerId;
  }

  isActive(): boolean {
    return this._active;
  }

  private static validatePasswordRules(plain: string): void {
    if (typeof plain !== "string") {
      throw new WeakPasswordError("Password must be a string.");
    }

    if (plain.length < MIN_PASSWORD_LENGTH) {
      throw new WeakPasswordError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      );
    }

    const byteLength = Buffer.byteLength(plain, "utf8");

    if (byteLength > MAX_PASSWORD_BYTES) {
      throw new WeakPasswordError(
        `Password must not exceed ${MAX_PASSWORD_BYTES} bytes in UTF-8.`,
      );
    }
  }
}
