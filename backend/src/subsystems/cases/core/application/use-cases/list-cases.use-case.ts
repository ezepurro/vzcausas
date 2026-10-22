import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { businessDaysRemaining } from '../../domain/business-days';
import { Prescription } from '../../domain/prescription';
import { HarmfulAct } from '../../domain/value-objects/harmful-act';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';
import {
  CASE_QUERY,
  CaseListItem,
  CasePage,
  CaseQueryPort,
  CaseSearchCriteria,
} from '../../domain/ports/case-query.port';

/**
 * `GET /cases` (HU20): one page of cases, ordered by urgency.
 *
 * It coordinates and does not decide. The ordering and the filters are the
 * read port's job, because they are resolved by the database in one query; the
 * only thing added here is `businessDaysRemaining`, and only because it
 * depends on today's date.
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
    @Inject(CASE_QUERY) private readonly cases: CaseQueryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(criteria: CaseSearchCriteria): Promise<CasePage> {
    const found = await this.cases.search(criteria);
    const today = this.clock.today();

    return {
      items: found.items.map((item) => withDeadlines(item, today)),
      totalItems: found.totalItems,
    };
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
 */
export function withDeadlines(item: CaseListItem, today: Date): CaseListItem {
  const { dueDate } = item.currentState;
  const harmfulAct = harmfulActOf(item);

  return {
    ...item,
    currentState:
      dueDate === null
        ? item.currentState
        : { ...item.currentState, businessDaysRemaining: businessDaysRemaining(today, dueDate) },
    harmfulActDeadline: harmfulAct && item.currentState.initial ? harmfulAct.deadline(today) : null,
    prescription: Prescription.of(
      item.jurisdiction,
      item.legalQualifications.map((qualification) => ({
        legalQualificationId: qualification.id,
        legalQualificationName: qualification.name,
        prescriptionMonths: qualification.prescriptionMonths,
        offenseDate: qualification.offenseDate,
      })),
      item.lastInterruptiveActDate,
      today,
    ),
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
