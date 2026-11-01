import { ValidationError } from "@shared/domain/domain-error";
import { EmptyLawyerUpdateError } from "../errors/people.errors";
import { RegistrationNumber } from "../value-objects/registration-number.vo";
import { Lawyer, LawyerChanges } from "./lawyer.entity";

/* HU14 · Modificar abogado: las reglas de `Lawyer.update`. */

const aLawyer = () =>
  Lawyer.hydrate({
    id: 4,
    lastName: "Ríos",
    firstName: "Malena",
    registrationNumber: RegistrationNumber.create("1-28114"),
    active: true,
  });

const snapshot = (lawyer: Lawyer) => ({
  lastName: lawyer.lastName,
  firstName: lawyer.firstName,
  registrationNumber: lawyer.registrationNumber.toString(),
});

function detailsOf(lawyer: Lawyer, changes: LawyerChanges): Record<string, unknown> | null {
  try {
    lawyer.update(changes);
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).code).toBe("VALIDATION_ERROR");
    return (error as ValidationError).details;
  }
  throw new Error("Se esperaba un ValidationError.");
}

describe("Lawyer.update", () => {
  // CA-14.1
  it("cambia los tres datos, sin espacios sobrantes, y dice qué cambió", () => {
    const lawyer = aLawyer();

    const changes = lawyer.update({ lastName: " Peralta ", firstName: "Ignacio", registrationNumber: "1-40000" });

    expect(snapshot(lawyer)).toEqual({ lastName: "Peralta", firstName: "Ignacio", registrationNumber: "1-40000" });
    expect(changes.fields).toEqual(["lastName", "firstName", "registrationNumber"]);
  });

  it("toca solo los campos enviados", () => {
    const lawyer = aLawyer();

    const changes = lawyer.update({ firstName: "Malena Sofía" });

    expect(snapshot(lawyer)).toEqual({ lastName: "Ríos", firstName: "Malena Sofía", registrationNumber: "1-28114" });
    expect(changes.fields).toEqual(["firstName"]);
  });

  // CA-14.7
  it("enviar el valor que ya tiene no es un cambio", () => {
    const changes = aLawyer().update({ lastName: "Ríos", registrationNumber: " 1-28114 " });

    expect(changes.isEmpty()).toBe(true);
  });

  // CA-14.12: el nombre cambió, la carpeta en Drive tiene que seguirlo
  it.each<[LawyerChanges, boolean]>([
    [{ lastName: "Peralta" }, true],
    [{ firstName: "Ignacio" }, true],
    [{ registrationNumber: "1-40000" }, false],
    [{ lastName: "Ríos" }, false],
  ])("con %j, ¿renombra al abogado? %s", (changes, renames) => {
    expect(aLawyer().update(changes).renamesLawyer()).toBe(renames);
  });

  // CA-14.4, CA-14.8, CA-14.9
  it("informa todos los campos inválidos juntos y no aplica ninguno", () => {
    const lawyer = aLawyer();

    const details = detailsOf(lawyer, { lastName: "  ", firstName: "Dra. Malena", registrationNumber: "28114" });

    expect(details).toEqual({
      lastName: "El apellido es obligatorio.",
      firstName: "Los nombres no llevan el tratamiento (Dr., Dra.).",
      registrationNumber: "El formato de la matrícula no es válido.",
    });
    expect(snapshot(lawyer)).toEqual(snapshot(aLawyer()));
  });

  it("un campo inválido impide aplicar los válidos", () => {
    const lawyer = aLawyer();

    detailsOf(lawyer, { lastName: "Peralta", registrationNumber: "" });

    expect(lawyer.lastName).toBe("Ríos");
  });

  // CA-14.4: null es vaciar el campo
  it.each<[LawyerChanges, Record<string, string>]>([
    [{ lastName: null }, { lastName: "El apellido es obligatorio." }],
    [{ firstName: null }, { firstName: "Los nombres son obligatorios." }],
    [{ registrationNumber: null }, { registrationNumber: "La matrícula es obligatoria." }],
    [{ registrationNumber: "   " }, { registrationNumber: "La matrícula es obligatoria." }],
  ])("%j no se puede vaciar", (changes, expected) => {
    expect(detailsOf(aLawyer(), changes)).toEqual(expected);
  });

  // CA-14.10
  it("sin ningún campo es un error propio", () => {
    expect(() => aLawyer().update({})).toThrow(EmptyLawyerUpdateError);
    expect(detailsOf(aLawyer(), {})).toEqual({ body: "Debe enviarse al menos un campo para modificar." });
  });
});
