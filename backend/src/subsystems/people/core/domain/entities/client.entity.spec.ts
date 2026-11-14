import { ValidationError } from "@shared/domain/domain-error";
import { EmptyClientUpdateError } from "../errors/people.errors";
import { ClientDeactivation } from "../value-objects/client-deactivation.vo";
import { ClientDocument } from "../value-objects/client-document.vo";
import { Client, ClientChanges } from "./client.entity";

/** HU10 · Modificar cliente (contrato V6 §3.6, D-108, D-109, D-121). */
const aClient = () =>
  Client.hydrate({
    id: 1,
    lastName: "GÓMEZ",
    firstName: "Ariel Fernando",
    document: ClientDocument.create("DNI", "34812905"),
    address: "Bv. San Juan 1240, Córdoba",
    phone: "351 415-2288",
    email: "afgomez@gmail.com",
    clientSince: new Date("2021-03-12T00:00:00.000Z"),
    active: true,
    deactivation: null,
  });

function detailsOf(work: () => unknown): Record<string, unknown> | null {
  try {
    work();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).code).toBe("VALIDATION_ERROR");
    return (error as ValidationError).details;
  }
  throw new Error("Se esperaba un ValidationError.");
}

describe("Client.update", () => {
  // CA-10.1
  it("cambia lo enviado, deja igual lo omitido y devuelve qué campos cambiaron", () => {
    const client = aClient();

    const changes = client.update({ address: "  Av. Colón 500, Córdoba  ", phone: "351 415-2288" });

    expect(client.address).toBe("Av. Colón 500, Córdoba");
    expect(client.lastName).toBe("GÓMEZ");
    expect(client.email).toBe("afgomez@gmail.com");
    // El teléfono vino con el mismo valor: no es un cambio.
    expect(changes.fields).toEqual(["address"]);
    expect(changes.renamesClient()).toBe(false);
  });

  // CA-10.1
  it("el correo en null se borra; el resto en null no se puede vaciar", () => {
    const client = aClient();

    expect(client.update({ email: null }).fields).toEqual(["email"]);
    expect(client.email).toBeNull();
  });

  // CA-10.1
  it("sin ningún campo es 400 sobre el cuerpo", () => {
    expect(() => aClient().update({})).toThrow(EmptyClientUpdateError);
  });

  // CA-10.4
  it.each<[keyof ClientChanges, string]>([
    ["lastName", "El apellido es obligatorio."],
    ["firstName", "Los nombres son obligatorios."],
    ["address", "La dirección es obligatoria."],
    ["phone", "El teléfono es obligatorio."],
  ])("%s vacío, en blanco o en null es 400 con el texto del alta", (field, message) => {
    for (const value of ["", "   ", null]) {
      expect(detailsOf(() => aClient().update({ [field]: value }))).toEqual({ [field]: message });
    }
  });

  // CA-10.4: los topes son los del alta.
  it("reporta todos los errores juntos y no cambia nada", () => {
    const client = aClient();

    const details = detailsOf(() =>
      client.update({ lastName: "", address: "x".repeat(256), phone: "1".repeat(51), documentNumber: "34.812" }),
    );

    expect(details).toEqual({
      lastName: "El apellido es obligatorio.",
      address: "La dirección no puede superar los 255 caracteres.",
      phone: "El teléfono no puede superar los 50 caracteres.",
      documentNumber: "Debe contener 7 u 8 dígitos, sin puntos.",
    });
    expect(client.lastName).toBe("GÓMEZ");
    expect(client.address).toBe("Bv. San Juan 1240, Córdoba");
  });

  // CA-10.3 (D-121)
  describe("documento", () => {
    it("se puede cambiar el tipo y el número juntos", () => {
      const client = aClient();

      const changes = client.update({ documentType: "PASSPORT", documentNumber: "AB123456" });

      expect(client.document.type).toBe("PASSPORT");
      expect(client.document.number).toBe("AB123456");
      expect(changes.fields).toEqual(["documentType", "documentNumber"]);
    });

    it("si se cambia solo el tipo, el número que tenía se valida contra el tipo nuevo", () => {
      const client = Client.hydrate({ ...snapshot(aClient()), document: ClientDocument.create("PASSPORT", "AB123456") });

      expect(detailsOf(() => client.update({ documentType: "DNI" }))).toEqual({
        documentNumber: "Debe contener 7 u 8 dígitos, sin puntos.",
      });
      expect(client.document.type).toBe("PASSPORT");
    });

    it("si se cambia solo el número, se valida contra el tipo que tiene", () => {
      expect(detailsOf(() => aClient().update({ documentNumber: "AB123456" }))).toEqual({
        documentNumber: "Debe contener 7 u 8 dígitos, sin puntos.",
      });
    });

    it("el mismo documento no es un cambio", () => {
      expect(aClient().update({ documentType: "DNI", documentNumber: "34812905" }).isEmpty()).toBe(true);
    });
  });

  // CA-10.9: solo el nombre arrastra las carátulas.
  it("cambiar el apellido o los nombres renombra al cliente; los demás datos no", () => {
    expect(aClient().update({ lastName: "GÓMEZ PAZ" }).renamesClient()).toBe(true);
    expect(aClient().update({ firstName: "Ariel" }).renamesClient()).toBe(true);
    expect(aClient().update({ documentNumber: "34812906", phone: "351 000" }).renamesClient()).toBe(false);
  });

  it("los nombres de un cliente no tienen la regla del tratamiento de los abogados", () => {
    const client = aClient();

    client.update({ firstName: "Dra. Ana" });

    expect(client.firstName).toBe("Dra. Ana");
  });
});

/** HU11 · Registrar baja de cliente (contrato V6 §3.6, D-122). */
describe("Client.deactivate", () => {
  const record = () =>
    ClientDeactivation.create(
      { reason: "Cliente cargado dos veces." },
      { deactivatedByUserId: 9, deactivatedAt: new Date("2026-10-07T12:00:00Z") },
    );

  // CA-11.1, CA-11.5
  it("deja de estar vigente y guarda quién, cuándo y por qué", () => {
    const client = aClient();
    const deactivation = record();

    client.deactivate(deactivation);

    expect(client.isActive()).toBe(false);
    expect(client.deactivation).toBe(deactivation);
  });

  it("un cliente vigente no tiene registro de baja", () => {
    expect(aClient().deactivation).toBeNull();
  });

  it("darlo de baja dos veces es un error de programación: el caso de uso ya respondió 404", () => {
    const client = aClient();
    client.deactivate(record());

    expect(() => client.deactivate(record())).toThrow("was already given de baja");
  });

  it("no se puede reconstruir un cliente dado de baja sin su registro, ni uno vigente con registro", () => {
    expect(() => Client.hydrate({ ...snapshot(aClient()), active: false, deactivation: null })).toThrow();
    expect(() => Client.hydrate({ ...snapshot(aClient()), active: true, deactivation: record() })).toThrow();
  });
});

function snapshot(client: Client) {
  return {
    id: client.id,
    lastName: client.lastName,
    firstName: client.firstName,
    document: client.document,
    address: client.address,
    phone: client.phone,
    email: client.email,
    clientSince: client.clientSince,
    active: client.isActive(),
    deactivation: client.deactivation,
  };
}
