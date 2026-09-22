import { ValidationError } from "@shared/domain/domain-error";

const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

/**
 * Email address of a {@link User}. Value object: any `Email` instance
 * in memory is guaranteed to be well-formed because
 * {@link Email.create} is the only construction path.
 *
 * Input is trimmed and lowercased before validation; equality is
 * defined on the normalized value, so `A@B.com` and `a@b.com` refer
 * to the same address.
 */
export class Email {
  private constructor(private readonly value: string) {}

  /**
   * Validates and normalizes a raw string into an {@link Email}.
   * Uses a pragmatic pattern, not RFC 5322 in full.
   *
   * @throws {ValidationError} if the input is not a string or does
   *   not match the format `<local>@<domain>.<tld>`.
   */
  static create(raw: string): Email {
    if (typeof raw !== "string") {
      throw new ValidationError("INVALID_EMAIL", "Email must be a string.");
    }
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      throw new ValidationError("INVALID_EMAIL", "Email format is invalid.");
    }
    return new Email(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
