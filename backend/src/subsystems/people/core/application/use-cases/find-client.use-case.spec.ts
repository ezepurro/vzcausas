import { Client } from "../../domain/entities/client.entity";
import { ClientNotFoundError } from "../../domain/errors/people.errors";
import { Dni } from "../../domain/value-objects/dni.vo";
import { FindClientUseCase } from "./find-client.use-case";
import { FakeClientRepository } from "./test-support/people-fakes";

describe("FindClientUseCase", () => {
  function build() {
    const clients = new FakeClientRepository();
    return { useCase: new FindClientUseCase(clients), clients };
  }

  async function seed(
    clients: FakeClientRepository,
    active = true,
  ): Promise<Client> {
    const client = Client.create({
      id: 1,
      lastName: "BENÍTEZ",
      firstName: "Rodrigo E.",
      dni: Dni.create("31556208"),
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
