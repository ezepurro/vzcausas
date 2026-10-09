import { CountActiveCasesByProceduralState } from '@subsystems/cases/core/application/use-cases/count-active-cases-by-procedural-state.use-case';
import { CasesActiveCasesCounterAdapter } from './cases-active-cases-counter.adapter';

describe('CasesActiveCasesCounterAdapter', () => {
  let execute: jest.Mock;
  let adapter: CasesActiveCasesCounterAdapter;

  beforeEach(() => {
    // Only `execute` is used: the use case of `cases` is replaced by a mock
    // so this spec tests the translation alone, not `cases`.
    execute = jest.fn();
    adapter = new CasesActiveCasesCounterAdapter({ execute } as unknown as CountActiveCasesByProceduralState);
  });

  it('forwards the requested ids to the use case of cases', async () => {
    execute.mockResolvedValue(new Map());

    await adapter.countByStates([3, 5]);

    expect(execute).toHaveBeenCalledWith({ stateIds: [3, 5] });
  });

  it('returns the counts that cases reports', async () => {
    execute.mockResolvedValue(
      new Map([
        [3, 2],
        [5, 9],
      ]),
    );

    const result = await adapter.countByStates([3, 5]);

    expect([...result]).toEqual([
      [3, 2],
      [5, 9],
    ]);
  });

  it('fills with 0 every requested id that cases leaves out', async () => {
    execute.mockResolvedValue(new Map([[5, 9]]));

    const result = await adapter.countByStates([3, 5, 8]);

    expect([...result]).toEqual([
      [3, 0],
      [5, 9],
      [8, 0],
    ]);
  });

  it('propagates failures of cases', async () => {
    execute.mockRejectedValue(new Error('database down'));

    await expect(adapter.countByStates([3])).rejects.toThrow('database down');
  });
});
