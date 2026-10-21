import { DetectUpcomingDeadlinesUseCase } from "./detect-upcoming-deadlines.use-case";
import { FakeClock, FakeOpenDeadlines } from "./test-support/detection-fakes";
import { CaseOpenDeadline } from "../../domain/ports/open-deadlines.port";
import { JurisdictionCode } from "../../domain/value-objects/jurisdiction-code";

const TODAY = new Date("2026-10-06T00:00:00.000Z");
const NOW = new Date("2026-10-06T11:00:00.000Z");
const WARNING_DAYS = 3;

function deadline(overrides: Partial<CaseOpenDeadline> = {}): CaseOpenDeadline {
  return {
    caseId: 1,
    caption: "GÓMEZ, Ariel p.s.a. Robo calificado",
    sacNumber: "13284571",
    jurisdiction: JurisdictionCode.CRIMINAL,
    responsibleLawyerId: 20,
    origin: "PROCEDURAL_ACT",
    dueDate: "2026-10-09",
    businessDaysRemaining: 3,
    proceduralActId: 100,
    ...overrides,
  };
}

function build(warningDays = WARNING_DAYS) {
  const deadlines = new FakeOpenDeadlines();
  const useCase = new DetectUpcomingDeadlinesUseCase(deadlines, new FakeClock(NOW, TODAY), warningDays);
  return { useCase, deadlines };
}

describe("DetectUpcomingDeadlinesUseCase", () => {
  // V-06: una sola fecha para toda la corrida, la civil de Córdoba.
  it("le pide a cases los vencimientos una sola vez, con la fecha de hoy del reloj", async () => {
    const { useCase, deadlines } = build();

    await useCase.execute();

    expect(deadlines.calls).toEqual([TODAY]);
  });

  // CA-51.3
  it("un vencimiento dentro del preaviso da un preaviso con los datos tal como llegaron", async () => {
    const { useCase, deadlines } = build();
    deadlines.deadlines = [deadline()];

    await expect(useCase.execute()).resolves.toEqual([
      {
        caseId: 1,
        caption: "GÓMEZ, Ariel p.s.a. Robo calificado",
        sacNumber: "13284571",
        jurisdiction: JurisdictionCode.CRIMINAL,
        responsibleLawyerId: 20,
        kind: "DEADLINE_WARNING",
        origin: "PROCEDURAL_ACT",
        dueDate: "2026-10-09",
        proceduralActId: 100,
        businessDaysRemaining: 3,
      },
    ]);
  });

  // CA-51.3
  it('un vencimiento del día da "vence hoy"', async () => {
    const { useCase, deadlines } = build();
    deadlines.deadlines = [deadline({ dueDate: "2026-10-06", businessDaysRemaining: 0 })];

    const [notice] = await useCase.execute();

    expect(notice).toMatchObject({ kind: "DEADLINE_DUE_TODAY", dueDate: "2026-10-06" });
  });

  // CA-51.3, D-64, V-13: se detecta, pero no llega al aviso.
  it("un vencimiento ya pasado no genera aviso", async () => {
    const { useCase, deadlines } = build();
    deadlines.deadlines = [deadline({ dueDate: "2026-10-02", businessDaysRemaining: -2 })];

    await expect(useCase.execute()).resolves.toEqual([]);
  });

  it("un vencimiento lejano todavía no genera aviso", async () => {
    const { useCase, deadlines } = build();
    deadlines.deadlines = [deadline({ dueDate: "2026-10-20", businessDaysRemaining: 10 })];

    await expect(useCase.execute()).resolves.toEqual([]);
  });

  // D-79: los días de preaviso son configuración del servidor.
  it("usa los días de preaviso configurados", async () => {
    const { useCase, deadlines } = build(5);
    deadlines.deadlines = [deadline({ businessDaysRemaining: 5 })];

    const [notice] = await useCase.execute();

    expect(notice.kind).toBe("DEADLINE_WARNING");
  });

  it("de varios vencimientos devuelve solo los que llevan aviso, en el orden en que llegan", async () => {
    const { useCase, deadlines } = build();
    deadlines.deadlines = [
      deadline({ caseId: 1, businessDaysRemaining: -4 }),
      deadline({ caseId: 2, businessDaysRemaining: 0 }),
      deadline({ caseId: 3, businessDaysRemaining: 8 }),
      deadline({ caseId: 4, businessDaysRemaining: 1 }),
    ];

    const notices = await useCase.execute();

    expect(notices.map((n) => [n.caseId, n.kind])).toEqual([
      [2, "DEADLINE_DUE_TODAY"],
      [4, "DEADLINE_WARNING"],
    ]);
  });

  // El origen viaja tal cual: lo usa la clave de sent_notifications.
  it("conserva el origen y deja sin acto procesal el vencimiento del acto lesivo", async () => {
    const { useCase, deadlines } = build();
    deadlines.deadlines = [
      deadline({ origin: "HARMFUL_ACT", proceduralActId: null, jurisdiction: JurisdictionCode.AMPARO }),
    ];

    const [notice] = await useCase.execute();

    expect(notice).toMatchObject({ origin: "HARMFUL_ACT", proceduralActId: null, jurisdiction: "AMPARO" });
  });

  it("si cases falla, propaga el error en vez de devolver una lista vacía", async () => {
    const { useCase, deadlines } = build();
    deadlines.failWith = new Error("base caída");

    await expect(useCase.execute()).rejects.toThrow("base caída");
  });
});
