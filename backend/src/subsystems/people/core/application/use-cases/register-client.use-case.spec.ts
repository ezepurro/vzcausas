import { ValidationError } from "@shared/domain/domain-error";
import { ClientDniAlreadyExistsError } from "../../domain/errors/people.errors";
import { RegisterClientUseCase } from "./register-client.use-case";
import { FakeClientRepository, FakeClock } from "./test-support/people-fakes";

describe("RegisterClientUseCase", () => {
  const baseCommand = {
    lastName: "BENÍTEZ",
    firstName: "Rodrigo E.",
    dni: "31556208",
  };

  function build(at = new Date("2026-10-07T12:00:00Z")) {
    const clients = new FakeClientRepository();
    const clock = new FakeClock(at);
    return { useCase: new RegisterClientUseCase(clients, clock), clients };
  }

  // CA-8.1 — el cliente queda registrado y disponible para vincularse
  // a causas.
  it("registers the client", async () => {
    const { useCase, clients } = build();

    const { client } = await useCase.execute(baseCommand);

    expect(client.id).toBeGreaterThan(0);
    expect(client.isActive()).toBe(true);
    expect(clients.byId.get(client.id)).toBe(client);
  });

  // CA-8.2 — apellido y nombres en campos separados; la forma
  // "GÓMEZ, Ariel Fernando" la compone la interfaz.
  it("keeps surname and given names apart", async () => {
    const { useCase } = build();

    const { client } = await useCase.execute({
      ...baseCommand,
      lastName: "GÓMEZ",
      firstName: "Ariel Fernando",
    });

    expect(client.lastName).toBe("GÓMEZ");
    expect(client.firstName).toBe("Ariel Fernando");
  });

  // CA-8.3 — se guarda solo con dígitos.
  it("stores the document without its presentation dots", async () => {
    const { useCase } = build();

    const { client } = await useCase.execute({
      ...baseCommand,
      dni: "34.812.905",
    });

    expect(client.dni.toString()).toBe("34812905");
  });

  it("rejects a malformed document", async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ ...baseCommand, dni: "123456" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  // CA-8.4 — documento único entre clientes vigentes.
  describe("document uniqueness (CA-8.4)", () => {
    it("rejects a document a current client already holds", async () => {
      const { useCase } = build();
      await useCase.execute(baseCommand);

      await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(
        ClientDniAlreadyExistsError,
      );
    });

    it("rejects it however the caller spells it", async () => {
      const { useCase } = build();
      await useCase.execute(baseCommand);

      await expect(
        useCase.execute({ ...baseCommand, dni: "31.556.208" }),
      ).rejects.toBeInstanceOf(ClientDniAlreadyExistsError);
    });

    /**
     * The partial index is what makes this possible: a deactivated
     * client releases their document, so the same person can be
     * registered again once HU-11 exists. A plain unique index would
     * make that impossible.
     */
    it("frees the document once the client is deactivated", async () => {
      const { useCase, clients } = build();
      const first = await useCase.execute(baseCommand);
      first.client.deactivate();
      await clients.create(first.client);

      const second = await useCase.execute(baseCommand);

      expect(second.client.id).not.toBe(first.client.id);
      expect(second.client.isActive()).toBe(true);
    });
  });

  // CA-8.5 — teléfono y correo son opcionales.
  it("registers without phone or email", async () => {
    const { useCase } = build();

    const { client } = await useCase.execute(baseCommand);

    expect(client.phone).toBeNull();
    expect(client.email).toBeNull();
  });

  it("stores a blank phone as absent rather than as an empty string", async () => {
    const { useCase } = build();

    const { client } = await useCase.execute({ ...baseCommand, phone: "   " });

    expect(client.phone).toBeNull();
  });

  // CA-8.7 — la fecha de alta la asigna el sistema.
  it("takes the registration date from the clock", async () => {
    const { useCase } = build(new Date("2026-03-14T09:30:00Z"));

    const { client } = await useCase.execute(baseCommand);

    expect(client.clientSince.toISOString().slice(0, 10)).toBe("2026-03-14");
  });

  it("ignores any date the caller tries to supply", async () => {
    const { useCase } = build(new Date("2026-03-14T09:30:00Z"));

    const { client } = await useCase.execute({
      ...baseCommand,
      // El comando no declara el campo; esto imita a un llamador que
      // lo manda igual, para fijar que no se cuela.
      clientSince: new Date("1999-01-01"),
    } as never);

    expect(client.clientSince.toISOString().slice(0, 10)).toBe("2026-03-14");
  });

  // CA-8.8 — el alta no crea ninguna causa (RN1).
  it("creates nothing but the client", async () => {
    const { useCase, clients } = build();

    await useCase.execute(baseCommand);

    expect(clients.byId.size).toBe(1);
  });
});
