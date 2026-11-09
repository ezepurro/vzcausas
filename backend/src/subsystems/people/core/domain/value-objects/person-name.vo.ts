import { ValidationError } from "@shared/domain/domain-error";

const MAX_LENGTH = 100;
const INVALID_DATA_MESSAGE = "Los datos enviados no son válidos.";

/** Which half of a person's name: the two are validated alike, with their own messages. */
export type PersonNameField = "lastName" | "firstName";

const REQUIRED_MESSAGE: Record<PersonNameField, string> = {
  lastName: "El apellido es obligatorio.",
  firstName: "Los nombres son obligatorios.",
};

/**
 * "Dr.", "Dra.", with or without the dot, as a word of its own: "Dra. Malena",
 * "Malena Dr". The title is not part of the name since V4 (D-81): the
 * frontend adds it. A name that merely contains the letters ("Adriana") is fine.
 */
const TITLE = /(^|\s)dra?\.?(?=\s|$)/i;

/**
 * A lawyer's last name or first names, as the "Modificar abogado" form keeps
 * them (HU14, contract V5 `PATCH /lawyers/{lawyerId}`).
 *
 * Value object: no identity, validated when built, so every instance in memory
 * is a usable name. `create` trims it and rejects it if it is missing, blank or
 * too long (CA-14.4); first names also may not carry the "Dr."/"Dra." title
 * (CA-14.9).
 *
 * It reports its error under its own field, as a `VALIDATION_ERROR` with
 * `details`, so whoever validates several fields at once (`Lawyer.update`)
 * can gather them into one response.
 */
export class PersonName {
  private constructor(private readonly value: string) {}

  /**
   * `null`, `undefined`, empty and blank are the same thing to the user: the
   * field was left empty.
   * @throws {ValidationError} `VALIDATION_ERROR` with `{ [field]: message }`.
   */
  static create(field: PersonNameField, raw: string | null | undefined): PersonName {
    const name = typeof raw === "string" ? raw.trim() : "";

    if (name === "") {
      throw PersonName.invalid(field, REQUIRED_MESSAGE[field]);
    }
    if (name.length > MAX_LENGTH) {
      throw PersonName.invalid(field, `Debe tener como máximo ${MAX_LENGTH} caracteres.`);
    }
    if (field === "firstName" && TITLE.test(name)) {
      throw PersonName.invalid(field, "Los nombres no llevan el tratamiento (Dr., Dra.).");
    }

    return new PersonName(name);
  }

  private static invalid(field: PersonNameField, message: string): ValidationError {
    return new ValidationError("VALIDATION_ERROR", INVALID_DATA_MESSAGE, { [field]: message });
  }

  toString(): string {
    return this.value;
  }

  equals(other: PersonName): boolean {
    return this.value === other.value;
  }
}
