import { ValidationError } from "@shared/domain/domain-error";

export const DOCUMENT_TYPES = ["DNI", "PASSPORT"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/**
 * The format of `documentNumber` for each type (API contract, `DocumentType`,
 * D-108). It mirrors the database's own `ck_clients_document_format` CHECK, so
 * the two cannot drift apart. The HTTP layer reads it from here too.
 */
export const DOCUMENT_NUMBER_FORMATS: Record<
  DocumentType,
  { pattern: RegExp; message: string }
> = {
  DNI: {
    pattern: /^[0-9]{7,8}$/,
    message: "Debe contener 7 u 8 dígitos, sin puntos.",
  },
  PASSPORT: {
    pattern: /^[A-Z0-9]{6,20}$/,
    message:
      "Debe contener de 6 a 20 letras mayúsculas y dígitos, sin espacios.",
  },
};

export function isDocumentType(value: unknown): value is DocumentType {
  return (DOCUMENT_TYPES as readonly unknown[]).includes(value);
}

/**
 * A client's identity document: its type and its number (D-108).
 *
 * The familiar `34.812.905` is a **presentation** format: the dots are
 * separators the interface adds, never part of the value. They are stripped on
 * the way in so that `34.812.905` and `34812905` cannot end up as two
 * different clients, which is what the uniqueness rule (CA-8.4) prevents. A
 * passport is kept in capitals and without spaces for the same reason.
 *
 * Uniqueness is per type: a DNI and a passport with the same number are two
 * different documents.
 *
 * Value object: any instance in memory is well-formed, because
 * {@link ClientDocument.create} is the only construction path.
 */
export class ClientDocument {
  private constructor(
    private readonly _type: DocumentType,
    private readonly _number: string,
  ) {}

  /**
   * @throws {ValidationError} `INVALID_DOCUMENT_TYPE` if the type is not one of
   *   {@link DOCUMENT_TYPES}; `INVALID_DOCUMENT` if the number is not a string
   *   or does not have the format of its type.
   */
  static create(type: unknown, raw: unknown): ClientDocument {
    if (!isDocumentType(type)) {
      throw new ValidationError(
        "INVALID_DOCUMENT_TYPE",
        "El tipo de documento debe ser DNI o PASSPORT.",
        { field: "documentType" },
      );
    }

    const format = DOCUMENT_NUMBER_FORMATS[type];
    if (typeof raw !== "string") {
      throw new ValidationError("INVALID_DOCUMENT", format.message, {
        field: "documentNumber",
      });
    }

    const normalized =
      type === "DNI"
        ? raw.trim().replace(/[.\s-]/g, "")
        : raw.replace(/\s/g, "").toUpperCase();
    if (!format.pattern.test(normalized)) {
      throw new ValidationError("INVALID_DOCUMENT", format.message, {
        field: "documentNumber",
      });
    }

    return new ClientDocument(type, normalized);
  }

  get type(): DocumentType {
    return this._type;
  }

  get number(): string {
    return this._number;
  }

  toString(): string {
    return this._number;
  }

  equals(other: ClientDocument): boolean {
    return this._type === other._type && this._number === other._number;
  }
}
