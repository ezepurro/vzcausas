import { Lawyer } from "../../domain/entities/lawyer.entity";
import {
  InvalidReassignmentsError,
  LawyerHasDependenciesError,
  LawyerNotFoundError,
} from "../../domain/errors/people.errors";
import { LAWYER_DEACTIVATED } from "../../domain/ports/events/lawyer-deactivated.event";
import { RegistrationNumber } from "../../domain/value-objects/registration-number.vo";
import { DeactivateLawyerCommand, DeactivateLawyerUseCase } from "./deactivate-lawyer.use-case";
import {
  FakeAuditTrail,
  FakeClock,
  FakeEventPublisher,
  FakeLawyerCases,
  FakeLawyerRepository,
  FakeLawyerUser,
  FakeTransactionManager,
} from "./test-support/people-fakes";

/*
 * HU15 · Dar de baja un abogado. Solo lo que es del caso de uso: el orden de los chequeos, que un
 * rechazo no escriba nada, que todo se escriba en la misma transacción y que Drive se avise
 * después. Las reglas del reparto están en `case-reassignment-plan.vo.spec.ts`.
 */

const NOW = new Date("2026-11-17T15:30:00.000Z");
const RIOS = 3;
const GAGA = 4;

function build() {
  const lawyers = new FakeLawyerRepository();
  const audit = new FakeAuditTrail();
  const transactions = new FakeTransactionManager(lawyers, audit);
  const events = new FakeEventPublisher();
  const cases = new FakeLawyerCases();
  const users = new FakeLawyerUser();
  audit.transactions = transactions;
  events.transactions = transactions;
  cases.transactions = transactions;
  users.transactions = transactions;
  const useCase = new DeactivateLawyerUseCase(lawyers, cases, users, audit, transactions, new FakeClock(NOW), events);

  const seed = (id: number, active = true) =>
    lawyers.create(
      Lawyer.hydrate({
        id,
        lastName: id === RIOS ? "Ríos" : "Gaga",
        firstName: id === RIOS ? "Malena" : "Pablo",
        registrationNumber: RegistrationNumber.create(`1-${28000 + id}`),
        active,
      }),
    );

  return { useCase, lawyers, audit, events, cases, users, seed };
}

const command = (overrides: Partial<DeactivateLawyerCommand> = {}): DeactivateLawyerCommand => ({
  lawyerId: RIOS,
  reassignments: [],
  actorUserId: 1,
  ...overrides,
});

