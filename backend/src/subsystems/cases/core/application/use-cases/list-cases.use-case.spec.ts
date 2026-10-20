import {
  CaseListItem,
  CasePage,
  CaseQueryPort,
  CaseSearchCriteria,
} from '../../domain/ports/case-query.port';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';
import { ProceduralRole } from '../../domain/value-objects/procedural-role';
import { CaseQueryCountsUnused } from '../../test-support/case-fakes';
import { CLIENT, LAWYER, day } from '../../test-support/case-fixtures';
import { ListCases } from './list-cases.use-case';

/** Records the criteria it was asked for, so the spec can assert what travelled. */
class SpyCaseQuery extends CaseQueryCountsUnused implements CaseQueryPort {
  lastCriteria: CaseSearchCriteria | null = null;

  constructor(private readonly page: CasePage = { items: [], totalItems: 0 }) {
    super();
  }

  async search(criteria: CaseSearchCriteria): Promise<CasePage> {
    this.lastCriteria = criteria;
    return this.page;
  }

  async findById(): Promise<CaseListItem | null> {
    return null;
  }

  async listCustomStates(): Promise<string[]> {
    return [];
  }
}

function anItem(dueDate: Date | null): CaseListItem {
  return {
    id: 1,
    sacNumber: '12345678',
    caption: 'CAUSA',
    court: null,
    jurisdiction: JurisdictionCode.CRIMINAL,
    proceduralRole: ProceduralRole.DEFENSA,
    instructorName: null,
    tribunalPhone: null,
    instructorExtension: null,
    counterparty: null,
    subjectMatter: null,
    client: CLIENT,
    responsibleLawyer: LAWYER,
    legalQualifications: [],
    startDate: day('2026-09-01'),
    currentState: {
      proceduralStateId: 4,
      name: 'Alegato',
      custom: false,
      initial: false,
      proceduralActId: 18,
      dueDate,
      // Como lo deja el adaptador: la persistencia no lee el reloj.
      businessDaysRemaining: null,
      manuallyAdjusted: false,
    },
    folder: null,
    active: true,
  };
}

/** Clock fixed on Tuesday 15/09/2026, the date of the contract's examples. */
const clockOn = (iso: string) => ({ now: () => day(iso), today: () => day(iso) });

const page = { page: 1, limit: 20 };

describe('ListCases', () => {
  it('completa businessDaysRemaining contra la fecha de hoy', async () => {
    const query = new SpyCaseQuery({ items: [anItem(day('2026-09-16'))], totalItems: 1 });
    const useCase = new ListCases(query, clockOn('2026-09-15'));

    const result = await useCase.execute(page);

    // Ejemplo del contrato §3.7: vence el 16, consultado el martes 15 → 1.
    expect(result.items[0].currentState.businessDaysRemaining).toBe(1);
  });

  it('devuelve negativo cuando el plazo ya venció', async () => {
    const query = new SpyCaseQuery({ items: [anItem(day('2026-09-11'))], totalItems: 1 });
    const useCase = new ListCases(query, clockOn('2026-09-15'));

    const result = await useCase.execute(page);

    expect(result.items[0].currentState.businessDaysRemaining).toBe(-2);
  });

  it('deja businessDaysRemaining en null cuando la causa no tiene vencimiento', async () => {
    const query = new SpyCaseQuery({ items: [anItem(null)], totalItems: 1 });
    const useCase = new ListCases(query, clockOn('2026-09-15'));

    const result = await useCase.execute(page);

    expect(result.items[0].currentState.businessDaysRemaining).toBeNull();
  });

  it('no toca ningún otro campo del recurso', async () => {
    const original = anItem(day('2026-09-16'));
    const query = new SpyCaseQuery({ items: [original], totalItems: 1 });
    const useCase = new ListCases(query, clockOn('2026-09-15'));

    const [item] = (await useCase.execute(page)).items;

    expect({ ...item, currentState: null }).toEqual({ ...original, currentState: null });
    expect({ ...item.currentState, businessDaysRemaining: null }).toEqual(original.currentState);
  });

  it('pasa el total tal como lo devuelve el puerto', async () => {
    const query = new SpyCaseQuery({ items: [], totalItems: 42 });
    const useCase = new ListCases(query, clockOn('2026-09-15'));

    expect((await useCase.execute(page)).totalItems).toBe(42);
  });

  it('reenvía los criterios al puerto sin agregar filtros propios', async () => {
    // RN11: el caso de uso NO puede agregar un filtro por el usuario autenticado.
    const query = new SpyCaseQuery();
    const useCase = new ListCases(query, clockOn('2026-09-15'));
    const criteria: CaseSearchCriteria = {
      ...page,
      search: 'gómez',
      responsibleLawyerId: 3,
      state: { kind: 'withoutProceduralActs' },
    };

    await useCase.execute(criteria);

    expect(query.lastCriteria).toEqual(criteria);
  });
});
