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
  registrationNumber: lawyer.registrationNumber?.toString() ?? null,
});

const aLawyerWithoutRegistration = () =>
  Lawyer.hydrate({ id: 5, lastName: "Gómez", firstName: "Ana", registrationNumber: null, active: true });

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

    detailsOf(lawyer, { lastName: "Peralta", registrationNumber: "28114" });

    expect(lawyer.lastName).toBe("Ríos");
  });

  // CA-14.4: null es vaciar el campo (el apellido y los nombres siguen siendo obligatorios)
  it.each<[LawyerChanges, Record<string, string>]>([
    [{ lastName: null }, { lastName: "El apellido es obligatorio." }],
    [{ firstName: null }, { firstName: "Los nombres son obligatorios." }],
  ])("%j no se puede vaciar", (changes, expected) => {
    expect(detailsOf(aLawyer(), changes)).toEqual(expected);
  });

  // D-107: la matrícula es opcional; vacía, en blanco o null la borra
  describe("matrícula opcional (D-107)", () => {
    it.each<[string, LawyerChanges]>([
      ["null", { registrationNumber: null }],
      ["vacía", { registrationNumber: "" }],
      ["en blanco", { registrationNumber: "   " }],
    ])("enviarla %s la borra y cuenta como cambio", (_, changes) => {
      const lawyer = aLawyer();

      const result = lawyer.update(changes);

      expect(lawyer.registrationNumber).toBeNull();
      expect(result.fields).toEqual(["registrationNumber"]);
    });

    it("borrarla en quien no la tiene no es un cambio", () => {
      const result = aLawyerWithoutRegistration().update({ registrationNumber: null });

      expect(result.isEmpty()).toBe(true);
    });

    it("se puede cargar después en quien no la tenía", () => {
      const lawyer = aLawyerWithoutRegistration();

      const result = lawyer.update({ registrationNumber: "1-40000" });

      expect(lawyer.registrationNumber?.toString()).toBe("1-40000");
      expect(result.fields).toEqual(["registrationNumber"]);
    });

    it("sigue rechazando una matrícula con formato inválido", () => {
      expect(detailsOf(aLawyerWithoutRegistration(), { registrationNumber: "28114" })).toEqual({
        registrationNumber: "El formato de la matrícula no es válido.",
      });
    });

    it("un abogado se crea sin matrícula", () => {
      const lawyer = Lawyer.create({ id: 6, lastName: "Gómez", firstName: "Ana" });

      expect(lawyer.registrationNumber).toBeNull();
    });
  });

  // CA-14.10
  it("sin ningún campo es un error propio", () => {
    expect(() => aLawyer().update({})).toThrow(EmptyLawyerUpdateError);
    expect(detailsOf(aLawyer(), {})).toEqual({ body: "Debe enviarse al menos un campo para modificar." });
  });
});
