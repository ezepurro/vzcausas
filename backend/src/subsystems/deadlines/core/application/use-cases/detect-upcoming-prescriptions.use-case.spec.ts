import { DetectUpcomingPrescriptionsUseCase } from "./detect-upcoming-prescriptions.use-case";
import { FakeClock, FakePrescriptionStatus } from "./test-support/detection-fakes";
import { CasePrescriptionStatus } from "../../domain/ports/prescription-status.port";

const TODAY = new Date("2026-10-06T00:00:00.000Z");
const NOW = new Date("2026-10-06T11:00:00.000Z");

function status(overrides: Partial<CasePrescriptionStatus> = {}): CasePrescriptionStatus {
  return {
    caseId: 1,
    caption: "GÓMEZ, Ariel p.s.a. Robo calificado",
    sacNumber: "87654321",
    responsibleLawyerId: 20,
    legalQualificationName: "Robo calificado",
    expiresOn: "2027-01-15",
    alert: false,
    expired: false,
    daysRemaining: 101,
    ...overrides,
  };
}

function build() {
  const prescriptions = new FakePrescriptionStatus();
  const useCase = new DetectUpcomingPrescriptionsUseCase(prescriptions, new FakeClock(NOW, TODAY));
  return { useCase, prescriptions };
}

describe("DetectUpcomingPrescriptionsUseCase", () => {
  // V-06: una sola fecha para toda la corrida, la civil de Córdoba, no el instante.
  it("le pide a cases la prescripción una sola vez, con la fecha de hoy del reloj", async () => {
    const { useCase, prescriptions } = build();

    await useCase.execute();

    expect(prescriptions.calls).toEqual([TODAY]);
  });

  // CA-52.2
  it("una causa al 70 % o más da una alerta con los datos tal como llegaron", async () => {
    const { useCase, prescriptions } = build();
    prescriptions.statuses = [status({ alert: true })];

    await expect(useCase.execute()).resolves.toEqual([
      {
        caseId: 1,
        caption: "GÓMEZ, Ariel p.s.a. Robo calificado",
        sacNumber: "87654321",
        responsibleLawyerId: 20,
        kind: "PRESCRIPTION_ALERT",
        referenceDate: "2027-01-15",
        legalQualificationName: "Robo calificado",
        daysRemaining: 101,
      },
    ]);
  });

  // CA-52.2, V-02
  it("una causa con el plazo cumplido da un solo aviso, el de prescripción cumplida", async () => {
    const { useCase, prescriptions } = build();
    prescriptions.statuses = [status({ alert: true, expired: true, expiresOn: "2026-10-06" })];

    const notices = await useCase.execute();

    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ kind: "PRESCRIPTION_EXPIRED", referenceDate: "2026-10-06" });
  });

  it("una causa por debajo del 70 % no genera aviso", async () => {
    const { useCase, prescriptions } = build();
    prescriptions.statuses = [status({ alert: false, expired: false })];

    await expect(useCase.execute()).resolves.toEqual([]);
  });

  it("de varias causas devuelve solo las que llevan aviso, una vez cada una", async () => {
    const { useCase, prescriptions } = build();
    prescriptions.statuses = [
      status({ caseId: 1, alert: false }),
      status({ caseId: 2, alert: true }),
      status({ caseId: 3, alert: true, expired: true }),
    ];

    const notices = await useCase.execute();

    expect(notices.map((n) => [n.caseId, n.kind])).toEqual([
      [2, "PRESCRIPTION_ALERT"],
      [3, "PRESCRIPTION_EXPIRED"],
    ]);
  });

  it("una causa sin SAC conserva el null", async () => {
    const { useCase, prescriptions } = build();
    prescriptions.statuses = [status({ alert: true, sacNumber: null })];

    const [notice] = await useCase.execute();

    expect(notice.sacNumber).toBeNull();
  });

  it("sin causas penales activas devuelve una lista vacía", async () => {
    const { useCase } = build();

    await expect(useCase.execute()).resolves.toEqual([]);
  });

  // Puerto esencial: un día "sin nada que avisar" inventado es peor que un error.
  it("si cases falla, propaga el error en vez de devolver una lista vacía", async () => {
    const { useCase, prescriptions } = build();
    prescriptions.failWith = new Error("base caída");

    await expect(useCase.execute()).rejects.toThrow("base caída");
  });
});
