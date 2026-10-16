import { ValidationError } from "@shared/domain/domain-error";
import {
  InvalidCurrentPasswordError,
  SamePasswordError,
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
    private _username: Username,
    private _passwordHash: string,
    private _lastName: string,
    private _firstName: string,
    private _email: Email,
    private _roleIds: readonly number[],
    private _lawyerId: number | null,
    private _lastLoginAt: Date | null,
    private _active: boolean,
    private _deletedAt: Date | null,
  ) {}

  /**
   * Rebuilds a {@link User} from persisted data. Skips creation-time
   * validation because the database is trusted to hold well-formed
   * records.
   *
   * `deletedAt` is required, not optional, on purpose: an optional field
   * would let a mapper forget it and silently rebuild every deactivated
   * user with no date — the very bug CA-7.1 was about.
   */
  static hydrate(props: {
    id: number;
    username: Username;
    passwordHash: string;
    lastName: string;
    firstName: string;
    email: Email;
    roleIds: readonly number[];
    lawyerId: number | null;
    lastLoginAt: Date | null;
    active: boolean;
    deletedAt: Date | null;
  }): User {
    return new User(
      props.id,
      props.username,
      props.passwordHash,
      props.lastName,
      props.firstName,
      props.email,
      props.roleIds,
      props.lawyerId,
      props.lastLoginAt,
      props.active,
      props.deletedAt,
    );
  }

  /**
   * Creates a fresh {@link User}. Validates structural invariants
   * (positive integer ids, non-empty last and first names, at least one role,
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
      lastName: string;
      firstName: string;
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

    const lastName = User.requireName(props.lastName, "lastName");
    const firstName = User.requireName(props.firstName, "firstName");

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
      lastName,
      firstName,
      props.email,
      props.roleIds,
      props.lawyerId,
      null,
      props.active ?? true,
      null,
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
   * @throws {SamePasswordError} if `newPlain` is the current password
   *   (CA-3.5).
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

    // CA-3.5. Compared against the stored hash rather than against
    // `currentPlain`, so the rule also holds when the caller is wrong
    // about what their current password is — and because a change
    // that changes nothing is what the criterion refuses, regardless
    // of how the request was phrased.
    //
    // The frontend checks this too, but that check is a courtesy: it
    // lives in the browser and anything that talks to the API
    // directly bypasses it.
    if (await hasher.verify(newPlain, this._passwordHash)) {
      throw new SamePasswordError();
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

  /**
   * HU6 — the following methods back `PATCH /users/{userId}`. Each
   * validates only its own local format invariant (mirroring the
   * checks in {@link User.create}). The LAWYER↔lawyerId cross-role
   * invariant is, as with {@link User.create}, left to the calling
   * use case — it needs the resolved role names, which this entity
   * does not have.
   */
  changeUsername(newUsername: Username): void {
    this._username = newUsername;
  }

  /**
   * Last name and first names travel separately since API Contract V4
   * (D-68), and `PATCH` accepts either one alone: an absent field keeps
   * its current value. Both are validated before either is applied, so
   * a rejected change leaves the user untouched.
   */
  rename(names: { lastName?: string; firstName?: string }): void {
    const lastName =
      names.lastName === undefined
        ? this._lastName
        : User.requireName(names.lastName, "lastName");
    const firstName =
      names.firstName === undefined
        ? this._firstName
        : User.requireName(names.firstName, "firstName");
    this._lastName = lastName;
    this._firstName = firstName;
  }

  changeEmail(newEmail: Email): void {
    this._email = newEmail;
  }

  changeRoles(newRoleIds: readonly number[]): void {
    if (!Array.isArray(newRoleIds) || newRoleIds.length === 0) {
      throw new ValidationError(
        "INVALID_USER",
        "User must have at least one role.",
      );
    }
    for (const roleId of newRoleIds) {
      if (!Number.isInteger(roleId) || roleId <= 0) {
        throw new ValidationError(
          "INVALID_USER",
          "Each role id must be a positive integer.",
        );
      }
    }
    this._roleIds = newRoleIds;
  }

  /**
   * HU7 — logical deletion (RN12). The record is kept; the vigency
   * flag flips and the moment is recorded (CA-7.1). There is
   * deliberately no counterpart: *"No existe forma de consultarlo ni de
   * reactivarlo desde la API"* (API contract §3.2,
   * `DELETE /users/{userId}`).
   *
   * `now` is a parameter rather than read from a clock in here: the
   * entity stays free of ambient time, exactly as
   * {@link User.registerLogin} does, and the use case passes the
   * instant from the injected `ClockPort`.
   *
   * Whether an already-deactivated user may be deactivated again is
   * not this entity's call — the use case rejects that as "not
   * found", the same way {@link GetUserUseCase} does.
   *
   * The timestamp is *not* what decides vigency — `active` is. Two
   * columns describing one fact can disagree, and when they do the
   * boolean is the one every query already filters on. `deletedAt`
   * answers "when", never "whether".
   */
  deactivate(now: Date): void {
    this._active = false;
    this._deletedAt = now;
  }

  changeLawyerId(newLawyerId: number | null): void {
    if (
      newLawyerId !== null &&
      (!Number.isInteger(newLawyerId) || newLawyerId <= 0)
    ) {
      throw new ValidationError(
        "INVALID_USER",
        "lawyerId must be a positive integer or null.",
      );
    }
    this._lawyerId = newLawyerId;
  }

  get id(): number {
    return this._id;
  }

  /**
   * When the user was deactivated, or `null` while they are active
   * (CA-7.1). Internal to the server: the contract exposes no such
   * field, because for the client a deactivated user does not exist
   * at all (§4, "Bajas").
   */
  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  get username(): Username {
    return this._username;
  }

  get lastName(): string {
    return this._lastName;
  }

  get firstName(): string {
    return this._firstName;
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

  /**
   * Exposes the stored hash for persistence adapters only (HU4:
   * `PrismaUserRepository.create/save` need it to write the row).
   * Deliberately not named `passwordHash` — that name is reserved to
   * signal "do not read this casually"; only repository code should
   * call this.
   */
  hashForPersistence(): string {
    return this._passwordHash;
  }

  /**
   * Trims a last name or first names and rejects it when blank, naming
   * the offending field in the error details (same rule as `Client`).
   */
  private static requireName(
    value: string,
    field: "lastName" | "firstName",
  ): string {
    const trimmed = value?.trim() ?? "";
    if (trimmed.length === 0) {
      throw new ValidationError(
        "INVALID_USER",
        field === "lastName"
          ? "User must have a non-empty last name."
          : "User must have non-empty first names.",
        { field },
      );
    }
    return trimmed;
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
      throw new WeakPasswordError("Password must contain at least one digit.");
    }
    const byteLength = Buffer.byteLength(plain, "utf8");
    if (byteLength > MAX_PASSWORD_BYTES) {
      throw new WeakPasswordError(
        `Password must not exceed ${MAX_PASSWORD_BYTES} bytes in UTF-8.`,
      );
    }
  }
}
