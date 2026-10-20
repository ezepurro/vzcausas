import { JurisdictionCode } from '../value-objects/jurisdiction-code';

/** DI token for {@link OpenDeadlineQueryPort}. */
export const OPEN_DEADLINE_QUERY = Symbol('OPEN_DEADLINE_QUERY');

/**
 * One active case whose current procedural act left a deadline open. The due
 * date is already resolved — the manual one if the lawyer adjusted it, else the
 * computed one (CA-51.4) — the same rule as `currentState.dueDate`
 * (`case-query-prisma.adapter.ts`). How far it is from today is not here: that
 * depends on the date, and the use case computes it.
 */
export type OpenProceduralDeadlineRow = {
  caseId: number;
  caption: string;
  sacNumber: string | null;
  jurisdiction: JurisdictionCode;
  responsibleLawyerId: number;
  /** The act that set the current state and opened the deadline. */
  proceduralActId: number;
  dueDate: Date;
};

/**
 * Read port for the daily deadline check (HU51). Its own port, not one more
 * method of `CaseQueryPort`, for the same reason as `CriminalPrescriptionQueryPort`
 * (V-08, `IMPLEMENTACION_DETECCION.md`).
 */
export interface OpenDeadlineQueryPort {
  /**
   * Every **active** case (§4, Causa activa) whose current procedural act has a
   * due date, by case id (CA-51.2, CA-51.6). An overdue one is included: a
   * deadline stays open until a later act moves the case (V4 §4).
   *
   * Out by construction: cases given de baja or in a terminal state, cases
   * still in "Iniciada" (no act yet), and cases whose current act opened no
   * term. A hand-written state counts only if the lawyer adjusted its due date
   * by hand (D-11).
   *
   * Not paginated: read once per daily run, bounded by the active cases of one
   * study.
   */
  findActiveWithOpenDeadline(): Promise<OpenProceduralDeadlineRow[]>;
}
