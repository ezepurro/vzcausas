import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { businessDaysRemaining } from '../../domain/business-days';
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
      items: found.items.map((item) => withBusinessDays(item, today)),
      totalItems: found.totalItems,
    };
  }
}

/**
 * Fills `businessDaysRemaining` against today. A case with no due date keeps
 * it `null`: there is no deadline to count towards.
 */
export function withBusinessDays(item: CaseListItem, today: Date): CaseListItem {
  const { dueDate } = item.currentState;
  if (dueDate === null) {
    return item;
  }

  return {
    ...item,
    currentState: {
      ...item.currentState,
      businessDaysRemaining: businessDaysRemaining(today, dueDate),
    },
  };
}
