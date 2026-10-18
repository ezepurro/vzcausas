import { ValidationError } from "@shared/domain/domain-error";

const DNI_REGEX = /^[0-9]{7,8}$/;

/**
 * A client's national identity document (DNI), stored as digits only
 * (API contract §3.6, CA-8.3).
 *
 * The familiar `34.812.905` is a **presentation** format: the dots
 * are separators the interface adds, never part of the value. They
 * are stripped on the way in so that `34.812.905` and `34812905`
 * cannot end up as two different clients — which is exactly what the
 * uniqueness rule (CA-8.4) is there to prevent.
 *
 * Value object: any instance in memory is well-formed, because
 * {@link Dni.create} is the only construction path. Equality is
 * defined on the normalized value.
 *
 * The 7-to-8 digit range mirrors the database's own
 * `ck_clients_dni_format` CHECK, so the two cannot drift apart.
 */
export class Dni {
  private constructor(private readonly value: string) {}

  /**
   * Strips dots, spaces and hyphens before validating, so the value
   * object accepts what a human would type and stores what the
   * contract requires.
   *
   * @throws {ValidationError} if the input is not a string, or does
   *   not reduce to 7 or 8 digits.
   */
  static create(raw: string): Dni {
    if (typeof raw !== "string") {
      throw new ValidationError(
        "INVALID_DNI",
        "El documento debe ser una cadena de texto.",
      );
    }

    const normalized = raw.trim().replace(/[.\s-]/g, "");
    if (!DNI_REGEX.test(normalized)) {
      throw new ValidationError(
        "INVALID_DNI",
        "El documento debe contener 7 u 8 dígitos, sin puntos.",
        { field: "dni" },
      );
    }

    return new Dni(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Dni): boolean {
    return this.value === other.value;
  }
}
