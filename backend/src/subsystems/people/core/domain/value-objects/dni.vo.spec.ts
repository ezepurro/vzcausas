import { ValidationError } from "@shared/domain/domain-error";
import { Dni } from "./dni.vo";

describe("Dni", () => {
  // CA-8.3 — se guarda solo con dígitos; el formato con puntos es de
  // presentación.
  it("strips the presentation dots", () => {
    expect(Dni.create("34.812.905").toString()).toBe("34812905");
  });

  it("trims surrounding whitespace", () => {
    expect(Dni.create("  31556208  ").toString()).toBe("31556208");
  });

  it.each(["1234567", "12345678"])("accepts %s digits", (raw) => {
    expect(Dni.create(raw).toString()).toBe(raw);
  });

  it.each([
    ["123456", "six digits"],
    ["123456789", "nine digits"],
    ["", "empty"],
    ["3481290A", "a letter"],
  ])("rejects %s (%s)", (raw) => {
    expect(() => Dni.create(raw)).toThrow(ValidationError);
  });

  /**
   * The point of normalizing: these two spellings are one document,
   * and treating them as different would let the uniqueness rule
   * (CA-8.4) be bypassed by typing dots.
   */
  it("considers the dotted and plain spellings equal", () => {
    expect(Dni.create("34.812.905").equals(Dni.create("34812905"))).toBe(true);
  });

  it("names the offending field so the frontend can mark it", () => {
    expect(() => Dni.create("abc")).toThrow(
      expect.objectContaining({ details: { field: "dni" } }),
    );
  });
});
