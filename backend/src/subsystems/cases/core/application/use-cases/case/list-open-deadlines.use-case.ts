import { Inject, Injectable } from '@nestjs/common';
import { businessDaysRemaining } from '../../../domain/business-days';
import { OPEN_DEADLINE_QUERY, OpenDeadlineQueryPort } from '../../../domain/ports/procedural-act/open-deadline-query.port';
import { JurisdictionCode } from '../../../domain/value-objects/case/jurisdiction-code';
import { harmfulActOf } from './list-cases.use-case';

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
  /**
   * `DeadlineKind` of the contract (V4 §2): the procedural act that set the
   * current state, or the harmful act of an amparo still in "Iniciada" (D-78).
   * Never both for the same case: "Iniciada" has no procedural act.
   */
  origin: 'PROCEDURAL_ACT' | 'HARMFUL_ACT';
  /** The act that opened the deadline; `null` for the harmful act. */
  proceduralActId: number | null;
  dueDate: Date;
  /** `0` today, negative overdue. Same number as `currentState.businessDaysRemaining` or `harmfulActDeadline.businessDaysRemaining`. */
  businessDaysRemaining: number;
};

/**
 * Every open deadline of an active case, against a given date. What the daily
 * check (HU51) reads, through `deadlines`' port, so it counts exactly what the
 * case and the dashboards show (CA-51.9).
 *
 * Two sources, each with its own rule, both `cases`' and both reused:
 *
 * - **Procedural acts**: the due date of the current act, and
 *   {@link businessDaysRemaining} — the function `ListCases` and the lawyer
 *   dashboard use (Monday to Friday, D-73; no holidays, P-02, on purpose).
 * - **The harmful act of an amparo** (CA-51.5): built with {@link harmfulActOf}
 *   and computed with `HarmfulAct.deadline` — the same two `ListCases` uses for
 *   `harmfulActDeadline`, so the renewal in force (D-78) is the one the case
 *   shows. The query already keeps only amparos in "Iniciada".
 *
 * **A use case and not a pass-through** (V-07): those rules are applied here,
 * on top of the rows. Every deadline comes back, overdue or far off: which ones
 * deserve a notice is the consumer's decision.
 */
@Injectable()
export class ListOpenDeadlines {
  constructor(@Inject(OPEN_DEADLINE_QUERY) private readonly cases: OpenDeadlineQueryPort) {}

  async execute(query: ListOpenDeadlinesQuery): Promise<OpenDeadlineView[]> {
    const [proceduralRows, amparoRows] = await Promise.all([
      this.cases.findActiveWithOpenDeadline(),
      this.cases.findActiveAmparosWithHarmfulAct(),
    ]);

    const procedural: OpenDeadlineView[] = proceduralRows.map((row) => ({
      ...row,
      origin: 'PROCEDURAL_ACT',
      businessDaysRemaining: businessDaysRemaining(query.today, row.dueDate),
    }));

    const harmful = amparoRows.flatMap((row): OpenDeadlineView[] => {
      // `null` when the term was not loaded with the date: no deadline to compute.
      const harmfulAct = harmfulActOf(row);
      if (harmfulAct === null) {
        return [];
      }
      const deadline = harmfulAct.deadline(query.today);
      return [
        {
          caseId: row.caseId,
          caption: row.caption,
          sacNumber: row.sacNumber,
          jurisdiction: row.jurisdiction,
          responsibleLawyerId: row.responsibleLawyerId,
          origin: 'HARMFUL_ACT',
          proceduralActId: null,
          dueDate: deadline.dueDate,
          businessDaysRemaining: deadline.businessDaysRemaining,
        },
      ];
    });

    // One list by case id: a case has at most one open deadline (see `origin`).
    return [...procedural, ...harmful].sort((a, b) => a.caseId - b.caseId);
  }
}
