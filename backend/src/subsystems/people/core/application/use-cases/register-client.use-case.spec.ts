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

  // CA-8.2 (apellido y nombres separados) lo fija la forma del recurso en
  // `clients.int.spec.ts`; CA-8.3 (sólo dígitos), `dni.vo.spec.ts`. Acá, que el
  // value object está conectado: un DNI mal formado no llega al repositorio.
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

  // CA-8.5 — teléfono y correo son opcionales; un teléfono en blanco queda ausente.
  it("registers without phone or email, and stores a blank phone as absent", async () => {
    const { useCase } = build();

    const { client } = await useCase.execute(baseCommand);
    const { client: blank } = await useCase.execute({ ...baseCommand, dni: "29440117", phone: "   " });

    expect(client.phone).toBeNull();
    expect(client.email).toBeNull();
    expect(blank.phone).toBeNull();
  });

  // CA-8.7 — la fecha de alta la asigna el sistema, aunque el llamador mande otra.
  it("takes the registration date from the clock and ignores any the caller supplies", async () => {
    const { useCase } = build(new Date("2026-03-14T09:30:00Z"));

    const { client } = await useCase.execute({
      ...baseCommand,
      // El comando no declara el campo; esto imita a un llamador que
      // lo manda igual, para fijar que no se cuela.
      clientSince: new Date("1999-01-01"),
    } as never);

    expect(client.clientSince.toISOString().slice(0, 10)).toBe("2026-03-14");
  });
});
