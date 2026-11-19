import { InvalidReassignmentsError, LawyerHasDependenciesError } from "../errors/people.errors";
import { CaseReassignmentPlan } from "./case-reassignment-plan.vo";

/* HU15 · El reparto de las causas de un abogado dado de baja (D-143). */

const details = (error: unknown) => (error as InvalidReassignmentsError).details;
const reasonOf = (raw: unknown): unknown => {
  try {
    CaseReassignmentPlan.parse(raw);
  } catch (error) {
    expect(error).toBeInstanceOf(InvalidReassignmentsError);
    return (details(error) as { reassignments: string }).reassignments;
  }
  throw new Error("Se esperaba un error y no se lanzó ninguno.");
};

describe("CaseReassignmentPlan.parse", () => {
  it("lee las dos formas de entrada: un abogado de destino o `unassigned: true`", () => {
    const plan = CaseReassignmentPlan.parse([
      { caseId: 1, responsibleLawyerId: 4 },
      { caseId: 9, responsibleLawyerId: 4 },
      { caseId: 12, unassigned: true },
    ]);

    expect(plan.reassignments).toEqual([
      { caseId: 1, responsibleLawyerId: 4 },
      { caseId: 9, responsibleLawyerId: 4 },
      { caseId: 12, responsibleLawyerId: null },
    ]);
    expect(plan.caseIds).toEqual([1, 9, 12]);
    expect(plan.targetLawyerIds).toEqual([4]);
  });

  it.each([[undefined], [null], [[]]])("sin reparto (%j) es un reparto vacío, válido para un abogado sin causas", (raw) => {
    const plan = CaseReassignmentPlan.parse(raw);

    expect(plan.reassignments).toEqual([]);
    expect(plan.targetLawyerIds).toEqual([]);
  });

  it.each([
    ["una lista que no es una lista", { caseId: 1 }, "Debe ser una lista de causas."],
    ["una entrada que no es un objeto", [7], "La entrada 1 no es válida."],
    ["una entrada sin causa", [{ responsibleLawyerId: 4 }], "La entrada 1 no indica una causa válida."],
    ["una causa que no es un entero", [{ caseId: "1", unassigned: true }], "La entrada 1 no indica una causa válida."],
    [
      "una causa repetida",
      [
        { caseId: 1, unassigned: true },
        { caseId: 1, responsibleLawyerId: 4 },
      ],
      "La causa 1 figura más de una vez.",
    ],
    ["una entrada sin abogado ni `unassigned`", [{ caseId: 1 }], 'La causa 1 debe indicar un abogado o "sin asignar".'],
    [
      "una entrada con abogado y `unassigned`",
      [{ caseId: 1, responsibleLawyerId: 4, unassigned: true }],
      'La causa 1 no puede llevar a la vez un abogado y "sin asignar".',
    ],
    ["un `unassigned` que no es true", [{ caseId: 1, unassigned: false }], 'La causa 1 solo admite "sin asignar" con el valor true.'],
    ["un abogado de destino que no es un entero", [{ caseId: 1, responsibleLawyerId: "4" }], "La causa 1 no indica un abogado de destino válido."],
  ])("rechaza %s con el detalle en `reassignments`", (_caso, raw, reason) => {
    expect(reasonOf(raw)).toBe(reason);
  });

  it("informa la primera falla, en el orden de las entradas", () => {
    expect(reasonOf([{ caseId: 1, unassigned: true }, { caseId: 2 }, { caseId: 3 }])).toBe(
      'La causa 2 debe indicar un abogado o "sin asignar".',
    );
  });
});

describe("CaseReassignmentPlan.assertApplicableTo", () => {
  const context = (overrides = {}) => ({
    lawyerId: 3,
    activeCaseIds: [1, 2],
    activeTargetLawyerIds: new Set([4]),
    ...overrides,
  });

  it("acepta un reparto de causas activas del abogado hacia abogados vigentes, o sin asignar", () => {
    const plan = CaseReassignmentPlan.parse([
      { caseId: 1, responsibleLawyerId: 4 },
      { caseId: 2, unassigned: true },
    ]);

    expect(() => plan.assertApplicableTo(context())).not.toThrow();
  });

  it("rechaza una causa que no es una causa activa de este abogado, con el texto del contrato", () => {
    const plan = CaseReassignmentPlan.parse([{ caseId: 12, unassigned: true }]);

    expect(() => plan.assertApplicableTo(context())).toThrow("Los datos enviados no son válidos.");
    try {
      plan.assertApplicableTo(context());
    } catch (error) {
      expect(details(error)).toEqual({ reassignments: "La causa 12 no es una causa activa de este abogado." });
    }
  });

  it.each([
    ["el mismo que se da de baja", { caseId: 1, responsibleLawyerId: 3 }],
    ["uno inexistente o dado de baja", { caseId: 1, responsibleLawyerId: 99 }],
  ])("rechaza como abogado de destino a %s", (_caso, entry) => {
    const plan = CaseReassignmentPlan.parse([entry]);

    expect(() => plan.assertApplicableTo(context())).toThrow(InvalidReassignmentsError);
  });
});

describe("CaseReassignmentPlan.assertCovers", () => {
  it("acepta un reparto que cubre todas las causas activas", () => {
    const plan = CaseReassignmentPlan.parse([
      { caseId: 1, responsibleLawyerId: 4 },
      { caseId: 2, unassigned: true },
    ]);

    expect(() => plan.assertCovers([1, 2])).not.toThrow();
  });

  it("una causa activa que no figura es 409: nunca queda huérfana por omisión", () => {
    const plan = CaseReassignmentPlan.parse([{ caseId: 1, responsibleLawyerId: 4 }]);

    expect(() => plan.assertCovers([1, 2])).toThrow(LawyerHasDependenciesError);
  });

  it("un abogado sin causas activas no necesita reparto", () => {
    expect(() => CaseReassignmentPlan.parse(undefined).assertCovers([])).not.toThrow();
  });
});
