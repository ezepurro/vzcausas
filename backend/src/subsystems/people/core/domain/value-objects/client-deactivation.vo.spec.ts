import { ValidationError } from "@shared/domain/domain-error";
import { ClientDeactivation } from "./client-deactivation.vo";

/** HU11, CA-11.5 y CA-11.7: el registro de la baja de un cliente. */
const NOW = new Date("2026-10-07T12:00:00Z");
const context = { deactivatedByUserId: 5, deactivatedAt: NOW };

describe("ClientDeactivation", () => {
  it("registra quién lo dio de baja, cuándo y el motivo recortado (CA-11.5)", () => {
    const deactivation = ClientDeactivation.create({ reason: "  Cliente cargado dos veces.  " }, context);

    expect(deactivation.reason).toBe("Cliente cargado dos veces.");
    expect(deactivation.deactivatedByUserId).toBe(5);
    expect(deactivation.deactivatedAt).toEqual(NOW);
  });

  it.each([
    ["ausente", undefined],
    ["en null", null],
    ["en blanco", "   "],
  ])("el motivo es opcional: %s queda en null (CA-11.7)", (_case, reason) => {
    expect(ClientDeactivation.create({ reason }, context).reason).toBeNull();
  });

  it("acepta 500 caracteres y rechaza 501 con el texto del contrato (CA-11.7)", () => {
    expect(ClientDeactivation.create({ reason: "a".repeat(500) }, context).reason).toHaveLength(500);

    const attempt = () => ClientDeactivation.create({ reason: "a".repeat(501) }, context);
    expect(attempt).toThrow(ValidationError);
    try {
      attempt();
    } catch (error) {
      expect((error as ValidationError).details).toEqual({ reason: "Debe tener hasta 500 caracteres." });
    }
  });

  it("dos registros con los mismos datos son iguales", () => {
    const one = ClientDeactivation.create({ reason: "Duplicado" }, context);

    expect(one.equals(ClientDeactivation.hydrate({ reason: "Duplicado", deactivatedByUserId: 5, deactivatedAt: NOW }))).toBe(true);
    expect(one.equals(ClientDeactivation.create({ reason: null }, context))).toBe(false);
  });
});
