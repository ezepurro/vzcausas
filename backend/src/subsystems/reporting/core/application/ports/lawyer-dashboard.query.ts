import { OffenseForPrescription } from '@subsystems/cases/core/domain/prescription';

/** DI token for {@link LawyerDashboardQuery}. */
export const LAWYER_DASHBOARD_QUERY = Symbol('LAWYER_DASHBOARD_QUERY');

export type DashboardLawyerRef = { id: number; lastName: string; firstName: string };

/**
 * One active case of the lawyer, with only what "Mi día" needs. A read model
 * of `reporting` (ADR-002): a presentation structure, not an entity, and not
 * reused by any other subsystem.
 */
export type DashboardCaseRow = {
  caseId: number;
  sacNumber: string | null;
  caption: string;
  /** `CRIMINAL`, `ADMINISTRATIVE` or `AMPARO`. */
  jurisdiction: string;
  /** The state of the table, the hand-written one, or "Iniciada" for a case without acts. */
  currentStateName: string;
  /** Due date of the current act: the manual one if adjusted, else the computed one. `null` if none is open. */
  dueDate: Date | null;
  lastProceduralActDate: Date | null;
  lastInterruptiveActDate: Date | null;
  /**
   * Every interruptive act of the case, by date, for the prescription: whether
   * one restarts an offense depends on the ones before it (D-113).
   */
  interruptiveActDates: Date[];
  /** Its offenses, for the prescription (criminal only; empty in the other jurisdictions). */
  offenses: OffenseForPrescription[];
  responsibleLawyer: DashboardLawyerRef;
};

/**
 * Read port of both dashboards, the lawyer's (HU41) and the administrator's
 * (HU42): the same tables, scoped to one lawyer or to the whole firm.
 * `reporting` reads the database directly (ADR-002); the port exists so the
 * use cases, where every number of the dashboard is computed, can be tested
 * without one.
 */
export interface LawyerDashboardQuery {
  /** The lawyer the dashboard belongs to, given de baja or not; `null` only if the record is missing. */
  findLawyer(lawyerId: number): Promise<DashboardLawyerRef | null>;

  /** Every **active** case the lawyer is responsible for (§4, Causa activa). Not paginated (D-62). */
  findActiveCasesOf(lawyerId: number): Promise<DashboardCaseRow[]>;

  /** HU42: every lawyer vigente (`active: true`), whether or not they have cases. */
  findActiveLawyers(): Promise<DashboardLawyerRef[]>;

  /** HU42: every **active** case of the firm (§4, Causa activa), no matter who is responsible. Not paginated (D-62). */
  findAllActiveCases(): Promise<DashboardCaseRow[]>;
}
