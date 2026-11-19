import { ReportCalendar } from '../value-objects/report-calendar.vo';
import { ReportPeriod } from '../value-objects/report-period.vo';
import { MonthlyReportData } from './monthly-report-data';

export type ReportPeriodStatus = 'CLOSED' | 'IN_PROGRESS';

/** One month of the year's chart. A month with no report yet has every figure `null` ("sin datos todavía"). */
export type MonthlyReportMonth = {
  period: string;
  admitted: number | null;
  archived: number | null;
  /** `admitted` minus `archived`. PDF only. */
  balance: number | null;
  /** The month's `summary.activeCases`. PDF only. */
  activeAtEnd: number | null;
};

/**
 * The complete report of a period (§3.13 "Datos del reporte"): the data measured at
 * the cut-off date — the snapshot of a closed month or the calculation of the one in
 * progress — plus what is put together on reading because it comes from other rows
 * or from the configuration: `status`, `availableFrom`, `currentPeriod`, the year's
 * `monthly` chart (each month from its own snapshot) and the changes against the
 * previous month. The screen shows a part of it and the PDF all of it (D-141).
 */
export class MonthlyReport {
  private constructor(
    readonly data: MonthlyReportData,
    readonly status: ReportPeriodStatus,
    readonly availableFrom: string,
    readonly currentPeriod: string,
    readonly monthly: MonthlyReportMonth[],
    /** Difference of `admitted` with the previous month; `null` if that month has no report. */
    readonly admittedChange: number | null,
    readonly archivedChange: number | null,
  ) {}

  /**
   * The closed months whose snapshots a report of `period` needs: its own if it is
   * closed, the ones of the year's chart before it and the previous month for the
   * changes — only the ones with a report (from `availableFrom`).
   */
  static snapshotsNeededFor(calendar: ReportCalendar, period: ReportPeriod): ReportPeriod[] {
    const wanted = [...period.fromJanuary(), period.previous()];
    const unique = new Map(wanted.map((p) => [p.value, p]));
    return [...unique.values()]
      .filter((p) => calendar.hasReport(p) && calendar.isClosed(p))
      .sort((a, b) => a.value.localeCompare(b.value));
  }

  /**
   * @param data the report's own data: the snapshot, or the calculation if it is in progress
   * @param snapshots the snapshots of {@link MonthlyReport.snapshotsNeededFor}, by period
   */
  static assemble(
    calendar: ReportCalendar,
    period: ReportPeriod,
    data: MonthlyReportData,
    snapshots: ReadonlyMap<string, MonthlyReportData>,
  ): MonthlyReport {
    const monthly = period.fromJanuary().map((month) => {
      const monthData = month.equals(period) ? data : snapshots.get(month.value);
      return MonthlyReport.monthOf(month, calendar.hasReport(month) ? monthData : undefined);
    });

    const previous = calendar.hasReport(period.previous()) ? snapshots.get(period.previous().value) : undefined;

    return new MonthlyReport(
      data,
      calendar.isClosed(period) ? 'CLOSED' : 'IN_PROGRESS',
      calendar.availableFrom.value,
      calendar.currentPeriod.value,
      monthly,
      previous === undefined ? null : data.summary.admitted - previous.summary.admitted,
      previous === undefined ? null : data.summary.archived - previous.summary.archived,
    );
  }

  private static monthOf(month: ReportPeriod, data: MonthlyReportData | undefined): MonthlyReportMonth {
    if (data === undefined) {
      return { period: month.value, admitted: null, archived: null, balance: null, activeAtEnd: null };
    }
    return {
      period: month.value,
      admitted: data.summary.admitted,
      archived: data.summary.archived,
      balance: data.summary.admitted - data.summary.archived,
      activeAtEnd: data.summary.activeCases,
    };
  }
}
