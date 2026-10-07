import { ViewProceduralStates } from './view-procedural-states.use-case';
import { ProceduralStateRepository } from '../../domain/ports/procedural-states.repository';
import { ProceduralState, ProceduralStateProps } from '../../domain/entities/procedural-states';
import { Jurisdiction } from '../../domain/entities/jurisdiction';
import { DayType } from '../../domain/entities/day-types';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';

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
  let useCase: ViewProceduralStates;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findAll: jest.fn(),
      findInitialByJurisdiction: jest.fn(),
      findPaginated: jest.fn().mockResolvedValue(aPage([])),
    };
    useCase = new ViewProceduralStates(repository);
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

    expect(repository.findPaginated).toHaveBeenCalledWith(
      { jurisdiction: undefined, search: 'cit' },
      1,
      20,
    );
  });

  it.each(['', '   '])('treats a blank search (%p) as no filter', async (search) => {
    await useCase.getAll({ page: 1, limit: 20, search });

    expect(repository.findPaginated).toHaveBeenCalledWith(
      { jurisdiction: undefined, search: undefined },
      1,
      20,
    );
  });

  it('sends an empty filter when no filters are given', async () => {
    await useCase.getAll({ page: 1, limit: 20 });

    expect(repository.findPaginated).toHaveBeenCalledWith(
      { jurisdiction: undefined, search: undefined },
      1,
      20,
    );
  });

  it('returns the repository page, keeping each state with its jurisdiction', async () => {
    const page = aPage([
      aProceduralState({ id: 1, jurisdiction: aJurisdiction(JurisdictionCode.CRIMINAL) }),
      aProceduralState({ id: 2, name: 'Archivada', jurisdiction: aJurisdiction(JurisdictionCode.ADMINISTRATIVE) }),
    ]);
    repository.findPaginated.mockResolvedValue(page);

    const result = await useCase.getAll({ page: 1, limit: 20 });

    expect(result).toBe(page);
    expect(result.items.map((s) => s.jurisdiction.code)).toEqual([
      JurisdictionCode.CRIMINAL,
      JurisdictionCode.ADMINISTRATIVE,
    ]);
  });

  it('propagates repository failures', async () => {
    repository.findPaginated.mockRejectedValue(new Error('database down'));

    await expect(useCase.getAll({ page: 1, limit: 20 })).rejects.toThrow('database down');
  });
});
