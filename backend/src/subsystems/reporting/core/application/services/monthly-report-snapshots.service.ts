import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { MonthlyReportCalculation } from '../../domain/report/monthly-report-calculation';
import { MonthlyReportData } from '../../domain/report/monthly-report-data';
import { ReportCalendar } from '../../domain/value-objects/report-calendar.vo';
import { ReportPeriod } from '../../domain/value-objects/report-period.vo';
import { MONTHLY_REPORT_AVAILABLE_FROM } from '../ports/monthly-report-config.port';
import { MONTHLY_REPORT_SNAPSHOTS, MonthlyReportSnapshotRepository } from '../ports/monthly-report-snapshot.repository';
import { MONTHLY_REPORT_SOURCE, MonthlyReportSource } from '../ports/monthly-report-source.port';

/**
 * Where the data of each month comes from (D-117): a closed month from its photo,
 * taken when it closes (the daily process, HU43) or, if nobody did, the first time
 * it is asked for; the month in progress is calculated on every request and never
 * saved. Both the screen's use case and the PDF's go through here, so the two read
 * the same figures.
 */
@Injectable()
export class MonthlyReportSnapshots {
  constructor(
    @Inject(MONTHLY_REPORT_SOURCE) private readonly source: MonthlyReportSource,
    @Inject(MONTHLY_REPORT_SNAPSHOTS) private readonly snapshots: MonthlyReportSnapshotRepository,
    @Inject(MONTHLY_REPORT_AVAILABLE_FROM) private readonly availableFrom: string | null,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /** Which months have a report, as of today in Córdoba. */
  calendar(): ReportCalendar {
    return ReportCalendar.of(ReportPeriod.parse(this.availableFrom), this.clock.today());
  }

  /**
   * The photo of each closed month in `periods`, taking (and saving) the ones that
   * are missing. `taken` lists the months this call had to photograph.
   */
  async ensure(periods: ReportPeriod[]): Promise<{ snapshots: Map<string, MonthlyReportData>; taken: string[] }> {
    const found = await this.snapshots.findByPeriods(periods.map((p) => p.value));
    const missing = periods.filter((p) => !found.has(p.value));
    const taken: string[] = [];
    if (missing.length > 0) {
      const { cases, lawyers } = await this.source.load();
      for (const period of missing) {
        const data = MonthlyReportCalculation.run({ period, cutOff: period.lastDay(), inProgress: false, cases, lawyers });
        const saved = await this.snapshots.saveIfAbsent(period.value, data, this.clock.now());
        found.set(period.value, saved.data);
        if (saved.created) taken.push(period.value);
      }
    }
    return { snapshots: found, taken };
  }

  /** The data of the month in progress, calculated today with what is loaded so far. Not saved. */
  async calculateInProgress(period: ReportPeriod, cutOff: Date): Promise<MonthlyReportData> {
    const { cases, lawyers } = await this.source.load();
    return MonthlyReportCalculation.run({ period, cutOff, inProgress: true, cases, lawyers });
  }
}
