import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { MonthlyReport } from '../../domain/report/monthly-report';
import { ReportAccess } from '../../domain/report/report-access';
import { ReportPeriod } from '../../domain/value-objects/report-period.vo';
import { MonthlyReportSnapshots } from '../services/monthly-report-snapshots.service';

/**
 * HU43 — the monthly report of a period (§3.13, `GET /reports/monthly`): the
 * complete set of data, of which the screen shows a part (D-141) and the PDF all.
 *
 * Only coordinates: the administrator is checked first (403 before 404), then the
 * period is resolved against the calendar (`MONTHLY_REPORT_NOT_FOUND`), the photos
 * the report needs are read — or taken, if their month closed without one — and the
 * report is assembled. The month in progress is calculated and not saved.
 */
@Injectable()
export class GetMonthlyReport {
  constructor(private readonly snapshots: MonthlyReportSnapshots) {}

  /**
   * @param input.period the month asked for; the default one if absent
   * @throws ForbiddenActionError `FORBIDDEN`
   * @throws MonthlyReportNotFoundError `MONTHLY_REPORT_NOT_FOUND`
   */
  async execute(input: { actor: AuthenticatedUser; period?: ReportPeriod }): Promise<MonthlyReport> {
    ReportAccess.assertAdministrator(input.actor);

    const calendar = this.snapshots.calendar();
    const period = calendar.resolve(input.period);

    const { snapshots } = await this.snapshots.ensure(MonthlyReport.snapshotsNeededFor(calendar, period));
    const data =
      snapshots.get(period.value) ?? (await this.snapshots.calculateInProgress(period, calendar.dataAsOf(period)));

    return MonthlyReport.assemble(calendar, period, data, snapshots);
  }
}
