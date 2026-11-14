import { ValidationError } from "@shared/domain/domain-error";
import { Client } from "../../domain/entities/client.entity";
import { ClientDniAlreadyExistsError, ClientNotFoundError } from "../../domain/errors/people.errors";
import { ClientDocument } from "../../domain/value-objects/client-document.vo";
import { FindClientUseCase } from "./find-client.use-case";
import {
  aClientDeactivation,
  FakeActiveCasesCounter,
  FakeAuditTrail,
  FakeClientCaseCaptions,
  FakeClientRepository,
  FakeClock,
  FakeTransactionManager,
} from "./test-support/people-fakes";
import { UpdateClientCommand, UpdateClientUseCase } from "./update-client.use-case";

/*
 * HU10 · Modificar cliente. Solo lo que es del caso de uso: el orden de los
 * chequeos, que un rechazo no escriba nada, la auditoría y el pedido a `cases`
 * de las carátulas. Las reglas de los datos están en `client.entity.spec.ts`.
 */
const NOW = new Date("2026-10-07T12:00:00Z");

const aClient = (id: number, documentNumber: string, active = true) =>
  Client.hydrate({
    id,
    lastName: "GÓMEZ",
    firstName: "Ariel Fernando",
    document: ClientDocument.create("DNI", documentNumber),
    address: "Bv. San Juan 1240, Córdoba",
    phone: "351 415-2288",
    email: null,
    clientSince: new Date("2021-03-12T00:00:00Z"),
    active,
    deactivation: active ? null : aClientDeactivation(),
  });

function build() {
  const clients = new FakeClientRepository();
  clients.byId.set(1, aClient(1, "34812905"));
  clients.byId.set(2, aClient(2, "20111222"));
  clients.byId.set(3, aClient(3, "30999888", false));
  const audit = new FakeAuditTrail();
  const transactions = new FakeTransactionManager(undefined, audit);
  audit.transactions = transactions;
  const captions = new FakeClientCaseCaptions();
  captions.transactions = transactions;
  const counter = new FakeActiveCasesCounter();
  counter.counts.set(1, 2);
  const useCase = new UpdateClientUseCase(
    clients,
    captions,
    audit,
    transactions,
    new FakeClock(NOW),
    new FindClientUseCase(clients, counter),
  );
  return { useCase, clients, audit, captions };
}

const command = (overrides: Partial<UpdateClientCommand> = {}): UpdateClientCommand => ({
  clientId: 1,
  changes: { phone: "351 000-0000" },
  actorUserId: 9,
  ...overrides,
});

describe("UpdateClientUseCase", () => {
  // CA-10.1, CA-10.5
  it("guarda, audita los nombres de los campos y responde como GET /clients/{id}", async () => {
    const { useCase, clients, audit, captions } = build();

    const result = await useCase.execute(command({ changes: { phone: "351 000-0000", email: "a@b.com" } }));

    expect(result.client.phone).toBe("351 000-0000");
    expect(result.activeCases).toBe(2);
    expect(clients.updates).toEqual([1]);
    expect(audit.entries).toEqual([
      {
        actorUserId: 9,
        action: "client.updated",
        entityType: "Client",
        entityId: "1",
        occurredAt: NOW,
        metadata: { changedFields: ["phone", "email"] },
        inTransaction: true,
      },
    ]);
    // Cambiar el teléfono o el correo no toca ninguna carátula (CA-10.9).
    expect(captions.renames).toEqual([]);
    expect(captions.announcements).toEqual([]);
  });

  // CA-10.9, CA-10.10
  it("si cambia el nombre, las carátulas se escriben en la transacción y se anuncian después", async () => {
    const { useCase, captions } = build();
    captions.renamedCaseIds = [10, 11];

    await useCase.execute(command({ changes: { lastName: "GÓMEZ PAZ" } }));

    expect(captions.renames).toEqual([
      {
        clientId: 1,
        previous: { lastName: "GÓMEZ", firstName: "Ariel Fernando" },
        next: { lastName: "GÓMEZ PAZ", firstName: "Ariel Fernando" },
        actorUserId: 9,
        occurredAt: NOW,
        inTransaction: true,
      },
    ]);
    expect(captions.announcements).toEqual([{ renamedCaseIds: [10, 11], inTransaction: false }]);
  });

  it("si las carátulas fallan, no queda la auditoría del cliente ni se anuncia nada", async () => {
    const { useCase, audit, captions } = build();
    captions.failNextWith = new Error("db down");

    await expect(useCase.execute(command({ changes: { lastName: "GÓMEZ PAZ" } }))).rejects.toThrow("db down");

    expect(audit.entries).toEqual([]);
    expect(captions.announcements).toEqual([]);
  });

  // CA-10.11
  it.each([
    ["inexistente", 99],
    ["dado de baja", 3],
  ])("un cliente %s es 404 y no se escribe nada", async (_case, clientId) => {
    const { useCase, clients, audit } = build();

    await expect(useCase.execute(command({ clientId }))).rejects.toThrow(ClientNotFoundError);

    expect(clients.updates).toEqual([]);
    expect(audit.entries).toEqual([]);
  });

  // CA-10.7
  it("el documento de otro cliente vigente es 409 y no se escribe nada", async () => {
    const { useCase, clients, audit } = build();

    await expect(useCase.execute(command({ changes: { documentNumber: "20111222" } }))).rejects.toThrow(
      ClientDniAlreadyExistsError,
    );

    expect(clients.updates).toEqual([]);
    expect(audit.entries).toEqual([]);
  });

  // CA-10.7
  it.each([
    ["el propio", "34812905"],
    ["el de un cliente dado de baja", "30999888"],
  ])("%s no es un conflicto", async (_case, documentNumber) => {
    const { useCase, clients } = build();

    await useCase.execute(command({ changes: { documentNumber } }));

    expect(clients.updates).toEqual([1]);
  });

  // El 404 va antes que los datos: un cliente que no existe no se valida.
  it("datos inválidos son 400 y no se escribe nada", async () => {
    const { useCase, clients, audit } = build();

    await expect(useCase.execute(command({ changes: { address: "" } }))).rejects.toBeInstanceOf(ValidationError);

    expect(clients.updates).toEqual([]);
    expect(audit.entries).toEqual([]);
  });
});
