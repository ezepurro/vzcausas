import { JurisdictionCode } from '../value-objects/jurisdiction-code';

/** DI token for {@link OpenDeadlinesPort}. */
export const OPEN_DEADLINES = Symbol('OPEN_DEADLINES');

/**
 * One open deadline of an active case, as the daily check (HU51) needs it: the
 * number it classifies (`businessDaysRemaining`) and what an
 * `UpcomingDeadlineNotice` carries. `deadlines` declares the minimum it needs,
 * in its own terms (`puertos-acl.md`).
 */
export interface CaseOpenDeadline {
  caseId: number;
  caption: string;
  sacNumber: string | null;
  jurisdiction: JurisdictionCode;
  responsibleLawyerId: number;
  /**
   * Where the deadline comes from (`DeadlineKind`, V4 §2): the procedural act
   * that set the current state, or the harmful act of an amparo still in
   * "Iniciada" (D-78). Declared now with both, so adding the harmful act later
   * does not change the port.
   */
  origin: 'PROCEDURAL_ACT' | 'HARMFUL_ACT';
  /**
   * `YYYY-MM-DD`. The manual one if the lawyer adjusted it, else the computed
   * one (CA-51.4): the same date the case shows (CA-51.9). A string for the
   * same reason as `CasePrescriptionStatus.expiresOn` (V-06).
   */
  dueDate: string;
  /** Business days from today (excluded) to `dueDate` (included): `0` today, negative overdue (V4 §4). */
  businessDaysRemaining: number;
  /** The act that opened the deadline; `null` when `origin` is `HARMFUL_ACT`. */
  proceduralActId: number | null;
}

/**
 * Declared by `deadlines`, implemented by `cases` in its `infrastructure/acl/`
 * (V-05), like {@link PrescriptionStatusPort}: what an active case is, which
 * due date counts and how business days count are `cases`' rules, and are
 * applied there (V-04).
 *
 * **Essential port**: a failure propagates; an empty list would read as
 * "nothing due today".
 */
export interface OpenDeadlinesPort {
  /**
   * Every open deadline of an **active** case against `today` (CA-51.2,
   * CA-51.6): none of a case archived, prescribed or given de baja. Overdue
   * ones included — an overdue deadline stays open until a later act moves the
   * case — and far-off ones too: classifying them is `deadlines`' job.
   */
  findOfActiveCases(today: Date): Promise<CaseOpenDeadline[]>;
}
