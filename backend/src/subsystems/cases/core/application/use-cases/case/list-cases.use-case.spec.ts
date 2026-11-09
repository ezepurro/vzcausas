import {
  CaseDueDateKey,
  CaseListItem,
  CaseRepository,
  CaseSearchCriteria,
  CaseSearchFilters,
} from '../../../domain/ports/case/case.repository';
import { JurisdictionCode } from '../../../domain/value-objects/case/jurisdiction-code';
import { ProceduralRole } from '../../../domain/value-objects/case/procedural-role';
import { UnusedCaseRepository } from '../../../test-support/case-fakes';
import { CLIENT, LAWYER, day } from '../../../test-support/case-fixtures';
import { ListCases } from './list-cases.use-case';

/**
 * Holds the cases that match the filters, in the order given — **not** the
 * urgency order, which is the use case's to decide. Records what it was asked
 * for, so the spec can assert what travelled.
 */
class SpyCaseQuery extends UnusedCaseRepository implements CaseRepository {
  lastFilters: CaseSearchFilters | null = null;
  idsAskedFor: number[][] = [];

  constructor(private readonly matching: CaseListItem[] = []) {
    super();
  }

  async findDueDateKeys(filters: CaseSearchFilters): Promise<CaseDueDateKey[]> {
    this.lastFilters = filters;
    return this.matching.map((item) => ({ id: item.id, dueDate: item.currentState.dueDate }));
  }

  async findListItemsByIds(ids: readonly number[]): Promise<CaseListItem[]> {
    this.idsAskedFor.push([...ids]);
    // Reversed on purpose: the repository promises no order.
    return this.matching.filter((item) => ids.includes(item.id)).reverse();
  }
}

function anItem(dueDate: Date | null, id = 1): CaseListItem {
  return {
    id,
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
    clientDetained: false,
    injunctionGranted: null,
    harmfulActDate: null,
    harmfulActRenews: null,
    harmfulActRenewalDays: null,
    harmfulActTermDays: null,
    harmfulActTermDayType: null,
    harmfulActDeadline: null,
    administrativeRemedyExhaustedOn: null,
    courtFeePaid: false,
    client: CLIENT,
    responsibleLawyer: LAWYER,
    legalQualifications: [],
    interruptiveActDates: [],
    prescription: null,
    prescriptionDeclaration: null,
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
    const query = new SpyCaseQuery([anItem(day('2026-09-16'))]);
    const useCase = new ListCases(query, clockOn('2026-09-15'));

    const result = await useCase.execute(page);

    // Ejemplo del contrato §3.7: vence el 16, consultado el martes 15 → 1.
    expect(result.items[0].currentState.businessDaysRemaining).toBe(1);
  });

  it('devuelve negativo cuando el plazo ya venció', async () => {
    const query = new SpyCaseQuery([anItem(day('2026-09-11'))]);
    const useCase = new ListCases(query, clockOn('2026-09-15'));

    const result = await useCase.execute(page);

    expect(result.items[0].currentState.businessDaysRemaining).toBe(-2);
  });

  it('deja businessDaysRemaining en null cuando la causa no tiene vencimiento', async () => {
    const query = new SpyCaseQuery([anItem(null)]);
    const useCase = new ListCases(query, clockOn('2026-09-15'));

    const result = await useCase.execute(page);

    expect(result.items[0].currentState.businessDaysRemaining).toBeNull();
  });

  it('no toca ningún otro campo del recurso', async () => {
    const original = anItem(day('2026-09-16'));
    const query = new SpyCaseQuery([original]);
    const useCase = new ListCases(query, clockOn('2026-09-15'));

    const [item] = (await useCase.execute(page)).items;

    expect({ ...item, currentState: null }).toEqual({ ...original, currentState: null });
    expect({ ...item.currentState, businessDaysRemaining: null }).toEqual(original.currentState);
  });

  it('reenvía los filtros al puerto sin agregar filtros propios', async () => {
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

    // La página no viaja: ordenar y paginar es de este caso de uso.
    expect(query.lastFilters).toEqual({
      search: 'gómez',
      responsibleLawyerId: 3,
      state: { kind: 'withoutProceduralActs' },
    });
  });
});

