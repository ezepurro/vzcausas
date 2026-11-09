import { ValidationError } from "@shared/domain/domain-error";
import { ClientDocument } from "./client-document.vo";

describe("ClientDocument", () => {
  describe("DNI", () => {
    it("strips the dots of the presentation format (CA-8.3)", () => {
      expect(ClientDocument.create("DNI", "34.812.905").number).toBe("34812905");
    });

    it("trims the surrounding spaces", () => {
      expect(ClientDocument.create("DNI", "  31556208  ").number).toBe("31556208");
    });

    it.each(["1234567", "12345678"])("accepts %s (7 or 8 digits)", (raw) => {
      expect(ClientDocument.create("DNI", raw).number).toBe(raw);
    });

    it.each(["123456", "123456789", "abc", "", "1234567A"])(
      "rejects %j with the message of its format (D-108)",
      (raw) => {
        expect(() => ClientDocument.create("DNI", raw)).toThrow(
          expect.objectContaining({
            code: "INVALID_DOCUMENT",
            message: "Debe contener 7 u 8 dígitos, sin puntos.",
            details: { field: "documentNumber" },
          }),
        );
      },
    );
  });

  describe("PASSPORT", () => {
    it("keeps capitals and digits as they come", () => {
      expect(ClientDocument.create("PASSPORT", "AAE482915").number).toBe("AAE482915");
    });

    it("uppercases and removes the spaces, so `aae 482915` is `AAE482915`", () => {
      expect(ClientDocument.create("PASSPORT", " aae 482915 ").number).toBe("AAE482915");
    });

    it.each(["AB123", "A".repeat(21), "AAE-48291", "AAE4829$"])(
      "rejects %j with the message of its format (D-108)",
      (raw) => {
        expect(() => ClientDocument.create("PASSPORT", raw)).toThrow(
          expect.objectContaining({
            code: "INVALID_DOCUMENT",
            message: "Debe contener de 6 a 20 letras mayúsculas y dígitos, sin espacios.",
          }),
        );
      },
    );

    it("accepts letters, which a DNI never does", () => {
      expect(() => ClientDocument.create("DNI", "AAE482915")).toThrow(ValidationError);
      expect(() => ClientDocument.create("PASSPORT", "AAE482915")).not.toThrow();
    });
  });

  it.each(["CUIT", "", undefined, null])(
    "rejects the type %j (D-108)",
    (type) => {
      expect(() => ClientDocument.create(type, "31556208")).toThrow(
        expect.objectContaining({
          code: "INVALID_DOCUMENT_TYPE",
          details: { field: "documentType" },
        }),
      );
    },
  );

  it("rejects a number that is not a string", () => {
    expect(() => ClientDocument.create("DNI", 31556208)).toThrow(ValidationError);
  });

  describe("equals", () => {
    it("is true for the same document written in two spellings (CA-8.4)", () => {
      expect(
        ClientDocument.create("DNI", "34.812.905").equals(ClientDocument.create("DNI", "34812905")),
      ).toBe(true);
    });

    it("is false when only the type differs: uniqueness is per type (D-108)", () => {
      expect(
        ClientDocument.create("DNI", "34812905").equals(ClientDocument.create("PASSPORT", "34812905")),
      ).toBe(false);
    });
  });
});
