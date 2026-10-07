import {
  CasePage,
  CaseQueryPort,
  CaseSearchCriteria,
} from "../../domain/ports/case-query.port";
import { CaseListItem } from "../read-models/case-list-item";
import { ListCasesUseCase } from "./list-cases.use-case";

/**
 * Imita lo que hace el adaptador de Prisma: solo causas vigentes,
 * filtradas por cliente, y el corte de la página. Fiel a propósito —
 * un fake que filtrara distinto dejaría pasar un test contra un
 * comportamiento que producción no tiene.
 */
class FakeCaseQuery implements CaseQueryPort {
  constructor(private readonly all: CaseListItem[] = []) {}
  lastCriteria?: CaseSearchCriteria;

  async search(criteria: CaseSearchCriteria): Promise<CasePage> {
    this.lastCriteria = criteria;

    const matches = this.all
      .filter((item) => item.active)
      .filter(
        (item) =>
          criteria.clientId === undefined ||
          item.client.id === criteria.clientId,
      );

    const offset = (criteria.page - 1) * criteria.limit;
    return {
      items: matches.slice(offset, offset + criteria.limit),
      totalItems: matches.length,
    };
  }
}

function aCase(overrides: Partial<CaseListItem> = {}): CaseListItem {
  return {
    id: 1,
    sacNumber: "13284571",
    caption: "GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
    court: "Juzgado de Control N° 3",
    startDate: new Date("2026-03-01T00:00:00Z"),
    active: true,
    client: { id: 1, lastName: "GÓMEZ", firstName: "Ariel", dni: "34812905" },
    responsibleLawyer: {
      id: 3,
      fullName: "Dra. Malena Ríos",
      registrationNumber: "1-36842",
    },
    currentState: {
      proceduralStateId: 4,
      name: "Alegato",
      custom: false,
      dueDate: new Date("2026-09-11T00:00:00Z"),
    },
    ...overrides,
  };
}

describe("ListCasesUseCase", () => {
  const page = { page: 1, limit: 20 };

  // CA-9.4 — las causas de un cliente, con estado y vencimiento.
  it("filters by client", async () => {
    const query = new FakeCaseQuery([
      aCase({ id: 1, client: { id: 1, lastName: "GÓMEZ", firstName: "A", dni: "1111111" } }),
      aCase({ id: 2, client: { id: 2, lastName: "OTRO", firstName: "B", dni: "2222222" } }),
    ]);

    const result = await new ListCasesUseCase(query).execute({
      ...page,
      clientId: 1,
    });

    expect(result.cases.map((c) => c.id)).toEqual([1]);
    expect(result.totalItems).toBe(1);
  });

  it("carries the procedural state and its due date", async () => {
    const query = new FakeCaseQuery([aCase()]);

    const result = await new ListCasesUseCase(query).execute(page);

    expect(result.cases[0].currentState).toEqual({
      proceduralStateId: 4,
      name: "Alegato",
      custom: false,
      dueDate: new Date("2026-09-11T00:00:00Z"),
    });
  });

  it("handles a case written into a hand-typed state", async () => {
    const query = new FakeCaseQuery([
      aCase({
        currentState: {
          proceduralStateId: null,
          name: "A la espera del perito",
          custom: true,
          dueDate: null,
        },
      }),
    ]);

    const result = await new ListCasesUseCase(query).execute(page);

    expect(result.cases[0].currentState?.custom).toBe(true);
    expect(result.cases[0].currentState?.dueDate).toBeNull();
  });

  /** Una causa en su estado inicial todavía no tiene acto procesal. */
  it("handles a case still in its initial state", async () => {
    const query = new FakeCaseQuery([aCase({ currentState: null })]);

    const result = await new ListCasesUseCase(query).execute(page);

    expect(result.cases[0].currentState).toBeNull();
  });

  it("does not list cases that were given up", async () => {
    const query = new FakeCaseQuery([
      aCase({ id: 1 }),
      aCase({ id: 2, active: false }),
    ]);

    const result = await new ListCasesUseCase(query).execute(page);

    expect(result.cases.map((c) => c.id)).toEqual([1]);
  });

  it("passes the page through untouched", async () => {
    const query = new FakeCaseQuery([]);

    await new ListCasesUseCase(query).execute({
      page: 3,
      limit: 5,
      clientId: 7,
    });

    expect(query.lastCriteria).toEqual({ page: 3, limit: 5, clientId: 7 });
  });
});
