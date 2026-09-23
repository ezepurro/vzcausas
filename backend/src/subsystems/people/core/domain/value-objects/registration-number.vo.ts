import { ValidationError } from "@shared/domain/domain-error";

const REGISTRATION_NUMBER_REGEX = /^\d+-\d+$/;

/**
 * A lawyer's bar registration number ("matrícula"), in the format
 * used by the Colegio de Abogados de Córdoba: circuit and number
 * separated by a hyphen, e.g. `1-28114` (API contract §3.3).
 *
 * Value object: any instance in memory is well-formed, because
 * {@link RegistrationNumber.create} is the only construction path.
 * Input is trimmed; equality is defined on the normalized value.
 *
 * The regex deliberately does not bound the number of digits — the
 * contract fixes the shape, not the length, and inventing a limit
 * here would reject valid matrículas for no reason.
 */
export class RegistrationNumber {
  private constructor(private readonly value: string) {}

  /**
   * @throws {ValidationError} if the input is not a string or does
   *   not match `<circuit>-<number>`.
   */
  static create(raw: string): RegistrationNumber {
    if (typeof raw !== "string") {
      throw new ValidationError(
        "INVALID_REGISTRATION_NUMBER",
        "Registration number must be a string.",
      );
    }

    const normalized = raw.trim();
    if (!REGISTRATION_NUMBER_REGEX.test(normalized)) {
      throw new ValidationError(
        "INVALID_REGISTRATION_NUMBER",
        "Registration number must follow the `<circuit>-<number>` format (e.g. `1-28114`).",
      );
    }

    return new RegistrationNumber(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: RegistrationNumber): boolean {
    return this.value === other.value;
  }
}
