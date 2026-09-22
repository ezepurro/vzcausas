import { ValidationError } from "@shared/domain/domain-error";

const USERNAME_REGEX = /^[a-z0-9._-]{3,50}$/;

/**
 * Login identifier of a {@link User}. Value object: any `Username`
 * instance in memory is guaranteed to be well-formed because
 * {@link Username.create} is the only construction path.
 *
 * Normalization is applied before validation: input is trimmed and
 * lowercased, so `Admin ` and `admin` refer to the same user (D-17).
 */
export class Username {
  private constructor(private readonly value: string) {}

  /**
   * Validates and normalizes a raw string into a {@link Username}.
   * Trims surrounding whitespace and lowercases before checking
   * against the allowed pattern (3–50 chars of `[a-z0-9._-]`).
   *
   * @throws {ValidationError} if the input is not a string, is
   *   outside the allowed length, or contains disallowed characters.
   */
  static create(raw: string): Username {
    if (typeof raw != "string") {
      throw new ValidationError(
        "INVALID_USERNAME",
        "Username must be a string.",
      );
    }

    const normalized = raw.trim().toLowerCase();
    if (!USERNAME_REGEX.test(normalized)) {
      throw new ValidationError(
        "INVALID_USERNAME",
        "Username must be between 3 and 50 characters and contain only lowercase letters, digits, dots, hyphens or underscores.",
      );
    }

    return new Username(normalized);
  }

  toString(): string {
    return this.value;
  }

  /** Value equality: two usernames are equal iff their normalized strings match. */
  equals(other: Username): boolean {
    return this.value === other.value;
  }
}
