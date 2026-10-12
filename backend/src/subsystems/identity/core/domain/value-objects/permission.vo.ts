import { ValidationError } from "@shared/domain/domain-error";

const PERMISSION_REGEX = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;

/**
 * A single permission entry. Value object wrapping a validated
 * `namespace:action` string (for example `case:change-status`).
 *
 * The name is what the login/refresh HTTP responses expose under
 * `permissions[]` (contract §3.1), which is why identity and equality
 * are defined by the string value and not by any database id. It no
 * longer travels inside the access token itself — see
 * `AccessTokenClaims` for why — but the string is still the
 * authoritative, stable identifier a client matches against.
 */
export class Permission {
  private constructor(private readonly value: string) {}

  /**
   * Validates the raw permission string. Format is `namespace:action`
   * where each segment starts with a lowercase letter and contains
   * only lowercase letters, digits and hyphens.
   *
   * @throws {ValidationError} if the input does not match the format.
   */
  static create(raw: string): Permission {
    if (typeof raw !== "string" || !PERMISSION_REGEX.test(raw)) {
      throw new ValidationError(
        "INVALID_PERMISSION",
        "Permission must follow the `namespace:action` format (e.g. `case:change-status`).",
      );
    }

    return new Permission(raw);
  }

  getName(): string {
    return this.value;
  }

  equals(other: Permission): boolean {
    return this.value === other.value;
  }
}
