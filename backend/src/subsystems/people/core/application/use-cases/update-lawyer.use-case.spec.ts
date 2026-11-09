import { ValidationError } from "@shared/domain/domain-error";
import { Lawyer } from "../../domain/entities/lawyer.entity";
import {
  LawyerNotFoundError,
  LawyerRegistrationAlreadyExistsError,
} from "../../domain/errors/people.errors";
import { LAWYER_RENAMED } from "../../domain/ports/events/lawyer-renamed.event";
import { RegistrationNumber } from "../../domain/value-objects/registration-number.vo";
import { FindLawyerUseCase } from "./find-lawyer.use-case";
import {
  FakeActiveCasesCounter,
  FakeAuditTrail,
  FakeClock,
  FakeEventPublisher,
  FakeLawyerRepository,
  FakeTransactionManager,
} from "./test-support/people-fakes";
import { UpdateLawyerCommand, UpdateLawyerUseCase } from "./update-lawyer.use-case";

/*
 * HU14 · Modificar abogado. Solo lo que es del caso de uso: el orden de los
 * chequeos, que un rechazo no escriba nada, la auditoría en la misma
 * transacción y el evento después. Las reglas de los datos están en
 * `lawyer.entity.spec.ts` y `person-name.vo.spec.ts`.
 */

const NOW = new Date("2026-10-06T15:30:00.000Z");
const RIOS = 4;
const OTHER = 7;

function build() {
  const lawyers = new FakeLawyerRepository();
  const audit = new FakeAuditTrail();
  const transactions = new FakeTransactionManager(lawyers, audit);
  const events = new FakeEventPublisher();
  audit.transactions = transactions;
  events.transactions = transactions;
  const counter = new FakeActiveCasesCounter();
  const useCase = new UpdateLawyerUseCase(
    lawyers,
    audit,
    transactions,
    new FakeClock(NOW),
    events,
    new FindLawyerUseCase(lawyers, counter),
  );

  const seed = (id: number, registrationNumber: string, active = true) =>
    lawyers.create(
      Lawyer.hydrate({
        id,
        lastName: id === RIOS ? "Ríos" : "Peralta",
        firstName: id === RIOS ? "Malena" : "Ignacio",
        registrationNumber: RegistrationNumber.create(registrationNumber),
        active,
      }),
    );

  return { useCase, lawyers, audit, events, counter, seed };
}

const command = (overrides: Partial<UpdateLawyerCommand> = {}): UpdateLawyerCommand => ({
  lawyerId: RIOS,
  changes: { lastName: "Gómez" },
  actorUserId: 1,
  ...overrides,
});

describe("UpdateLawyerUseCase", () => {
  // CA-14.1, CA-14.5
  it("guarda el cambio y lo audita en la misma transacción, con los nombres de los campos y no sus valores", async () => {
    const { useCase, lawyers, audit, counter, seed } = build();
    await seed(RIOS, "1-28114");
    counter.counts.set(RIOS, 3);

    const view = await useCase.execute(command({ changes: { lastName: "Gómez", registrationNumber: "1-40000" } }));

    expect(view).toEqual({
      id: RIOS,
      lastName: "Gómez",
      firstName: "Malena",
      registrationNumber: "1-40000",
      activeCases: 3,
      active: true,
    });
    expect(lawyers.updates).toHaveLength(1);
    expect(audit.entries).toEqual([
      {
        actorUserId: 1,
        action: "lawyer.updated",
        entityType: "Lawyer",
        entityId: String(RIOS),
        occurredAt: NOW,
        metadata: { changedFields: ["lastName", "registrationNumber"] },
        inTransaction: true,
      },
    ]);
  });

  // CA-14.11: 404 antes que los datos
  it.each([
    ["inexistente", false],
    ["dado de baja", true],
  ])("un abogado %s es 404, aunque los datos sean inválidos, y no se escribe nada", async (_case, exists) => {
    const { useCase, lawyers, audit, seed } = build();
    if (exists) await seed(RIOS, "1-28114", false);

    await expect(useCase.execute(command({ changes: { lastName: "" } }))).rejects.toBeInstanceOf(LawyerNotFoundError);
    expect(lawyers.updates).toEqual([]);
    expect(audit.entries).toEqual([]);
  });

  it("con datos inválidos no escribe nada", async () => {
    const { useCase, lawyers, audit, seed } = build();
    await seed(RIOS, "1-28114");

    await expect(useCase.execute(command({ changes: { firstName: "Dra. Malena" } }))).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(lawyers.updates).toEqual([]);
    expect(audit.entries).toEqual([]);
  });

  // CA-14.3
  it("la matrícula de otro abogado es 409, y el abogado queda como estaba", async () => {
    const { useCase, lawyers, audit, seed } = build();
    await seed(RIOS, "1-28114");
    await seed(OTHER, "1-35207");

    await expect(
      useCase.execute(command({ changes: { lastName: "Gómez", registrationNumber: "1-35207" } })),
    ).rejects.toBeInstanceOf(LawyerRegistrationAlreadyExistsError);
    expect(lawyers.updates).toEqual([]);
    expect(audit.entries).toEqual([]);
    expect((await lawyers.findById(RIOS))?.lastName).toBe("Ríos");
  });

  // CA-14.7
  it("enviar su propia matrícula no es conflicto", async () => {
    const { useCase, seed } = build();
    await seed(RIOS, "1-28114");

    await expect(useCase.execute(command({ changes: { registrationNumber: "1-28114" } }))).resolves.toMatchObject({
      registrationNumber: "1-28114",
    });
  });

  // CA-14.5: si no se puede auditar, no se modifica
  it("si la auditoría falla, la modificación no queda guardada", async () => {
    const { useCase, lawyers, audit, events, seed } = build();
    await seed(RIOS, "1-28114");
    audit.failNextWith = new Error("audit_log no disponible");

    await expect(useCase.execute(command())).rejects.toThrow("audit_log no disponible");
    expect(lawyers.updates).toEqual([]);
    expect(events.published).toEqual([]);
  });

  // CA-14.12, CA-14.13
  it("si cambió el nombre, anuncia el renombre después de guardar, fuera de la transacción", async () => {
    const { useCase, events, seed } = build();
    await seed(RIOS, "1-28114");

    await useCase.execute(command({ changes: { firstName: "Malena Sofía" } }));

    expect(events.published).toEqual([
      {
        type: LAWYER_RENAMED,
        eventId: expect.any(String),
        occurredAt: NOW.toISOString(),
        lawyerId: RIOS,
        lastName: "Ríos",
        firstName: "Malena Sofía",
        inTransaction: false,
      },
    ]);
  });

  it.each([
    ["solo la matrícula", { registrationNumber: "1-40000" }],
    ["el mismo nombre que tenía", { lastName: "Ríos", firstName: "Malena" }],
  ])("no anuncia nada si cambió %s", async (_case, changes) => {
    const { useCase, events, seed } = build();
    await seed(RIOS, "1-28114");

    await useCase.execute(command({ changes }));

    expect(events.published).toEqual([]);
  });
});
