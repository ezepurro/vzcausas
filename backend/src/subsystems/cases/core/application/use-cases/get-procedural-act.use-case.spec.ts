import { CaseNotFoundError, ProceduralActNotFoundError } from '../../domain/errors/case.errors';
import {
  ProceduralActPage,
  ProceduralActQueryPort,
  ProceduralActView,
} from '../../domain/ports/procedural-act-query.port';
import { anAct } from '../../test-support/case-fixtures';
import { GetProceduralAct } from './get-procedural-act.use-case';

/** Holds acts by id, each with its case: `findInCase` only answers for the right pair. */
class FakeActQuery implements ProceduralActQueryPort {
  existingCases = new Set<number>([1, 2]);
  views = new Map<number, ProceduralActView>();
  findCalls = 0;

  async caseExists(caseId: number): Promise<boolean> {
    return this.existingCases.has(caseId);
  }

  async listByCase(): Promise<ProceduralActPage> {
    throw new Error('not used by this use case');
  }

  async findInCase(caseId: number, actId: number): Promise<ProceduralActView | null> {
    this.findCalls += 1;
    const view = this.views.get(actId);
    return view && view.act.caseId === caseId ? view : null;
  }
}

describe('GetProceduralAct', () => {
  let query: FakeActQuery;
  let useCase: GetProceduralAct;
  const view: ProceduralActView = {
    act: anAct({ id: 10, caseId: 1 }),
    resultingStateName: 'Citación a juicio',
    registeredBy: { lastName: 'Ríos', firstName: 'Malena' },
  };

  beforeEach(() => {
    query = new FakeActQuery();
    query.views.set(10, view);
    useCase = new GetProceduralAct(query);
  });

  // CA-27.8
  it('devuelve el acto de la causa', async () => {
    await expect(useCase.execute({ caseId: 1, actId: 10 })).resolves.toBe(view);
  });

  it('un acto inexistente lanza ProceduralActNotFoundError', async () => {
    await expect(useCase.execute({ caseId: 1, actId: 999 })).rejects.toBeInstanceOf(ProceduralActNotFoundError);
  });

  /** El acto existe, pero es de la causa 1: pedido por la causa 2 no existe. */
  it('un acto de otra causa lanza ProceduralActNotFoundError', async () => {
    await expect(useCase.execute({ caseId: 2, actId: 10 })).rejects.toBeInstanceOf(ProceduralActNotFoundError);
  });

  // CA-27.10
  it('verifica la causa antes que el acto', async () => {
    await expect(useCase.execute({ caseId: 99, actId: 10 })).rejects.toBeInstanceOf(CaseNotFoundError);

    expect(query.findCalls).toBe(0);
  });
});
