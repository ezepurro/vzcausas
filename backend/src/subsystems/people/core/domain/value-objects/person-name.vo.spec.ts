import { ValidationError } from "@shared/domain/domain-error";
import { PersonName, PersonNameField } from "./person-name.vo";

function detailsOf(field: PersonNameField, raw: string | null | undefined): Record<string, unknown> | null {
  try {
    PersonName.create(field, raw);
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).code).toBe("VALIDATION_ERROR");
    return (error as ValidationError).details;
  }
  throw new Error("Se esperaba un ValidationError.");
}

describe("PersonName", () => {
  it("recorta los espacios de los extremos", () => {
    expect(PersonName.create("lastName", "  Peralta  ").toString()).toBe("Peralta");
  });

  // CA-14.4
  it.each([["vacío", ""], ["solo espacios", "   "], ["null", null], ["ausente", undefined]])(
    "un apellido %s es obligatorio",
    (_case, raw) => {
      expect(detailsOf("lastName", raw)).toEqual({ lastName: "El apellido es obligatorio." });
    },
  );

  it("unos nombres vacíos son obligatorios, con su propio texto", () => {
    expect(detailsOf("firstName", " ")).toEqual({ firstName: "Los nombres son obligatorios." });
  });

  it("admite hasta 100 caracteres", () => {
    expect(PersonName.create("lastName", "a".repeat(100)).toString()).toHaveLength(100);
    expect(detailsOf("lastName", "a".repeat(101))).toEqual({ lastName: "Debe tener como máximo 100 caracteres." });
  });

  // CA-14.9
  it.each(["Dr. Ignacio", "Dra. Malena", "dra Malena", "Malena Dr.", "DR."])(
    'rechaza el tratamiento en los nombres: "%s"',
    (raw) => {
      expect(detailsOf("firstName", raw)).toEqual({ firstName: "Los nombres no llevan el tratamiento (Dr., Dra.)." });
    },
  );

  it.each(["Adriana", "Drago", "Isidro"])('un nombre que solo contiene esas letras sí va: "%s"', (raw) => {
    expect(PersonName.create("firstName", raw).toString()).toBe(raw);
  });

  it("es igual a otro con el mismo valor", () => {
    expect(PersonName.create("lastName", "Peralta").equals(PersonName.create("lastName", " Peralta "))).toBe(true);
    expect(PersonName.create("lastName", "Peralta").equals(PersonName.create("lastName", "Ríos"))).toBe(false);
  });
});
