import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { businessDaysRemaining } from '../../../domain/business-days';
import { Prescription } from '../../../domain/prescription';
import { HarmfulAct } from '../../../domain/value-objects/case/harmful-act.vo';
import { JurisdictionCode } from '../../../domain/value-objects/case/jurisdiction-code';
import {
  CASE_REPOSITORY,
  CaseDueDateKey,
  CaseListItem,
  CasePage,
  CaseRepository,
  CaseSearchCriteria,
} from '../../../domain/ports/case/case.repository';

/**
 * `GET /cases` (HU20): one page of cases, ordered by urgency.
 *
 * The filters are the repository's job; the **order and the page are this use
 * case's** (CA-20.1). The repository answers the id and due date of every case
 * that matches; this orders them, cuts the page, and asks for the resource of
 * that page only. The total is the size of the whole filtered set, not of the
 * page. On top of that it fills the fields that depend on today's date.
 *
 * **Why the clock lives in this layer.** The adapter returns the field as
 * `null`: persistence has no business reading a clock, and the same stored row
 * yields a different number depending on the day it is read. Keeping the clock
 * out of the query is also what makes this testable without a database — a
 * fake `ClockPort` fixes "today" and the arithmetic becomes deterministic.
 *
 * **RN11 is satisfied by omission.** There is no filtering by the
 * authenticated user anywhere in this use case, and there must not be: the
 * whole firm sees every case, and the difference between profiles is what they
 * can *operate*, not what they can *see*. `responsibleLawyerId` is a filter the
 * client chooses, never a security boundary.
 */
@Injectable()
export class ListCases {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(criteria: CaseSearchCriteria): Promise<CasePage> {
    const { page, limit, ...filters } = criteria;
    const keys = await this.cases.findDueDateKeys(filters);

    const pageIds = [...keys]
      .sort(ListCases.byUrgency)
      .slice((page - 1) * limit, page * limit)
      .map((key) => key.id);
    if (pageIds.length === 0) {
      return { items: [], totalItems: keys.length };
    }

    // The repository answers in no particular order: each case goes back to
    // the position the urgency order gave it.
    const byId = new Map((await this.cases.findListItemsByIds(pageIds)).map((item) => [item.id, item]));
    const today = this.clock.today();

    return {
      items: pageIds
        .map((id) => byId.get(id))
        .filter((item): item is CaseListItem => item !== undefined)
        .map((item) => withDeadlines(item, today)),
      totalItems: keys.length,
    };
  }

  /**
   * Urgency (CA-20.1): first the cases with a due date, by due date ascending —
   * **overdue first**, they have the smallest dates — then those without one.
   * Ties, and the cases without a due date, go by `id`. Not by registration date.
   */
  private static byUrgency(a: CaseDueDateKey, b: CaseDueDateKey): number {
    if (a.dueDate !== null && b.dueDate !== null && a.dueDate.getTime() !== b.dueDate.getTime()) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    if (a.dueDate === null && b.dueDate !== null) {
      return 1;
    }
    if (a.dueDate !== null && b.dueDate === null) {
      return -1;
    }
    return a.id - b.id;
  }
}

/**
 * Fills the three fields that depend on today's date: `currentState.businessDaysRemaining`,
 * `harmfulActDeadline` and `prescription`.
 *
 * A case with no due date keeps the first `null`: there is no deadline to count
 * towards. The second exists only in an amparo that is still in the initial
 * state and loaded the date of its harmful act (D-78): the first procedural
 * act says the amparo was filed, and the term stops mattering.
 *
 * The third is `cases`' one prescription rule, {@link Prescription.of}, the same
 * the registration uses (V4 §3.7). Only `CRIMINAL` prescribes, and a criminal
 * case without qualifications has nothing to compute (D-74). A case already
 * marked "Prescripta" keeps it, as historical data (V4 §3.7, HU33).
 *
 * It also fills the `prescriptionStatus` of each qualification (D-112), with
 * the same rule ({@link Prescription.ofEach}). Outside `CRIMINAL` the case has
 * no qualifications (§4, Prescripción), so there is nothing to fill there.
 */
export function withDeadlines(item: CaseListItem, today: Date): CaseListItem {
  const { dueDate } = item.currentState;
  const harmfulAct = harmfulActOf(item);
  const offenses = item.legalQualifications.map((qualification) => ({
    legalQualificationId: qualification.id,
    legalQualificationName: qualification.name,
    prescriptionMonths: qualification.prescriptionMonths,
    offenseDate: qualification.offenseDate,
    // D-113: a declared offense no longer governs, and no later act restarts it.
    prescriptionDeclaredOn: qualification.prescriptionDeclaration?.prescriptionDate ?? null,
  }));
  const terms = Prescription.ofEach(offenses, item.interruptiveActDates, today);

  return {
    ...item,
    currentState:
      dueDate === null
        ? item.currentState
        : { ...item.currentState, businessDaysRemaining: businessDaysRemaining(today, dueDate) },
    harmfulActDeadline: harmfulAct && item.currentState.initial ? harmfulAct.deadline(today) : null,
    // `ofEach` keeps the order it receives, so each term is its qualification's.
    legalQualifications: item.legalQualifications.map((qualification, index) => ({
      ...qualification,
      prescriptionStatus: terms[index].status,
    })),
    prescription: Prescription.of(item.jurisdiction, offenses, item.interruptiveActDates, today),
  };
}

/** The fields of a case that {@link harmfulActOf} reads. */
export type HarmfulActFields = Pick<
  CaseListItem,
  | 'jurisdiction'
  | 'harmfulActDate'
  | 'harmfulActRenews'
  | 'harmfulActRenewalDays'
  | 'harmfulActTermDays'
  | 'harmfulActTermDayType'
>;

/**
 * The harmful act of an amparo, or `null` outside it or while its date was not loaded.
 *
 * Exported for the daily deadline check (HU51, `list-open-deadlines.use-case.ts`),
 * so the case and the check decide the same way when an amparo has a term to
 * file it (CA-51.9). It takes only the fields it reads, not a whole `CaseListItem`.
 */
export function harmfulActOf(item: HarmfulActFields): HarmfulAct | null {
  if (
    item.jurisdiction !== JurisdictionCode.AMPARO ||
    item.harmfulActDate === null ||
    item.harmfulActTermDays === null ||
    item.harmfulActTermDayType === null
  ) {
    return null;
  }
  return HarmfulAct.create({
    date: item.harmfulActDate,
    renews: item.harmfulActRenews ?? false,
    renewalDays: item.harmfulActRenewalDays,
    termDays: item.harmfulActTermDays,
    termDayType: item.harmfulActTermDayType,
  });
}
