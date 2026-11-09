import { Client } from "../../domain/entities/client.entity";
import { ClientNotFoundError } from "../../domain/errors/people.errors";
import { ClientDocument } from "../../domain/value-objects/client-document.vo";
import { FindClientUseCase } from "./find-client.use-case";
import {
  FakeActiveCasesCounter,
  FakeClientRepository,
} from "./test-support/people-fakes";

describe("FindClientUseCase", () => {
  function build() {
    const clients = new FakeClientRepository();
    const counter = new FakeActiveCasesCounter();
    return {
      useCase: new FindClientUseCase(clients, counter),
      clients,
      counter,
    };
  }

  async function seed(
    clients: FakeClientRepository,
    active = true,
  ): Promise<Client> {
    const client = Client.create({
      id: 1,
      lastName: "BENÍTEZ",
      firstName: "Rodrigo E.",
      document: ClientDocument.create("DNI", "31556208"),
      address: "Av. Rafael Núñez 4560, Córdoba",
      phone: "351 401-5573",
      clientSince: new Date("2026-10-07T00:00:00Z"),
    });
    if (!active) client.deactivate();
    await clients.create(client);
    return client;
  }

  it("returns the client", async () => {
    const { useCase, clients } = build();
    const seeded = await seed(clients);

    const { client } = await useCase.execute({ id: 1 });

    expect(client).toBe(seeded);
  });

  it("returns how many active cases the client has, asked in one call", async () => {
    const { useCase, clients, counter } = build();
    await seed(clients);
    counter.counts.set(1, 3);

    const result = await useCase.execute({ id: 1 });

    expect(result.activeCases).toBe(3);
    expect(counter.calls).toEqual([[1]]);
  });

  it("reports 0 active cases when the client has none", async () => {
    const { useCase, clients } = build();
    await seed(clients);

    expect((await useCase.execute({ id: 1 })).activeCases).toBe(0);
  });

  it("throws when no client matches", async () => {
    const { useCase } = build();

    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(
      ClientNotFoundError,
    );
  });

  /**
   * Un cliente dado de baja responde 404 y no un cuerpo con
   * `active: false`: a través de este endpoint tiene que ser
   * indistinguible de uno que nunca existió (RN12).
   */
  it("reports a client given up as absent", async () => {
    const { useCase, clients } = build();
    await seed(clients, false);

    await expect(useCase.execute({ id: 1 })).rejects.toBeInstanceOf(
      ClientNotFoundError,
    );
  });
});
