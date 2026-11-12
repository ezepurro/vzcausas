import { ValidationError } from "@shared/domain/domain-error";
import { ClientDniAlreadyExistsError } from "../../domain/errors/people.errors";
import { RegisterClientUseCase } from "./register-client.use-case";
import { FakeClientRepository, FakeClock } from "./test-support/people-fakes";

describe("RegisterClientUseCase", () => {
  const baseCommand = {
    lastName: "BENÍTEZ",
    firstName: "Rodrigo E.",
    documentType: "DNI",
    documentNumber: "31556208",
    address: "Av. Rafael Núñez 4560, Córdoba",
    phone: "351 401-5573",
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
  // `clients.int.spec.ts`; CA-8.3 (formato), `client-document.vo.spec.ts`. Acá, que el
  // value object está conectado: un documento mal formado no llega al repositorio.
  it("rejects a malformed document", async () => {
    const { useCase } = build();

    await expect(
      useCase.execute({ ...baseCommand, documentNumber: "123456" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  // D-108 — el cliente se puede identificar con pasaporte (clientes extranjeros).
  it("registers a client identified by passport (D-108)", async () => {
    const { useCase } = build();

    const { client } = await useCase.execute({
      ...baseCommand,
      documentType: "PASSPORT",
      documentNumber: "aae 482915",
    });

    expect(client.document.type).toBe("PASSPORT");
    expect(client.document.number).toBe("AAE482915");
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
        useCase.execute({ ...baseCommand, documentNumber: "31.556.208" }),
      ).rejects.toBeInstanceOf(ClientDniAlreadyExistsError);
    });

    // D-108 — la unicidad es por tipo: un DNI y un pasaporte con el mismo número no chocan.
    it("does not clash with another type holding the same number (D-108)", async () => {
      const { useCase } = build();
      await useCase.execute({ ...baseCommand, documentNumber: "12345678" });

      const { client } = await useCase.execute({
        ...baseCommand,
        documentType: "PASSPORT",
        documentNumber: "12345678",
      });

      expect(client.document.type).toBe("PASSPORT");
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

  // D-109 — dirección y teléfono son obligatorios; vacío y en blanco se rechazan igual.
  describe("required address and phone (D-109)", () => {
    it.each([
      ["address", "", "La dirección es obligatoria."],
      ["address", "   ", "La dirección es obligatoria."],
      ["phone", "", "El teléfono es obligatorio."],
      ["phone", "   ", "El teléfono es obligatorio."],
    ])("rejects an empty or blank %s (%j)", async (field, value, message) => {
      const { useCase, clients } = build();

      await expect(
        useCase.execute({ ...baseCommand, [field]: value }),
      ).rejects.toMatchObject({ message, details: { field } });
      expect(clients.byId.size).toBe(0);
    });

    it("stores them trimmed", async () => {
      const { useCase } = build();

      const { client } = await useCase.execute({
        ...baseCommand,
        address: "  Av. Colón 1320  ",
        phone: " 351 530-1177 ",
      });

      expect(client.address).toBe("Av. Colón 1320");
      expect(client.phone).toBe("351 530-1177");
    });
  });

  // CA-8.5 — el correo es opcional; uno en blanco queda ausente.
  it("registers without email, and stores a blank email as absent", async () => {
    const { useCase } = build();

    const { client } = await useCase.execute(baseCommand);
    const { client: blank } = await useCase.execute({
      ...baseCommand,
      documentNumber: "29440117",
      email: "   ",
    });

    expect(client.email).toBeNull();
    expect(blank.email).toBeNull();
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
