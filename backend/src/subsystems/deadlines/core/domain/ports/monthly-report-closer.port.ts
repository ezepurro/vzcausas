/**
 * What the daily process needs from `reporting`: "Cerrar el mes" (HU43, contract V6 §4 "Proceso
 * automático diario"). On the first run of each month, the photo of the month that ended is taken
 * and kept; the rest of the runs of the day find it already taken and do nothing.
 *
 * Declared here, by the consumer and in its own terms (architecture §6.2). **The adapter lives in
 * `reporting`**: `reporting/infrastructure/acl/deadlines-monthly-report-closer.adapter.ts` implements
 * it and `ReportingModule` exports this token. What a photo of the month is, and which months are
 * closed, are `reporting`'s rules, not this subsystem's.
 */
export interface MonthlyReportCloserPort {
  /**
   * Takes the photo of every closed month that has none. Idempotent: asking again changes nothing.
   *
   * @returns the months photographed by this call (`AAAA-MM`, oldest first); empty if there was
   *   nothing to do.
   */
  closeFinishedMonths(): Promise<readonly string[]>;
}

export const MONTHLY_REPORT_CLOSER = Symbol("MONTHLY_REPORT_CLOSER");
