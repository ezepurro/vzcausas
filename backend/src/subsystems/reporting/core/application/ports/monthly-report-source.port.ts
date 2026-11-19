import { ReportLawyer } from '../../domain/report/monthly-report-data';
import { ReportCase } from '../../domain/report/report-case';

/** DI token for {@link MonthlyReportSource}. */
export const MONTHLY_REPORT_SOURCE = Symbol('MONTHLY_REPORT_SOURCE');

/** What the report is calculated from: its cases with their history, and the lawyers vigentes now. */
export type MonthlyReportDataset = {
  /** The cases of the report: vigentes (not given de baja) with `startDate` (D-129). */
  cases: ReportCase[];
  /** Lawyers `active: true`: one given de baja is not among them (D-145). */
  lawyers: ReportLawyer[];
};

/**
 * Read port of the monthly report. `reporting` reads the database directly
 * (ADR-002); the port exists so the figures, which the domain computes, can be tested
 * without one.
 */
export interface MonthlyReportSource {
  /** Every case of the report with its acts, interruptive acts and offenses. Not paginated: it is a report. */
  load(): Promise<MonthlyReportDataset>;

  /** `Apellido, Nombres` of a user, for "Emitido por"; `null` if the user does not exist. */
  findUserName(userId: number): Promise<string | null>;
}
