import { MonthlyReport } from '../../domain/report/monthly-report';

/** DI token for {@link MonthlyReportPdfRenderer}. */
export const MONTHLY_REPORT_PDF_RENDERER = Symbol('MONTHLY_REPORT_PDF_RENDERER');

/** Who issues the PDF and when: the box "Emitido por" and "Emitido el" (§3.13). */
export type ReportIssue = { by: string; at: Date };

/** Draws "Reporte mensual de gestión de causas" (HU43) from the complete set of the report's data (D-141). */
export interface MonthlyReportPdfRenderer {
  render(report: MonthlyReport, issue: ReportIssue): Promise<Uint8Array>;
}
