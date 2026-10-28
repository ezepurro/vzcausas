import { InterruptiveAct } from '../../domain/entities/interruptive-act';
import { CaseNotFoundError } from '../../domain/errors/case.errors';
import { InterruptiveActPage, InterruptiveActRepository } from '../../domain/ports/interruptive-act.repository';
import { UnusedInterruptiveActRepository } from '../../test-support/case-fakes';
import { NOW, day } from '../../test-support/case-fixtures';
import { ListInterruptiveActs } from './list-interruptive-acts.use-case';

class SpyActQuery extends UnusedInterruptiveActRepository {
  existingCases = new Set<number>([1]);
  page: InterruptiveActPage = { items: [], totalItems: 0 };
  listCalls: [number, number, number][] = [];

  async caseExists(caseId: number): Promise<boolean> {
    return this.existingCases.has(caseId);
  }

  async listByCase(caseId: number, page: number, limit: number): Promise<InterruptiveActPage> {
    this.listCalls.push([caseId, page, limit]);
    return this.page;
  }
}

const anAct = (id: number) =>
  InterruptiveAct.hydrate({
    id,
    caseId: 1,
    name: 'Indagatoria',
    actDate: day('2024-07-04'),
    notes: null,
    registeredByUserId: 5,
    registeredByLawyerId: 2,
    registeredAt: NOW,
  });

describe('ListInterruptiveActs', () => {
  let query: SpyActQuery;
  let useCase: ListInterruptiveActs;

  beforeEach(() => {
    query = new SpyActQuery();
    useCase = new ListInterruptiveActs(query);
  });

  // CA-31.12
  it('devuelve la página del puerto tal cual', async () => {
    query.page = { items: [{ act: anAct(2), registeredBy: { lastName: 'Ríos', firstName: 'Malena' } }], totalItems: 3 };

    const result = await useCase.execute({ caseId: 1, page: 2, limit: 1 });

    expect(result).toBe(query.page);
    expect(query.listCalls).toEqual([[1, 2, 1]]);
  });

  it('una causa sin actos interruptivos devuelve la página vacía', async () => {
    expect(await useCase.execute({ caseId: 1, page: 1, limit: 20 })).toEqual({ items: [], totalItems: 0 });
  });

  // CA-31.14
  it('una causa inexistente o dada de baja lanza CaseNotFoundError sin buscar actos', async () => {
    await expect(useCase.execute({ caseId: 99, page: 1, limit: 20 })).rejects.toBeInstanceOf(CaseNotFoundError);
    expect(query.listCalls).toEqual([]);
  });
});
