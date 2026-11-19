import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { ReportAccess } from '../../domain/report/report-access';
import { ReportPeriod } from '../../domain/value-objects/report-period.vo';
import {
  MONTHLY_REPORT_PDF_RENDERER,
  MonthlyReportPdfRenderer,
} from '../ports/monthly-report-pdf.renderer.port';
import { MONTHLY_REPORT_SOURCE, MonthlyReportSource } from '../ports/monthly-report-source.port';
import { GetMonthlyReport } from './get-monthly-report.use-case';

export type MonthlyReportFile = { content: Uint8Array; fileName: string };

/**
 * HU43 — "Descargar PDF" (§3.13, `GET /reports/monthly/file`): the report of a
 * period, written. It is built on every request and never stored; for a closed month
 * two downloads give the same content but for "Emitido por" and "Emitido el".
 *
 * Uses what {@link GetMonthlyReport} gives, the complete set of data, so the PDF
 * and the screen cannot disagree.
 */
@Injectable()
export class IssueMonthlyReportFile {
  constructor(
    private readonly getMonthlyReport: GetMonthlyReport,
    @Inject(MONTHLY_REPORT_SOURCE) private readonly source: MonthlyReportSource,
    @Inject(MONTHLY_REPORT_PDF_RENDERER) private readonly renderer: MonthlyReportPdfRenderer,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  /**
   * @throws ForbiddenActionError `FORBIDDEN`
   * @throws MonthlyReportNotFoundError `MONTHLY_REPORT_NOT_FOUND`
   */
  async execute(input: { actor: AuthenticatedUser; period?: ReportPeriod }): Promise<MonthlyReportFile> {
    ReportAccess.assertAdministrator(input.actor);

    const report = await this.getMonthlyReport.execute(input);
    const by = (await this.source.findUserName(input.actor.userId)) ?? '—';
    const content = await this.renderer.render(report, { by, at: this.clock.now() });

    return { content, fileName: `Reporte_${report.data.period}.pdf` };
  }
}
