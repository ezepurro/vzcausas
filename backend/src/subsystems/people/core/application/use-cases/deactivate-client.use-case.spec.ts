import { ValidationError } from "@shared/domain/domain-error";
import { Client } from "../../domain/entities/client.entity";
import { ClientHasActiveCasesError, ClientNotFoundError } from "../../domain/errors/people.errors";
import { ClientDocument } from "../../domain/value-objects/client-document.vo";
import { DeactivateClientCommand, DeactivateClientUseCase } from "./deactivate-client.use-case";
import {
  aClientDeactivation,
  FakeActiveCasesCounter,
  FakeAuditTrail,
  FakeClientRepository,
  FakeClock,
  FakeTransactionManager,
} from "./test-support/people-fakes";

/*
 * HU11 · Registrar baja de cliente. Solo lo que es del caso de uso: el orden de
 * los chequeos, que un rechazo no escriba nada y la auditoría. Las reglas del
 * motivo están en `client-deactivation.vo.spec.ts` y las del cliente en
 * `client.entity.spec.ts`.
 */
const NOW = new Date("2026-10-07T12:00:00Z");

const aClient = (id: number, active = true) =>
  Client.hydrate({
    id,
    lastName: "BENÍTEZ",
    firstName: "Rodrigo",
    document: ClientDocument.create("DNI", String(31556200 + id)),
    address: "Av. Rafael Núñez 4560, Córdoba",
    phone: "351 401-5573",
    email: null,
    clientSince: new Date("2021-03-12T00:00:00Z"),
    active,
    deactivation: active ? null : aClientDeactivation(),
  });

function build() {
  const clients = new FakeClientRepository();
  clients.byId.set(1, aClient(1));
  clients.byId.set(2, aClient(2, false));
  const counter = new FakeActiveCasesCounter();
  const audit = new FakeAuditTrail();
  const transactions = new FakeTransactionManager(undefined, audit);
  audit.transactions = transactions;
  const useCase = new DeactivateClientUseCase(clients, counter, audit, transactions, new FakeClock(NOW));
  return { useCase, clients, counter, audit };
}

const command = (overrides: Partial<DeactivateClientCommand> = {}): DeactivateClientCommand => ({
  clientId: 1,
  input: { reason: "Cliente cargado dos veces." },
  actorUserId: 9,
  ...overrides,
});

describe("DeactivateClientUseCase", () => {
  // CA-11.1, CA-11.5
  it("guarda la baja con su registro y la audita con quién y cuándo, sin el motivo", async () => {
    const { useCase, clients, audit } = build();

    await useCase.execute(command());

    expect(clients.deactivations).toEqual([1]);
    expect(clients.byId.get(1)?.deactivation).toMatchObject({
      reason: "Cliente cargado dos veces.",
      deactivatedByUserId: 9,
      deactivatedAt: NOW,
    });
    expect(audit.entries).toEqual([
      {
        actorUserId: 9,
        action: "client.deactivated",
        entityType: "Client",
        entityId: "1",
        occurredAt: NOW,
        inTransaction: true,
      },
    ]);
  });

  // CA-11.9
  it.each([
    ["inexistente", 99],
    ["ya dado de baja", 2],
  ])("un cliente %s es 404 y no se escribe nada", async (_case, clientId) => {
    const { useCase, clients, audit } = build();

    await expect(useCase.execute(command({ clientId }))).rejects.toThrow(ClientNotFoundError);

    expect(clients.deactivations).toEqual([]);
    expect(audit.entries).toEqual([]);
  });

  // CA-11.2
  it("con causas activas es 409 y no se escribe nada; el conteo se pide de una vez", async () => {
    const { useCase, clients, counter, audit } = build();
    counter.counts.set(1, 2);

    await expect(useCase.execute(command())).rejects.toThrow(ClientHasActiveCasesError);

    expect(counter.calls).toEqual([[1]]);
    expect(clients.deactivations).toEqual([]);
    expect(clients.byId.get(1)?.isActive()).toBe(true);
    expect(audit.entries).toEqual([]);
  });

  // CA-11.7
  it("un motivo de más de 500 caracteres es 400 y no se escribe nada", async () => {
    const { useCase, clients, audit } = build();

    await expect(useCase.execute(command({ input: { reason: "a".repeat(501) } }))).rejects.toBeInstanceOf(
      ValidationError,
    );

    expect(clients.deactivations).toEqual([]);
    expect(audit.entries).toEqual([]);
  });

  // CA-11.9: dos bajas a la vez.
  it("si otra baja ganó entre la lectura y la escritura, es 404 y no se audita", async () => {
    const { useCase, clients, audit } = build();
    clients.alreadyDeactivatedOnSave = true;

    await expect(useCase.execute(command())).rejects.toThrow(ClientNotFoundError);

    expect(audit.entries).toEqual([]);
  });
});
