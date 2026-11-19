import { MonthlyReportNotFoundError } from '../errors/reporting.errors';
import { ReportPeriod } from './report-period.vo';

/**
 * Which months have a report and which one is the default (§3.13 "Desde cuándo").
 *
 * There are reports from `availableFrom` (server configuration, D-137) to the
 * current month, which is the one in progress. A month before the current one is
 * closed: it is read from its snapshot (D-117). Without `availableFrom`
 * configured only the current month has a report, so nothing is ever taken.
 */
export class ReportCalendar {
  private constructor(
    readonly availableFrom: ReportPeriod,
    readonly currentPeriod: ReportPeriod,
    private readonly today: Date,
  ) {}

  /**
   * @param availableFrom the configured first month, or `null` when it is not configured
   * @param today civil date in the study's time zone
   */
  static of(availableFrom: ReportPeriod | null, today: Date): ReportCalendar {
    const current = ReportPeriod.containing(today);
    // A first month in the future would leave no report at all: it is read as the current one.
    const first = availableFrom === null || availableFrom.isAfter(current) ? current : availableFrom;
    return new ReportCalendar(first, current, today);
  }

  /** Whether the month has a report: from `availableFrom` to the current month. */
  hasReport(period: ReportPeriod): boolean {
    return !period.isBefore(this.availableFrom) && !period.isAfter(this.currentPeriod);
  }

  /** The period asked for; the default one if none. @throws MonthlyReportNotFoundError `MONTHLY_REPORT_NOT_FOUND` */
  resolve(requested: ReportPeriod | undefined): ReportPeriod {
    if (requested === undefined) return this.defaultPeriod();
    if (!this.hasReport(requested)) throw new MonthlyReportNotFoundError();
    return requested;
  }

  /** The last closed month; the current one if there is no closed month yet. */
  defaultPeriod(): ReportPeriod {
    const lastClosed = this.currentPeriod.previous();
    return this.hasReport(lastClosed) ? lastClosed : this.currentPeriod;
  }

  isClosed(period: ReportPeriod): boolean {
    return period.isBefore(this.currentPeriod);
  }

  /** Every closed month with a report, oldest first. */
  closedPeriods(): ReportPeriod[] {
    return this.availableFrom.through(this.currentPeriod.previous());
  }

  /** The cut-off date: the last day of a closed month, today for the one in progress. */
  dataAsOf(period: ReportPeriod): Date {
    return this.isClosed(period) ? period.lastDay() : this.today;
  }
}
