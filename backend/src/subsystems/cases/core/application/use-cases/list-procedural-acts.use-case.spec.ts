import { CaseNotFoundError } from '../../domain/errors/case.errors';
import {
  ProceduralActPage,
  ProceduralActQueryPort,
  ProceduralActView,
} from '../../domain/ports/procedural-act-query.port';
import { anAct } from '../../test-support/case-fixtures';
import { ListProceduralActs } from './list-procedural-acts.use-case';

class SpyActQuery implements ProceduralActQueryPort {
  existingCases = new Set<number>([1]);
  page: ProceduralActPage = { items: [], totalItems: 0 };
  listCalls: [number, number, number][] = [];

  async caseExists(caseId: number): Promise<boolean> {
    return this.existingCases.has(caseId);
  }

  async listByCase(caseId: number, page: number, limit: number): Promise<ProceduralActPage> {
    this.listCalls.push([caseId, page, limit]);
    return this.page;
  }

  async findInCase(): Promise<ProceduralActView | null> {
    throw new Error('not used by this use case');
  }
}

function aView(id: number): ProceduralActView {
  return {
    act: anAct({ id }),
    resultingStateName: 'Oposición al requerimiento de elevación',
    registeredBy: { fullName: 'Dra. Malena Ríos' },
  };
}

describe('ListProceduralActs', () => {
  let query: SpyActQuery;
  let useCase: ListProceduralActs;

  beforeEach(() => {
    query = new SpyActQuery();
    useCase = new ListProceduralActs(query);
  });

  it('devuelve la página del puerto tal cual, con el total', async () => {
    query.page = { items: [aView(2), aView(1)], totalItems: 7 };

    const result = await useCase.execute({ caseId: 1, page: 2, limit: 5 });

    expect(result).toBe(query.page);
    expect(query.listCalls).toEqual([[1, 2, 5]]);
  });

  // CA-27.7
  it('una causa sin actos devuelve una página vacía, no un error', async () => {
    const result = await useCase.execute({ caseId: 1, page: 1, limit: 20 });

    expect(result).toEqual({ items: [], totalItems: 0 });
  });

  // CA-27.10
  it('una causa inexistente o dada de baja lanza CaseNotFoundError sin buscar actos', async () => {
    await expect(useCase.execute({ caseId: 99, page: 1, limit: 20 })).rejects.toBeInstanceOf(CaseNotFoundError);

    expect(query.listCalls).toEqual([]);
  });
});
