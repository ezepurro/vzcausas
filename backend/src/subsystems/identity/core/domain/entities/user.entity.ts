import { ValidationError } from "@shared/domain/domain-error";
import {
  InvalidCurrentPasswordError,
  WeakPasswordError,
} from "../errors/identity.errors";
import { PasswordHasher } from "../ports/password-hasher.port";
import { Email } from "../value-objects/email.vo";
import { Username } from "../value-objects/username.vo";

const MIN_PASSWORD_LENGTH = 8;
/**
 * bcrypt truncates inputs longer than 72 bytes; rejecting longer
 * passwords up front avoids silent truncation surprises.
 */
const MAX_PASSWORD_BYTES = 72;
const PASSWORD_DIGIT_REGEX = /\d/;

/**
 * Aggregate root of the `identity` subsystem. Encapsulates a user's
 * credentials, personal fields and role/lawyer references.
 *
 * The password hash is deliberately private: there is no public
 * getter, so nothing outside the entity can read it. Verification
 * and change happen through {@link User.verifyPassword} and
 * {@link User.changePassword}, both receiving a
 * {@link PasswordHasher} via port — the entity stays
 * infrastructure-agnostic.
 *
 * The `lastLoginAt` field reflects the timestamp of the previous
 * successful login. The API v2 login response returns this value so
 * users can spot unfamiliar access; {@link User.registerLogin}
 * rotates it atomically (returns the previous, stores the current).
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
    private readonly _fullName: string,
    private readonly _email: Email,
    private readonly _roleIds: readonly number[],
    private readonly _lawyerId: number | null,
    private _lastLoginAt: Date | null,
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
    fullName: string;
    email: Email;
    roleIds: readonly number[];
    lawyerId: number | null;
    lastLoginAt: Date | null;
    active: boolean;
  }): User {
    return new User(
      props.id,
      props.username,
      props.passwordHash,
      props.fullName,
      props.email,
      props.roleIds,
      props.lawyerId,
      props.lastLoginAt,
      props.active,
    );
  }

  /**
   * Creates a fresh {@link User}. Validates structural invariants
   * (positive integer ids, non-empty fullName, at least one role,
   * well-formed lawyerId, password policy) and hashes the plain
   * password before storing it.
   *
   * The cross-invariant "roles include ADMINISTRATOR or LAWYER
   * implies lawyerId is not null" (Q-07, D-19, D-25) is not checked
   * here because this factory only receives numeric role ids; the
   * calling use case in HU4 resolves the role names and enforces it.
   *
   * @throws {ValidationError} on structural invariant violations.
   * @throws {WeakPasswordError} if the password does not meet the
   *   policy (D-24: min 8 chars, at least one digit, max 72 bytes).
   */
  static async create(
    props: {
      id: number;
      username: Username;
      plainPassword: string;
      fullName: string;
      email: Email;
      roleIds: readonly number[];
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

    if (!props.fullName || props.fullName.trim().length === 0) {
      throw new ValidationError(
        "INVALID_USER",
        "User must have a non-empty full name.",
      );
    }

    if (!Array.isArray(props.roleIds) || props.roleIds.length === 0) {
      throw new ValidationError(
        "INVALID_USER",
        "User must have at least one role.",
      );
    }

    for (const roleId of props.roleIds) {
      if (!Number.isInteger(roleId) || roleId <= 0) {
        throw new ValidationError(
          "INVALID_USER",
          "Each role id must be a positive integer.",
        );
      }
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
      props.fullName.trim(),
      props.email,
      props.roleIds,
      props.lawyerId,
      null,
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

  /**
   * Records a successful login: returns the previously stored
   * timestamp and updates the internal one to `now`. The returned
   * value is what the login response surfaces to the client (API v2:
   * the *previous* login, not the current one, so users can spot
   * suspicious access).
   */
  registerLogin(now: Date): Date | null {
    const previous = this._lastLoginAt;
    this._lastLoginAt = now;
    return previous;
  }

  get id(): number {
    return this._id;
  }

  get username(): Username {
    return this._username;
  }

  get fullName(): string {
    return this._fullName;
  }

  get email(): Email {
    return this._email;
  }

  get roleIds(): readonly number[] {
    return this._roleIds;
  }

  get lawyerId(): number | null {
    return this._lawyerId;
  }

  get lastLoginAt(): Date | null {
    return this._lastLoginAt;
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
    if (!PASSWORD_DIGIT_REGEX.test(plain)) {
      throw new WeakPasswordError(
        "Password must contain at least one digit.",
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
