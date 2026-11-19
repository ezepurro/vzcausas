/**
 * The data of the monthly report measured at a cut-off date: the whole set the
 * snapshot keeps (D-117, D-141), `GET /reports/monthly` shows a part of it and the
 * PDF uses all of it. Plain, JSON-friendly data: it is what `monthly_report_snapshots`
 * stores, so dates travel as `YYYY-MM-DD` strings.
 *
 * It does not hold what comes from other rows or from the configuration and is put
 * together on reading: `status`, `availableFrom`, `currentPeriod`, `monthly`,
 * `admittedChange` and `archivedChange` (see `MonthlyReport`).
 */

/** The three fueros, as the contract names the keys of a count per jurisdiction. */
export type JurisdictionCounts = {
  criminal: number;
  administrative: number;
  amparo: number;
  total: number;
};

export type ReportLawyer = {
  id: number;
  lastName: string;
  firstName: string;
  registrationNumber: string | null;
};

export type ReportLawyerLoad = JurisdictionCounts & {
  lawyer: ReportLawyer;
  /** `total` minus `summary.averagePerLawyer`, one decimal. */
  differenceFromAverage: number;
};

export type ReportJurisdictionRow = {
  /** `CRIMINAL`, `ADMINISTRATIVE` or `AMPARO`. */
  jurisdiction: string;
  atStart: number;
  admitted: number;
  archived: number;
  atEnd: number;
  percentage: number;
};

export type PrescriptionBandCode = 'UNDER_50' | 'FROM_50_TO_70' | 'FROM_70_TO_90' | 'FROM_90';

export type ReportPrescriptionAlert = {
  caseId: number;
  sacNumber: string | null;
  caption: string;
  /** `null` for an orphaned case (D-145): the PDF shows "Sin asignar". */
  responsibleLawyer: { id: number; lastName: string; firstName: string } | null;
  legalQualificationName: string;
  elapsedPercentage: number;
  expired: boolean;
};

export type ReportDeadlines = {
  total: number;
  metOnTime: number;
  metOnLastDay: number;
  overdue: number;
  pending: number;
  interruptiveActs: number;
};

export type MonthlyReportData = {
  /** `AAAA-MM`. */
  period: string;
  /** `YYYY-MM-DD`. */
  dataAsOf: string;
  summary: {
    activeCases: number;
    admitted: number;
    archived: number;
    averagePerLawyer: number;
    minPerLawyer: number | null;
    maxPerLawyer: number | null;
  };
  byJurisdiction: ReportJurisdictionRow[];
  lawyers: ReportLawyerLoad[];
  /** D-145: orphaned cases, counted and never named. Always present, with zeros if none. */
  unassigned: JurisdictionCounts;
  prescription: {
    cases: number;
    bands: { band: PrescriptionBandCode; cases: number; percentage: number }[];
    alerts: ReportPrescriptionAlert[];
  };
  deadlines: ReportDeadlines;
};
