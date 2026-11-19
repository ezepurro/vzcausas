import { InvalidReportPeriodError } from '../errors/reporting.errors';

const PERIOD_FORMAT = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * A calendar month of the monthly report: `2026-08` is August 2026 (§3.13).
 * Dates are civil dates, midnight UTC, the way a `date` column is read.
 */
export class ReportPeriod {
  private constructor(
    readonly year: number,
    readonly month: number,
  ) {}

  /** `null` when `raw` is not `AAAA-MM`. */
  static parse(raw: unknown): ReportPeriod | null {
    if (typeof raw !== 'string') return null;
    const match = PERIOD_FORMAT.exec(raw);
    return match ? new ReportPeriod(Number(match[1]), Number(match[2])) : null;
  }

  /** @throws InvalidReportPeriodError `INVALID_REQUEST` if `raw` is not `AAAA-MM`. */
  static create(raw: unknown): ReportPeriod {
    const period = ReportPeriod.parse(raw);
    if (period === null) throw new InvalidReportPeriodError();
    return period;
  }

  /** The month a civil date falls in. */
  static containing(date: Date): ReportPeriod {
    return new ReportPeriod(date.getUTCFullYear(), date.getUTCMonth() + 1);
  }

  /** `AAAA-MM`. */
  get value(): string {
    return `${String(this.year).padStart(4, '0')}-${String(this.month).padStart(2, '0')}`;
  }

  firstDay(): Date {
    return new Date(Date.UTC(this.year, this.month - 1, 1));
  }

  lastDay(): Date {
    return new Date(Date.UTC(this.year, this.month, 0));
  }

  previous(): ReportPeriod {
    return this.month === 1 ? new ReportPeriod(this.year - 1, 12) : new ReportPeriod(this.year, this.month - 1);
  }

  next(): ReportPeriod {
    return this.month === 12 ? new ReportPeriod(this.year + 1, 1) : new ReportPeriod(this.year, this.month + 1);
  }

  contains(date: Date): boolean {
    return date >= this.firstDay() && date <= this.lastDay();
  }

  equals(other: ReportPeriod): boolean {
    return this.value === other.value;
  }

  isBefore(other: ReportPeriod): boolean {
    return this.value < other.value;
  }

  isAfter(other: ReportPeriod): boolean {
    return this.value > other.value;
  }

  /** Every month from this one to `last`, both included; empty if `last` is before this one. */
  through(last: ReportPeriod): ReportPeriod[] {
    const periods: ReportPeriod[] = [];
    for (let period: ReportPeriod = this; !period.isAfter(last); period = period.next()) {
      periods.push(period);
    }
    return periods;
  }

  /** January of this year up to this month, both included: the months the year's chart shows. */
  fromJanuary(): ReportPeriod[] {
    return new ReportPeriod(this.year, 1).through(this);
  }
}
