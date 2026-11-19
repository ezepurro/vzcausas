import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { ContentDisposition, Disposition } from '@shared/infrastructure/http/content-disposition';
import { GetMonthlyReport } from '../../../core/application/use-cases/get-monthly-report.use-case';
import { IssueMonthlyReportFile } from '../../../core/application/use-cases/issue-monthly-report-file.use-case';
import { InvalidReportDispositionError } from '../../../core/domain/errors/reporting.errors';
import { ReportPeriod } from '../../../core/domain/value-objects/report-period.vo';
import { MonthlyReportResponseDto } from '../dtos/monthly-report.response.dto';
import { MonthlyReportHttpMapper } from '../mappers/monthly-report-http.mapper';

const DISPOSITIONS: readonly Disposition[] = ['inline', 'attachment'];

/**
 * HTTP entry point for `/reports/monthly` (contract V6 §3.13, HU43): the "Reportes"
 * screen and its "Descargar PDF". Two endpoints, each with only what it needs (D-141).
 *
 * No `@RequirePermissions`: the role is checked by the use cases, as the
 * administrator's dashboard does. The shape of the query is checked here, before the
 * use case: 401 → 400 → 403 → 404. A rejected request writes nothing.
 */
@Controller({ path: 'reports/monthly', version: ['1'] })
export class MonthlyReportController {
  constructor(
    private readonly getMonthlyReport: GetMonthlyReport,
    private readonly issueMonthlyReportFile: IssueMonthlyReportFile,
  ) {}

  @Get()
  async get(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('period') periodParam?: string,
  ): Promise<{ data: MonthlyReportResponseDto }> {
    const report = await this.getMonthlyReport.execute({ actor, period: MonthlyReportController.period(periodParam) });
    return { data: MonthlyReportHttpMapper.toResponse(report) };
  }

  /** The one success response of `reporting` that is not JSON; its errors still are. */
  @Get('file')
  async file(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('period') periodParam?: string,
    @Query('disposition') dispositionParam?: string,
  ): Promise<StreamableFile> {
    const period = MonthlyReportController.period(periodParam);
    const disposition = MonthlyReportController.disposition(dispositionParam);

    const file = await this.issueMonthlyReportFile.execute({ actor, period });

    return new StreamableFile(file.content, {
      type: 'application/pdf',
      length: file.content.length,
      disposition: ContentDisposition.of(disposition, file.fileName).toString(),
    });
  }

  /** Absent, the default period; present, `AAAA-MM`. */
  private static period(raw: unknown): ReportPeriod | undefined {
    return raw === undefined ? undefined : ReportPeriod.create(raw);
  }

  /** `attachment` when absent (§3.13). */
  private static disposition(raw: unknown): Disposition {
    if (raw === undefined) return 'attachment';
    if (!DISPOSITIONS.includes(raw as Disposition)) throw new InvalidReportDispositionError();
    return raw as Disposition;
  }
}