describe('ListCases: orden por urgencia y paginación (CA-20.1)', () => {
  const clock = clockOn('2026-09-15');

  it('ordena por vencimiento ascendente, con las vencidas primero y las sin vencimiento al final, por id', async () => {
    const query = new SpyCaseQuery([
      anItem(null, 5),
      anItem(day('2026-12-01'), 2),
      anItem(null, 3),
      anItem(day('2026-09-11'), 4), // ya vencida: la fecha más chica
      anItem(day('2026-12-01'), 1), // mismo vencimiento que la 2: desempata el id
    ]);

    const { items } = await new ListCases(query, clock).execute(page);

    expect(items.map((item) => item.id)).toEqual([4, 1, 2, 3, 5]);
  });

  it('devuelve la página pedida y el total del conjunto filtrado, no el de la página', async () => {
    const query = new SpyCaseQuery([anItem(null, 1), anItem(null, 2), anItem(null, 3)]);
    const useCase = new ListCases(query, clock);

    const primera = await useCase.execute({ page: 1, limit: 2 });
    const segunda = await useCase.execute({ page: 2, limit: 2 });

    expect(primera).toMatchObject({ totalItems: 3 });
    expect(primera.items.map((item) => item.id)).toEqual([1, 2]);
    expect(segunda).toMatchObject({ totalItems: 3 });
    expect(segunda.items.map((item) => item.id)).toEqual([3]);
  });

  it('pide al repositorio solo las causas de la página', async () => {
    const query = new SpyCaseQuery([anItem(null, 1), anItem(null, 2), anItem(null, 3)]);

    await new ListCases(query, clock).execute({ page: 2, limit: 2 });

    expect(query.idsAskedFor).toEqual([[3]]);
  });

  it('sin causas, o con una página fuera de rango, no pide el recurso y devuelve el total real', async () => {
    const vacio = new SpyCaseQuery();
    const tres = new SpyCaseQuery([anItem(null, 1), anItem(null, 2), anItem(null, 3)]);

    expect(await new ListCases(vacio, clock).execute(page)).toEqual({ items: [], totalItems: 0 });
    expect(await new ListCases(tres, clock).execute({ page: 5, limit: 2 })).toEqual({ items: [], totalItems: 3 });
    expect(vacio.idsAskedFor).toEqual([]);
    expect(tres.idsAskedFor).toEqual([]);
  });
});

describe('ListCases: prescription (V4 §3.7)', () => {
  const robo = {
    id: 1,
    name: 'Robo calificado — art. 167 inc. 2 CP',
    prescriptionMonths: 96,
    offenseDate: day('2021-02-27'),
    prescriptionStartsOn: day('2024-07-04'),
    prescriptionExpiresOn: day('2032-07-04'),
    // Como lo deja el adaptador: la persistencia no lee el reloj (D-112).
    prescriptionStatus: null,
    prescriptionDeclaration: null,
  };

  async function listOne(item: CaseListItem) {
    const useCase = new ListCases(new SpyCaseQuery([item]), clockOn('2026-09-15'));
    return (await useCase.execute(page)).items[0];
  }

  it('calcula la prescripción que rige una causa penal, reiniciada por el acto interruptivo', async () => {
    // Es la causa del ejemplo del contrato (GET /cases/{caseId}): consultada el 15/09/2026, 27 %.
    const item = await listOne({
      ...anItem(null),
      legalQualifications: [robo],
      interruptiveActDates: [day('2024-07-04')],
    });

    expect(item.prescription).toEqual({
      legalQualificationId: 1,
      legalQualificationName: 'Robo calificado — art. 167 inc. 2 CP',
      startsOn: day('2024-07-04'),
      expiresOn: day('2032-07-04'),
      elapsedPercentage: 27,
      alert: false,
      expired: false,
      // Del 15/09/2026 al 04/07/2032.
      remainingDays: 2119,
      lastInterruptiveActDate: day('2024-07-04'),
    });
  });

  // D-112: cada calificación con su estado; `prescription` sigue siendo la vencida (D-52).
  it('completa el estado de prescripción de cada calificación, y la que rige sigue siendo la de plazo cumplido', async () => {
    // Consultada el 15/09/2026, con el acto interruptivo del 04/07/2024: Lesiones (24 meses)
    // venció el 04/07/2026; Robo (96 meses) vence el 04/07/2032 y va por el 27 %.
    const lesiones = {
      ...robo,
      id: 2,
      name: 'Lesiones leves — art. 89 CP',
      prescriptionMonths: 24,
      prescriptionExpiresOn: day('2026-07-04'),
    };
    const item = await listOne({
      ...anItem(null),
      legalQualifications: [robo, lesiones],
      interruptiveActDates: [day('2024-07-04')],
    });

    expect(item.legalQualifications.map((q) => [q.id, q.prescriptionStatus])).toEqual([
      [1, { elapsedPercentage: 27, alert: false, expired: false }],
      [2, { elapsedPercentage: 100, alert: true, expired: true }],
    ]);
    expect(item.prescription).toMatchObject({ legalQualificationId: 2, elapsedPercentage: 100, expired: true });
  });

  it('una causa penal sin calificaciones no computa prescripción (D-74)', async () => {
    expect((await listOne(anItem(null))).prescription).toBeNull();
  });

  it('fuera del fuero penal la prescripción vale null aunque hubiera calificaciones', async () => {
    const item = await listOne({
      ...anItem(null),
      jurisdiction: JurisdictionCode.AMPARO,
      legalQualifications: [robo],
    });

    expect(item.prescription).toBeNull();
  });

  it('una causa marcada como prescripta conserva su prescripción como dato histórico', async () => {
    const item = await listOne({
      ...anItem(null),
      legalQualifications: [robo],
      prescriptionDeclaration: {
        prescriptionDate: day('2026-09-15'),
        resolution: 'Sentencia N° 214',
        grounds: null,
        registeredBy: { id: 1, lastName: 'Vázquez', firstName: 'Fernando G.' },
        registeredAt: day('2026-09-15'),
      },
    });

    expect(item.prescription).not.toBeNull();
    expect(item.prescriptionDeclaration).not.toBeNull();
  });
});
