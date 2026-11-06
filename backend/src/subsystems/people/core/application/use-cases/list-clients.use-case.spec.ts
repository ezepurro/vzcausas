import { Client } from "../../domain/entities/client.entity";
import { ClientDocument } from "../../domain/value-objects/client-document.vo";
import { ListClientsUseCase } from "./list-clients.use-case";
import {
  FakeActiveCasesCounter,
  FakeClientRepository,
} from "./test-support/people-fakes";

describe("ListClientsUseCase", () => {
  const CLIENT_SINCE = new Date("2026-10-07T00:00:00Z");
  let nextId = 1;

  function build() {
    const clients = new FakeClientRepository();
    const counter = new FakeActiveCasesCounter();
    return {
      useCase: new ListClientsUseCase(clients, counter),
      clients,
      counter,
    };
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
      document: ClientDocument.create("DNI", props.dni),
      address: "Av. Rafael Núñez 4560, Córdoba",
      phone: "351 401-5573",
      clientSince: CLIENT_SINCE,
    });
    if (props.active === false) client.deactivate();
    await clients.create(client);
    return client;
  }

  const page = { page: 1, limit: 20 };

  /*
   * El orden (CA-9.1), la búsqueda (CA-9.2) y la paginación los hace el repositorio en
   * SQL: probarlos acá probaría `FakeClientRepository`. Están contra la base en
   * `test/subsystems/people/clients.int.spec.ts`. Acá queda lo que decide el caso de uso.
   */
  describe("listing", () => {
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

      expect(result.clients.map((c) => c.client.lastName)).toEqual(["ACTIVO"]);
      expect(result.totalItems).toBe(1);
    });
  });

  describe("search (CA-9.2)", () => {
    async function seedThree(clients: FakeClientRepository) {
      await seed(clients, { lastName: "PERALTA", firstName: "Ignacio", dni: "31556208" });
      await seed(clients, { lastName: "BENÍTEZ", firstName: "Rodrigo", dni: "29440117" });
      await seed(clients, { lastName: "MOLINA", firstName: "Peralta", dni: "28111999" });
    }

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
});
