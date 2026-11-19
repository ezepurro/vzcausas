import { MonthlyReport } from '../../../core/domain/report/monthly-report';
import { MonthlyReportResponseDto } from '../dtos/monthly-report.response.dto';

/**
 * The complete report to what `GET /reports/monthly` shows (D-141): the fields are
 * chosen one by one, never spread, so nothing that only the PDF uses can leak into
 * the response when the data grows.
 */
export class MonthlyReportHttpMapper {
  static toResponse(report: MonthlyReport): MonthlyReportResponseDto {
    const { data } = report;
    return {
      period: data.period,
      dataAsOf: data.dataAsOf,
      availableFrom: report.availableFrom,
      currentPeriod: report.currentPeriod,
      summary: {
        activeCases: data.summary.activeCases,
        admitted: data.summary.admitted,
        archived: data.summary.archived,
        admittedChange: report.admittedChange,
        archivedChange: report.archivedChange,
        averagePerLawyer: data.summary.averagePerLawyer,
        minPerLawyer: data.summary.minPerLawyer,
        maxPerLawyer: data.summary.maxPerLawyer,
      },
      byJurisdiction: data.byJurisdiction.map((row) => ({
        jurisdiction: row.jurisdiction,
        atEnd: row.atEnd,
        percentage: row.percentage,
      })),
      lawyers: data.lawyers.map((load) => ({
        lawyer: { id: load.lawyer.id, lastName: load.lawyer.lastName, firstName: load.lawyer.firstName },
        criminal: load.criminal,
        administrative: load.administrative,
        amparo: load.amparo,
        total: load.total,
      })),
      unassigned: {
        criminal: data.unassigned.criminal,
        administrative: data.unassigned.administrative,
        amparo: data.unassigned.amparo,
        total: data.unassigned.total,
      },
      monthly: report.monthly.map((month) => ({
        period: month.period,
        admitted: month.admitted,
        archived: month.archived,
      })),
      prescription: {
        cases: data.prescription.cases,
        bands: data.prescription.bands.map((band) => ({ band: band.band, cases: band.cases })),
      },
    };
  }
}
