import {
  CaseListItem,
  CasePage,
  CaseRepository,
} from '../../core/domain/ports/case.repository';
import { UnusedCaseRepository } from '../../core/test-support/case-fakes';
import { LegalParametersActiveCasesCounterAdapter } from './legal-parameters-active-cases-counter.adapter';

/**
 * Double of {@link CaseRepository} that records what the adapter asked for.
 *
 * It overrides **only** the count by procedural state; the other three keep
 * throwing (`UnusedCaseRepository`), which is what proves the adapter does not
 * reach for a count that is not its own. No test asserts that: if it happened,
 * every test here would fail with the base class's error.
 */
class SpyCaseQuery extends UnusedCaseRepository implements CaseRepository {
  readonly calls: number[][] = [];

  constructor(private readonly counts: ReadonlyMap<number, number> = new Map()) {
    super();
  }

  async search(): Promise<CasePage> {
    return { items: [], totalItems: 0 };
  }

  async findListItemById(): Promise<CaseListItem | null> {
    return null;
  }

  async listCustomStates(): Promise<string[]> {
    return [];
  }

  override async countActiveByProceduralState(stateIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    this.calls.push([...stateIds]);
    return this.counts;
  }
}

describe('LegalParametersActiveCasesCounterAdapter', () => {
  it('devuelve los conteos del puerto de causas, sin tocarlos', async () => {
    const query = new SpyCaseQuery(
      new Map([
        [4, 3],
        [7, 0],
      ]),
    );

    const counts = await new LegalParametersActiveCasesCounterAdapter(query).countByStates([4, 7]);

    expect(counts.get(4)).toBe(3);
    // El 0 lo pone el puerto, no el adaptador: rellenarlo dos veces taparía un
    // puerto que dejó de cumplir su promesa.
    expect(counts.get(7)).toBe(0);
    expect(counts.size).toBe(2);
  });

  it('pide los conteos de todos los estados en UNA sola llamada', async () => {
    // Es la razón de ser de la forma por lote del puerto: `GET
    // /procedural-states` está paginado, y una llamada por fila es el N+1 que
    // esta firma existe para evitar. Un adaptador que itere los ids pasa el
    // test de arriba y falla éste.
    const query = new SpyCaseQuery();

    await new LegalParametersActiveCasesCounterAdapter(query).countByStates([7, 8, 9]);

    expect(query.calls).toEqual([[7, 8, 9]]);
  });

  it('delega también la lista vacía, sin cortocircuitarla', async () => {
    // El guard de la lista vacía vive en el puerto, en un solo lugar
    // (`PrismaCaseRepository.countActiveByProceduralState`). Duplicarlo acá
    // sería una segunda copia que se puede desincronizar.
    const query = new SpyCaseQuery();

    expect(await new LegalParametersActiveCasesCounterAdapter(query).countByStates([])).toEqual(new Map());
    expect(query.calls).toEqual([[]]);
  });
});
