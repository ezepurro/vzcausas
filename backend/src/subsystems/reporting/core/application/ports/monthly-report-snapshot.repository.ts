import { MonthlyReportData } from '../../domain/report/monthly-report-data';

/** DI token for {@link MonthlyReportSnapshotRepository}. */
export const MONTHLY_REPORT_SNAPSHOTS = Symbol('MONTHLY_REPORT_SNAPSHOTS');

/**
 * The photo of each closed month (D-117), in `monthly_report_snapshots`: the only
 * table `reporting` writes (D-146, ADR-002 amended). One row per month, keyed by the
 * period, so two simultaneous requests cannot leave two photos of the same month.
 */
export interface MonthlyReportSnapshotRepository {
  /** The photos that exist among `periods` (`AAAA-MM`), by period. */
  findByPeriods(periods: string[]): Promise<Map<string, MonthlyReportData>>;

  /**
   * Saves the photo of a month unless someone already did, and returns the one that
   * stays: a month's photo never changes, so the first writer wins.
   */
  saveIfAbsent(period: string, data: MonthlyReportData, takenAt: Date): Promise<{ data: MonthlyReportData; created: boolean }>;
}
