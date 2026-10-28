import { DayType } from '../value-objects/day-type';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';

/** DI token for {@link OpenDeadlineQueryPort}. */
export const OPEN_DEADLINE_QUERY = Symbol('OPEN_DEADLINE_QUERY');

/**
 * One active case whose current procedural act left a deadline open. The due
 * date is already resolved — the manual one if the lawyer adjusted it, else the
 * computed one (CA-51.4) — the same rule as `currentState.dueDate`
 * (`prisma-case.repository.ts`). How far it is from today is not here: that
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
 * One active amparo still in "Iniciada" that loaded the date of its harmful act
 * (D-67): the data its deadline to file the amparo is computed from (D-78). The
 * deadline itself is not here — it depends on today's date and on the renewals
 * up to it — and the use case computes it with `HarmfulAct`.
 *
 * The harmful-act fields are named as in `CaseListItem`, so the same
 * `harmfulActOf` (`list-cases.use-case.ts`) builds the act for the case and for
 * the daily check.
 */
export type OpenHarmfulActRow = {
  caseId: number;
  caption: string;
  sacNumber: string | null;
  jurisdiction: JurisdictionCode;
  responsibleLawyerId: number;
  harmfulActDate: Date | null;
  harmfulActRenews: boolean | null;
  harmfulActRenewalDays: number | null;
  harmfulActTermDays: number | null;
  harmfulActTermDayType: DayType | null;
};

/**
 * Read port for the daily deadline check (HU51). Its own port, not one more
 * method of `CaseRepository`, for the same reason as `CriminalPrescriptionQueryPort`
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

  /**
   * Every **active** amparo still in its initial state, "Iniciada", that loaded
   * the date of its harmful act, by case id (CA-51.5). Out by construction: an
   * amparo with a first procedural act — the amparo was filed and the term
   * stopped mattering (D-78) — and one given de baja or terminal.
   */
  findActiveAmparosWithHarmfulAct(): Promise<OpenHarmfulActRow[]>;
}
