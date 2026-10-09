import { CaseQueryPort } from "../../domain/ports/case-query.port";
import { CountActiveCasesByProceduralState } from "./count-active-cases-by-procedural-state.use-case";

describe("CountActiveCasesByProceduralState", () => {
  let cases: jest.Mocked<CaseQueryPort>;
  let useCase: CountActiveCasesByProceduralState;

  beforeEach(() => {
    // A mock, not a fake: the filtering lives in SQL (covered by the
    // integration tests); here only the delegation is under test.
    cases = {
      search: jest.fn(),
      countActiveByProceduralStates: jest.fn().mockResolvedValue(new Map()),
    };
    useCase = new CountActiveCasesByProceduralState(cases);
  });

  it("asks the query port for the given state ids", async () => {
    await useCase.execute({ stateIds: [4, 9] });

    expect(cases.countActiveByProceduralStates).toHaveBeenCalledWith([4, 9]);
  });

  it("drops repeated ids before querying", async () => {
    await useCase.execute({ stateIds: [4, 9, 4, 4] });

    expect(cases.countActiveByProceduralStates).toHaveBeenCalledWith([4, 9]);
  });

  it("returns the counts of the query port unchanged", async () => {
    const counts = new Map([[4, 2]]);
    cases.countActiveByProceduralStates.mockResolvedValue(counts);

    await expect(useCase.execute({ stateIds: [4, 9] })).resolves.toBe(counts);
  });
});