describe("DeactivateLawyerUseCase", () => {
  // CA-15.1: un abogado sin causas activas se da de baja sin reparto.
  it("da de baja a un abogado sin causas activas, sin cuerpo, y lo audita en la misma transacción", async () => {
    const { useCase, lawyers, audit, users, cases, seed } = build();
    await seed(RIOS);

    await useCase.execute(command({ reassignments: undefined }));

    expect(lawyers.deactivations.map((lawyer) => lawyer.id)).toEqual([RIOS]);
    expect(lawyers.byId.get(RIOS)!.isActive()).toBe(false);
    expect(users.unlinked).toEqual([{ lawyerId: RIOS, inTransaction: true }]);
    expect(cases.reassigned).toHaveLength(1);
    expect(audit.entries).toEqual([
      {
        actorUserId: 1,
        action: "lawyer.deactivated",
        entityType: "Lawyer",
        entityId: String(RIOS),
        occurredAt: NOW,
        inTransaction: true,
      },
    ]);
  });

  it("reasigna y deja huérfanas en una sola llamada, dentro de la transacción, y recién después avisa a Drive", async () => {
    const { useCase, cases, events, seed } = build();
    await seed(RIOS);
    await seed(GAGA);
    cases.activeCaseIds.set(RIOS, [1, 9, 12]);

    await useCase.execute(
      command({
        reassignments: [
          { caseId: 1, responsibleLawyerId: GAGA },
          { caseId: 9, responsibleLawyerId: GAGA },
          { caseId: 12, unassigned: true },
        ],
      }),
    );

    expect(cases.reassigned).toEqual([
      {
        fromLawyerId: RIOS,
        reassignments: [
          { caseId: 1, responsibleLawyerId: GAGA },
          { caseId: 9, responsibleLawyerId: GAGA },
          { caseId: 12, responsibleLawyerId: null },
        ],
        actorUserId: 1,
        inTransaction: true,
      },
    ]);
    // Drive y el evento van después del commit, y no son parte de la operación (D-60).
    expect(cases.announced).toEqual([{ caseIds: [1, 9, 12], inTransaction: false }]);
    expect(events.published).toEqual([
      expect.objectContaining({ type: LAWYER_DEACTIVATED, lawyerId: RIOS, keepsHistory: false, inTransaction: false }),
    ]);
  });

  // D-132: la carpeta del abogado se queda si conserva causas en un estado terminal.
  it.each([
    ["conserva causas terminales: su carpeta queda como historial", 2, true],
    ["no conserva ninguna: su carpeta puede ir a la Papelera", 0, false],
  ])("el evento dice si %s", async (_caso, historyCases, keepsHistory) => {
    const { useCase, cases, events, seed } = build();
    await seed(RIOS);
    cases.activeCaseIds.set(RIOS, [1]);
    cases.historyCases.set(RIOS, historyCases);

    await useCase.execute(command({ reassignments: [{ caseId: 1, unassigned: true }] }));

    expect(events.published).toEqual([expect.objectContaining({ type: LAWYER_DEACTIVATED, keepsHistory })]);
  });

  describe("un pedido rechazado no escribe nada", () => {
    const nothingWritten = (ctx: ReturnType<typeof build>) => {
      expect(ctx.lawyers.deactivations).toEqual([]);
      expect(ctx.cases.reassigned).toEqual([]);
      expect(ctx.users.unlinked).toEqual([]);
      expect(ctx.audit.entries).toEqual([]);
      expect(ctx.cases.announced).toEqual([]);
      expect(ctx.events.published).toEqual([]);
    };

    // Regla 1
    it.each([
      ["que no existe", false],
      ["que ya está dado de baja", true],
    ])("un abogado %s es 404", async (_caso, exists) => {
      const ctx = build();
      if (exists) await ctx.seed(RIOS, false);

      await expect(ctx.useCase.execute(command())).rejects.toBeInstanceOf(LawyerNotFoundError);

      nothingWritten(ctx);
    });

    // Regla 2
    it("un reparto inválido es 400 con el detalle en `reassignments`", async () => {
      const ctx = build();
      await ctx.seed(RIOS);
      ctx.cases.activeCaseIds.set(RIOS, [1]);

      await expect(
        ctx.useCase.execute(command({ reassignments: [{ caseId: 12, unassigned: true }] })),
      ).rejects.toBeInstanceOf(InvalidReassignmentsError);

      nothingWritten(ctx);
    });

    it("un abogado de destino dado de baja es 400", async () => {
      const ctx = build();
      await ctx.seed(RIOS);
      await ctx.seed(GAGA, false);
      ctx.cases.activeCaseIds.set(RIOS, [1]);

      await expect(
        ctx.useCase.execute(command({ reassignments: [{ caseId: 1, responsibleLawyerId: GAGA }] })),
      ).rejects.toBeInstanceOf(InvalidReassignmentsError);

      nothingWritten(ctx);
    });

    // Regla 3
    it("una causa activa que no figura en el reparto es 409, y no queda huérfana por omisión", async () => {
      const ctx = build();
      await ctx.seed(RIOS);
      await ctx.seed(GAGA);
      ctx.cases.activeCaseIds.set(RIOS, [1, 2]);

      await expect(
        ctx.useCase.execute(command({ reassignments: [{ caseId: 1, responsibleLawyerId: GAGA }] })),
      ).rejects.toBeInstanceOf(LawyerHasDependenciesError);

      nothingWritten(ctx);
    });

    it("el 404 se resuelve antes que el reparto, y el 400 antes que el 409", async () => {
      const ctx = build();
      await expect(ctx.useCase.execute(command({ reassignments: "no es una lista" }))).rejects.toBeInstanceOf(
        LawyerNotFoundError,
      );

      await ctx.seed(RIOS);
      ctx.cases.activeCaseIds.set(RIOS, [1, 2]);
      await expect(ctx.useCase.execute(command({ reassignments: [{ caseId: 99, unassigned: true }] }))).rejects.toBeInstanceOf(
        InvalidReassignmentsError,
      );
    });
  });

  describe("si algo falla dentro de la transacción, nada se avisa ni se publica", () => {
    it("una causa asignada mientras tanto al abogado es 409 y deshace la operación", async () => {
      const ctx = build();
      await ctx.seed(RIOS);
      ctx.cases.activeCaseIds.set(RIOS, [1]);
      ctx.cases.caseAssignedMeanwhile = { lawyerId: RIOS, caseId: 77 };

      await expect(
        ctx.useCase.execute(command({ reassignments: [{ caseId: 1, unassigned: true }] })),
      ).rejects.toBeInstanceOf(LawyerHasDependenciesError);

      expect(ctx.lawyers.deactivations).toEqual([]);
      expect(ctx.users.unlinked).toEqual([]);
      expect(ctx.audit.entries).toEqual([]);
      expect(ctx.cases.announced).toEqual([]);
      expect(ctx.events.published).toEqual([]);
    });

    it("otra baja simultánea ganó: es 404 y no se toca al usuario", async () => {
      const ctx = build();
      await ctx.seed(RIOS);
      ctx.lawyers.alreadyDeactivatedOnSave = true;

      await expect(ctx.useCase.execute(command())).rejects.toBeInstanceOf(LawyerNotFoundError);

      expect(ctx.users.unlinked).toEqual([]);
      expect(ctx.audit.entries).toEqual([]);
      expect(ctx.cases.announced).toEqual([]);
    });

    it("si falla al desvincular al usuario, el error se propaga y no se avisa a Drive", async () => {
      const ctx = build();
      await ctx.seed(RIOS);
      ctx.users.failNextWith = new Error("base caída");

      await expect(ctx.useCase.execute(command())).rejects.toThrow("base caída");

      expect(ctx.audit.entries).toEqual([]);
      expect(ctx.cases.announced).toEqual([]);
      expect(ctx.events.published).toEqual([]);
    });

    it("si falla al reasignar las causas, el error se propaga y no se da de baja al abogado", async () => {
      const ctx = build();
      await ctx.seed(RIOS);
      ctx.cases.failNextReassignWith = new Error("base caída");

      await expect(ctx.useCase.execute(command())).rejects.toThrow("base caída");

      expect(ctx.lawyers.deactivations).toEqual([]);
      expect(ctx.users.unlinked).toEqual([]);
    });
  });
});
