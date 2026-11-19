import { Injectable } from '@nestjs/common';
import { MonthlyReportCloserPort } from '@subsystems/deadlines/core/domain/ports/monthly-report-closer.port';
import { CloseMonthlyReport } from '../../core/application/use-cases/close-monthly-report.use-case';

/**
 * Implements the {@link MonthlyReportCloserPort} that `deadlines` declares, so its daily process can
 * "Cerrar el mes" (HU43) without importing anything of `reporting`: which months are closed and what
 * photo each one keeps is `reporting`'s rule, so this only translates the port into its use case.
 */
@Injectable()
export class DeadlinesMonthlyReportCloserAdapter implements MonthlyReportCloserPort {
  constructor(private readonly closeMonthlyReport: CloseMonthlyReport) {}

  async closeFinishedMonths(): Promise<readonly string[]> {
    const { taken } = await this.closeMonthlyReport.execute();
    return taken;
  }
}
