import { NotFoundError } from '@shared/domain/domain-error';
import {
  CaseListItem,
  CasePage,
  CaseQueryPort,
  CaseSearchCriteria,
} from '../../domain/ports/case-query.port';
import { DayType } from '../../domain/value-objects/day-type';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';
import { ProceduralRole } from '../../domain/value-objects/procedural-role';
import { CaseQueryCountsUnused } from '../../test-support/case-fakes';
import { CLIENT, LAWYER, day } from '../../test-support/case-fixtures';
import { GetCase } from './get-case.use-case';

class StubCaseQuery extends CaseQueryCountsUnused implements CaseQueryPort {
  askedFor: number | null = null;

  constructor(private readonly item: CaseListItem | null) {
    super();
  }

  async search(_criteria: CaseSearchCriteria): Promise<CasePage> {
    return { items: [], totalItems: 0 };
  }

  async findById(id: number): Promise<CaseListItem | null> {
    this.askedFor = id;
    return this.item;
  }

  async listCustomStates(): Promise<string[]> {
    return [];
  }
}

function anItem(dueDate: Date | null): CaseListItem {
  return {
    id: 7,
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
    lastInterruptiveActDate: null,
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
      businessDaysRemaining: null,
      manuallyAdjusted: false,
    },
    folder: null,
    active: true,
  };
}

const clockOn = (iso: string) => ({ now: () => day(iso), today: () => day(iso) });

describe('GetCase', () => {
  it('devuelve la causa con businessDaysRemaining calculado contra hoy', async () => {
    const query = new StubCaseQuery(anItem(day('2026-09-16')));
    const useCase = new GetCase(query, clockOn('2026-09-15'));

    const item = await useCase.execute({ id: 7 });

    expect(query.askedFor).toBe(7);
    expect(item.currentState.businessDaysRemaining).toBe(1);
  });

  it('lo deja en null cuando la causa no tiene vencimiento', async () => {
    const useCase = new GetCase(new StubCaseQuery(anItem(null)), clockOn('2026-09-15'));

    const item = await useCase.execute({ id: 7 });

    expect(item.currentState.businessDaysRemaining).toBeNull();
  });

  it('calcula el mismo número que el listado para la misma causa', async () => {
    // El contrato exige que el detalle devuelva el mismo recurso que el
    // listado: los dos usan `withDeadlines`, así que no pueden divergir.
    const original = anItem(day('2026-09-11'));
    const useCase = new GetCase(new StubCaseQuery(original), clockOn('2026-09-15'));

    const item = await useCase.execute({ id: 7 });

    expect(item.currentState.businessDaysRemaining).toBe(-2);
  });

  describe('harmfulActDeadline (D-78)', () => {
    /** Un amparo en "Iniciada" con el acto lesivo del ejemplo del contrato §3.7: 03/08/2026, cada 30 días, 15 hábiles. */
    function anAmparo(overrides: Partial<CaseListItem> = {}): CaseListItem {
      const base = anItem(null);
      return {
        ...base,
        jurisdiction: JurisdictionCode.AMPARO,
        clientDetained: null,
        injunctionGranted: false,
        harmfulActDate: day('2026-08-03'),
        harmfulActRenews: true,
        harmfulActRenewalDays: 30,
        harmfulActTermDays: 15,
        harmfulActTermDayType: DayType.BUSINESS,
        currentState: { ...base.currentState, proceduralStateId: null, name: 'Iniciada', initial: true, proceduralActId: null },
        ...overrides,
      };
    }

    it('lo calcula contra hoy: es el ejemplo del contrato', async () => {
      const useCase = new GetCase(new StubCaseQuery(anAmparo()), clockOn('2026-09-15'));

      const item = await useCase.execute({ id: 7 });

      expect(item.harmfulActDeadline).toEqual({
        actDate: day('2026-09-02'),
        renewed: true,
        dueDate: day('2026-09-23'),
        businessDaysRemaining: 6,
      });
    });

    it('en cuanto la causa sale de "Iniciada" vale null: el primer acto indica que el amparo ya se presentó', async () => {
      const left = anAmparo();
      const item = anAmparo({ currentState: { ...left.currentState, initial: false, proceduralActId: 18 } });
      const useCase = new GetCase(new StubCaseQuery(item), clockOn('2026-09-15'));

      expect((await useCase.execute({ id: 7 })).harmfulActDeadline).toBeNull();
    });

    it('vale null si no se cargó la fecha del acto lesivo', async () => {
      const item = anAmparo({
        harmfulActDate: null,
        harmfulActRenews: false,
        harmfulActRenewalDays: null,
        harmfulActTermDays: null,
        harmfulActTermDayType: null,
      });
      const useCase = new GetCase(new StubCaseQuery(item), clockOn('2026-09-15'));

      expect((await useCase.execute({ id: 7 })).harmfulActDeadline).toBeNull();
    });

    it('vale null fuera del fuero de amparo', async () => {
      const useCase = new GetCase(new StubCaseQuery(anAmparo({ jurisdiction: JurisdictionCode.CRIMINAL })), clockOn('2026-09-15'));

      expect((await useCase.execute({ id: 7 })).harmfulActDeadline).toBeNull();
    });

    it('un plazo vencido sigue abierto y sale con días negativos', async () => {
      const item = anAmparo({ harmfulActRenews: false, harmfulActRenewalDays: null });
      const useCase = new GetCase(new StubCaseQuery(item), clockOn('2026-09-15'));

      expect((await useCase.execute({ id: 7 })).harmfulActDeadline).toMatchObject({
        renewed: false,
        dueDate: day('2026-08-24'),
        businessDaysRemaining: -16,
      });
    });
  });

  it('falla con CASE_NOT_FOUND cuando el puerto no la encuentra', async () => {
    const useCase = new GetCase(new StubCaseQuery(null), clockOn('2026-09-15'));

    await expect(useCase.execute({ id: 999 })).rejects.toMatchObject({
      code: 'CASE_NOT_FOUND',
    });
    await expect(useCase.execute({ id: 999 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('no distingue una causa inexistente de una dada de baja', async () => {
    // El puerto devuelve `null` en los dos casos, y por eso el caso de uso no
    // puede dar respuestas distintas: §4, Bajas.
    const useCase = new GetCase(new StubCaseQuery(null), clockOn('2026-09-15'));

    await expect(useCase.execute({ id: 7 })).rejects.toMatchObject({ code: 'CASE_NOT_FOUND' });
  });
});
