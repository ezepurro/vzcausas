import { Client } from "../../domain/entities/client.entity";
import { Dni } from "../../domain/value-objects/dni.vo";
import { ListClientsUseCase } from "./list-clients.use-case";
import { FakeClientRepository } from "./test-support/people-fakes";

describe("ListClientsUseCase", () => {
  const CLIENT_SINCE = new Date("2026-10-07T00:00:00Z");
  let nextId = 1;

  function build() {
    const clients = new FakeClientRepository();
    return { useCase: new ListClientsUseCase(clients), clients };
  }

  async function seed(
    clients: FakeClientRepository,
    props: {
      lastName: string;
      firstName: string;
      dni: string;
      active?: boolean;
    },
  ): Promise<Client> {
    const client = Client.create({
      id: nextId++,
      lastName: props.lastName,
      firstName: props.firstName,
      dni: Dni.create(props.dni),
      clientSince: CLIENT_SINCE,
    });
    if (props.active === false) client.deactivate();
    await clients.create(client);
    return client;
  }

  const page = { page: 1, limit: 20 };

  // CA-9.1 — ordenado por apellido y luego por nombres.
  describe("ordering (CA-9.1)", () => {
    it("orders by surname", async () => {
      const { useCase, clients } = build();
      await seed(clients, { lastName: "ZÁRATE", firstName: "Ana", dni: "30111222" });
      await seed(clients, { lastName: "ACOSTA", firstName: "Luis", dni: "30111333" });

      const result = await useCase.execute(page);

      expect(result.clients.map((c) => c.lastName)).toEqual([
        "ACOSTA",
        "ZÁRATE",
      ]);
    });

    it("orders by given names within the same surname", async () => {
      const { useCase, clients } = build();
      await seed(clients, { lastName: "GÓMEZ", firstName: "Zulema", dni: "30222111" });
      await seed(clients, { lastName: "GÓMEZ", firstName: "Ariel", dni: "30222222" });

      const result = await useCase.execute(page);

      expect(result.clients.map((c) => c.firstName)).toEqual([
        "Ariel",
        "Zulema",
      ]);
    });

    it("does not list clients that were given up (RN12)", async () => {
      const { useCase, clients } = build();
      await seed(clients, { lastName: "ACTIVO", firstName: "Juan", dni: "30333111" });
      await seed(clients, {
        lastName: "BAJA",
        firstName: "Pedro",
        dni: "30333222",
        active: false,
      });

      const result = await useCase.execute(page);

      expect(result.clients.map((c) => c.lastName)).toEqual(["ACTIVO"]);
      expect(result.totalItems).toBe(1);
    });
  });

  // CA-9.2 — búsqueda por apellido, nombres o DNI.
  describe("search (CA-9.2)", () => {
    async function seedThree(clients: FakeClientRepository) {
      await seed(clients, { lastName: "PERALTA", firstName: "Ignacio", dni: "31556208" });
      await seed(clients, { lastName: "BENÍTEZ", firstName: "Rodrigo", dni: "29440117" });
      await seed(clients, { lastName: "MOLINA", firstName: "Peralta", dni: "28111999" });
    }

    it("matches the surname", async () => {
      const { useCase, clients } = build();
      await seedThree(clients);

      const result = await useCase.execute({ ...page, search: "BENÍ" });

      expect(result.clients.map((c) => c.lastName)).toEqual(["BENÍTEZ"]);
    });

    it("matches the given names too", async () => {
      const { useCase, clients } = build();
      await seedThree(clients);

      const result = await useCase.execute({ ...page, search: "Peralta" });

      // Uno por apellido y otro por nombres: la búsqueda es un OR.
      expect(result.totalItems).toBe(2);
    });

    it("matches the document", async () => {
      const { useCase, clients } = build();
      await seedThree(clients);

      const result = await useCase.execute({ ...page, search: "29440117" });

      expect(result.clients.map((c) => c.lastName)).toEqual(["BENÍTEZ"]);
    });

    it("ignores case", async () => {
      const { useCase, clients } = build();
      await seedThree(clients);

      const result = await useCase.execute({ ...page, search: "peralta" });

      expect(result.totalItems).toBe(2);
    });

    /**
     * El contrato trata un `search` en blanco como ausente. Pasarlo
     * hacia abajo armaría un `LIKE '%%'` que igual devuelve todo, pero
     * esconde la intención.
     */
    it("treats a blank search as absent", async () => {
      const { useCase, clients } = build();
      await seedThree(clients);

      const result = await useCase.execute({ ...page, search: "   " });

      expect(result.totalItems).toBe(3);
    });
  });

  // CA-9.5 — un cliente sin causas se lista igual.
  it("lists a client with no cases, without error (CA-9.5)", async () => {
    const { useCase, clients } = build();
    await seed(clients, { lastName: "SOLO", firstName: "Sin Causas", dni: "27111222" });

    const result = await useCase.execute(page);

    expect(result.totalItems).toBe(1);
  });

  it("slices by page", async () => {
    const { useCase, clients } = build();
    await seed(clients, { lastName: "A", firstName: "Uno", dni: "20111111" });
    await seed(clients, { lastName: "B", firstName: "Dos", dni: "20222222" });
    await seed(clients, { lastName: "C", firstName: "Tres", dni: "20333333" });

    const result = await useCase.execute({ page: 2, limit: 2 });

    expect(result.clients.map((c) => c.lastName)).toEqual(["C"]);
    // El total es el de la colección entera, no el de la página.
    expect(result.totalItems).toBe(3);
  });
});
