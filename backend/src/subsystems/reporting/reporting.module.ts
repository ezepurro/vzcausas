import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClockModule } from '@shared/infrastructure/clock/clock.module';
import { LAWYER_DASHBOARD_QUERY } from './core/application/ports/lawyer-dashboard.query';
import { MONTHLY_REPORT_AVAILABLE_FROM } from './core/application/ports/monthly-report-config.port';
import { MONTHLY_REPORT_PDF_RENDERER } from './core/application/ports/monthly-report-pdf.renderer.port';
import { MONTHLY_REPORT_SNAPSHOTS } from './core/application/ports/monthly-report-snapshot.repository';
import { MONTHLY_REPORT_SOURCE } from './core/application/ports/monthly-report-source.port';
import { MonthlyReportSnapshots } from './core/application/services/monthly-report-snapshots.service';
import { CloseMonthlyReport } from './core/application/use-cases/close-monthly-report.use-case';
import { GetAdministratorDashboard } from './core/application/use-cases/get-administrator-dashboard.use-case';
import { GetLawyerDashboard } from './core/application/use-cases/get-lawyer-dashboard.use-case';
import { GetMonthlyReport } from './core/application/use-cases/get-monthly-report.use-case';
import { IssueMonthlyReportFile } from './core/application/use-cases/issue-monthly-report-file.use-case';
import { MONTHLY_REPORT_CLOSER } from '@subsystems/deadlines/core/domain/ports/monthly-report-closer.port';
import { ReportPeriod } from './core/domain/value-objects/report-period.vo';
import { DeadlinesMonthlyReportCloserAdapter } from './infrastructure/acl/deadlines-monthly-report-closer.adapter';
import { DashboardsController } from './infrastructure/http/controllers/dashboards.controller';
import { MonthlyReportController } from './infrastructure/http/controllers/monthly-report.controller';
import { LawyerDashboardPrismaQuery } from './infrastructure/persistence/lawyer-dashboard-prisma.query';
import { MonthlyReportPrismaSource } from './infrastructure/persistence/monthly-report-prisma.source';
import { MonthlyReportSnapshotPrismaRepository } from './infrastructure/persistence/monthly-report-snapshot-prisma.repository';
import { PdfLibMonthlyReportRenderer } from './infrastructure/pdf/pdf-lib-monthly-report.renderer';

/**
 * Composition root of `reporting` (EP-08): dashboards and reports.
 *
 * A read-mostly subsystem with no entities of its own (ADR-002). It reads the
 * database directly through its own read models instead of crossing four
 * subsystems through ports, under three conditions: it imposes no invariants, its
 * read models are used by nobody else, and it writes **only** the photo of the
 * closed month, `monthly_report_snapshots` (D-146, the amendment of ADR-002). The
 * business rules it shows — what an active case is, how business days count, how a
 * prescription runs — are imported from `cases`, which owns them.
 *
 * `ClockModule` is imported for the {@link CLOCK}: every dashboard and report is
 * computed against today's date in Córdoba.
 *
 * The "Cerrar el mes" step of the daily process (HU43) is triggered from `deadlines`, which declares
 * `MONTHLY_REPORT_CLOSER`; this module implements it with an adapter (`infrastructure/acl/`) and
 * exports only that token, so `deadlines` never imports this subsystem's classes (T2.5).
 */
@Module({
  imports: [ClockModule],
  controllers: [DashboardsController, MonthlyReportController],
  providers: [
    // HU41: el tablero del abogado, "Mi día".
    GetLawyerDashboard,
    // HU42: el tablero del administrador, "Estudio". Mismo puerto que HU41.
    GetAdministratorDashboard,
    { provide: LAWYER_DASHBOARD_QUERY, useClass: LawyerDashboardPrismaQuery },

    // HU43: el reporte mensual y su PDF.
    MonthlyReportSnapshots,
    GetMonthlyReport,
    IssueMonthlyReportFile,
    CloseMonthlyReport,
    // HU43: the daily process of `deadlines` closes the month through its own port; only the token is exported.
    { provide: MONTHLY_REPORT_CLOSER, useClass: DeadlinesMonthlyReportCloserAdapter },
    { provide: MONTHLY_REPORT_SOURCE, useClass: MonthlyReportPrismaSource },
    { provide: MONTHLY_REPORT_SNAPSHOTS, useClass: MonthlyReportSnapshotPrismaRepository },
    { provide: MONTHLY_REPORT_PDF_RENDERER, useClass: PdfLibMonthlyReportRenderer },
    {
      // `availableFrom` (D-137): server configuration, fixed when the report is deployed.
      provide: MONTHLY_REPORT_AVAILABLE_FROM,
      inject: [ConfigService],
      useFactory: (config: ConfigService): string | null => {
        const raw = config.get<string>('MONTHLY_REPORT_AVAILABLE_FROM')?.trim() ?? '';
        if (raw === '') {
          new Logger('ReportingModule').warn(
            'MONTHLY_REPORT_AVAILABLE_FROM no está configurada: solo el mes en curso tiene reporte.',
          );
          return null;
        }
        if (ReportPeriod.parse(raw) === null) {
          throw new Error(`MONTHLY_REPORT_AVAILABLE_FROM debe tener el formato AAAA-MM: "${raw}".`);
        }
        return raw;
      },
    },
  ],
  exports: [MONTHLY_REPORT_CLOSER],
})
export class ReportingModule {}
