import { Inject, Injectable } from '@nestjs/common';
import { businessDaysRemaining } from '../../domain/business-days';
import { OPEN_DEADLINE_QUERY, OpenDeadlineQueryPort } from '../../domain/ports/open-deadline-query.port';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';

export type ListOpenDeadlinesQuery = {
  /** The civil date to count against. Given by the caller, so one daily run uses one date (V-06). */
  today: Date;
};

/** One open deadline of an active case, counted against the given date. */
export type OpenDeadlineView = {
  caseId: number;
  caption: string;
  sacNumber: string | null;
  jurisdiction: JurisdictionCode;
  responsibleLawyerId: number;
  /** `DeadlineKind` of the contract (V4 §2). Only procedural acts for now: the amparo's harmful act is phase B of HU51. */
  origin: 'PROCEDURAL_ACT';
  proceduralActId: number;
  dueDate: Date;
  /** Same number as `currentState.businessDaysRemaining`: `0` today, negative overdue. */
  businessDaysRemaining: number;
};

/**
 * Every open deadline of an active case, against a given date. What the daily
 * check (HU51) reads, through `deadlines`' port, so it counts exactly what the
 * case and the dashboards show (CA-51.9).
 *
 * **A use case and not a pass-through** (V-07): there is a rule to apply on
 * top of the rows, and it is `cases`' — {@link businessDaysRemaining}, the
 * same function `ListCases` and the lawyer dashboard use (Monday to Friday,
 * D-73; holidays not excluded, P-02, on purpose). Reused, never rewritten.
 *
 * Every deadline comes back, overdue or far off: which ones deserve a notice
 * is the consumer's decision.
 */
@Injectable()
export class ListOpenDeadlines {
  constructor(@Inject(OPEN_DEADLINE_QUERY) private readonly cases: OpenDeadlineQueryPort) {}

  async execute(query: ListOpenDeadlinesQuery): Promise<OpenDeadlineView[]> {
    const rows = await this.cases.findActiveWithOpenDeadline();

    return rows.map((row) => ({
      ...row,
      origin: 'PROCEDURAL_ACT',
      businessDaysRemaining: businessDaysRemaining(query.today, row.dueDate),
    }));
  }
}
