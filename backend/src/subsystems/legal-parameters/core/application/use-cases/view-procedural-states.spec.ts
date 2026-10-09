import { ViewProceduralStates } from './view-procedural-states.use-case';
import { ProceduralStateRepository } from '../../domain/ports/procedural-states.repository';
import { ProceduralState, ProceduralStateProps } from '../../domain/entities/procedural-states';
import { Jurisdiction } from '../../domain/entities/jurisdiction';
import { DayType } from '../../domain/entities/day-types';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';
import { FakeActiveCasesCounter } from './test-support/procedural-state-fakes';

function aJurisdiction(code: JurisdictionCode = JurisdictionCode.CRIMINAL): Jurisdiction {
  return Jurisdiction.hydrate({ id: 1, code, dayTypeDefault: DayType.BUSINESS, isActive: true });
}

function aProceduralState(overrides: Partial<ProceduralStateProps> = {}): ProceduralState {
  return ProceduralState.hydrate({
    id: 1,
    name: 'Citación a juicio',
    timeLimitDays: 5,
    dayType: DayType.BUSINESS,
    terminal: false,
    isInitial: false,
    isActive: true,
    jurisdiction: aJurisdiction(),
    createdAt: new Date('2026-09-27T00:00:00Z'),
    ...overrides,
  });
}

function aPage(items: ProceduralState[]): PaginatedResult<ProceduralState> {
  return { items, total: items.length, page: 1, limit: 20, totalPages: items.length ? 1 : 0 };
}

describe('ViewProceduralStates', () => {
  let repository: jest.Mocked<ProceduralStateRepository>;
  let counter: FakeActiveCasesCounter;
  let useCase: ViewProceduralStates;

  beforeEach(() => {
    // A mock, not the fake: these specs assert *how* `findPaginated` is
    // called. The other methods are never used here but the type needs them.
    repository = {
      findPaginated: jest.fn().mockResolvedValue(aPage([])),
      findById: jest.fn(),
      existsByName: jest.fn(),
      findInitialByJurisdiction: jest.fn(),
      findJurisdictionByCode: jest.fn(),
      nextId: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    counter = new FakeActiveCasesCounter();
    useCase = new ViewProceduralStates(repository, counter);
  });

  describe('activeCases', () => {
    it('pairs each state with its own count', async () => {
      repository.findPaginated.mockResolvedValue(
        aPage([aProceduralState({ id: 1 }), aProceduralState({ id: 2, name: 'Archivada' })]),
      );
      counter.counts.set(1, 7);
      counter.counts.set(2, 3);

      const result = await useCase.getAll({ page: 1, limit: 20 });

      expect(result.items.map((view) => [view.procState.id, view.activeCases])).toEqual([
        [1, 7],
        [2, 3],
      ]);
    });

    it('reports 0 for a state with no active cases', async () => {
      repository.findPaginated.mockResolvedValue(aPage([aProceduralState({ id: 1 })]));

      const result = await useCase.getAll({ page: 1, limit: 20 });

      expect(result.items[0].activeCases).toBe(0);
    });

    it('asks for the counts of the whole page in a single call', async () => {
      repository.findPaginated.mockResolvedValue(
        aPage([aProceduralState({ id: 1 }), aProceduralState({ id: 2 }), aProceduralState({ id: 3 })]),
      );

      await useCase.getAll({ page: 1, limit: 20 });

      expect(counter.calls).toEqual([[1, 2, 3]]);
    });

    it('does not call the counter for an empty page', async () => {
      await useCase.getAll({ page: 1, limit: 20 });

      expect(counter.calls).toEqual([]);
    });

    it('keeps the pagination of the repository page', async () => {
      repository.findPaginated.mockResolvedValue({
        items: [aProceduralState({ id: 1 })],
        total: 41,
        page: 3,
        limit: 20,
        totalPages: 3,
      });

      const result = await useCase.getAll({ page: 3, limit: 20 });

      expect(result).toMatchObject({ total: 41, page: 3, limit: 20, totalPages: 3 });
    });
  });

  it('forwards page and limit to the repository unchanged', async () => {
    await useCase.getAll({ page: 3, limit: 15 });

    expect(repository.findPaginated).toHaveBeenCalledWith(expect.any(Object), 3, 15);
  });

  it('forwards the jurisdiction filter unchanged', async () => {
    await useCase.getAll({ page: 1, limit: 20, jurisdiction: JurisdictionCode.AMPARO });

    expect(repository.findPaginated).toHaveBeenCalledWith(
      { jurisdiction: JurisdictionCode.AMPARO, search: undefined },
      1,
      20,
    );
  });

  it('trims the search term', async () => {
    await useCase.getAll({ page: 1, limit: 20, search: '  cit  ' });

    expect(repository.findPaginated).toHaveBeenCalledWith({ jurisdiction: undefined, search: 'cit' }, 1, 20);
  });

  it.each(['', '   '])('treats a blank search (%p) as no filter', async (search) => {
    await useCase.getAll({ page: 1, limit: 20, search });

    expect(repository.findPaginated).toHaveBeenCalledWith({ jurisdiction: undefined, search: undefined }, 1, 20);
  });

  it('sends an empty filter when no filters are given', async () => {
    await useCase.getAll({ page: 1, limit: 20 });

    expect(repository.findPaginated).toHaveBeenCalledWith({ jurisdiction: undefined, search: undefined }, 1, 20);
  });

  it('returns the repository page, keeping each state with its jurisdiction', async () => {
    const page = aPage([
      aProceduralState({ id: 1, jurisdiction: aJurisdiction(JurisdictionCode.CRIMINAL) }),
      aProceduralState({ id: 2, name: 'Archivada', jurisdiction: aJurisdiction(JurisdictionCode.ADMINISTRATIVE) }),
    ]);
    repository.findPaginated.mockResolvedValue(page);

    const result = await useCase.getAll({ page: 1, limit: 20 });

    expect(result.items.map((view) => view.procState)).toEqual(page.items);
    expect(result.items.map((view) => view.procState.jurisdiction.code)).toEqual([
      JurisdictionCode.CRIMINAL,
      JurisdictionCode.ADMINISTRATIVE,
    ]);
  });

  it('propagates repository failures', async () => {
    repository.findPaginated.mockRejectedValue(new Error('database down'));

    await expect(useCase.getAll({ page: 1, limit: 20 })).rejects.toThrow('database down');
  });
});
