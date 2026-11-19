/**
 * Body of `GET /reports/monthly` (contract V6 §3.13, D-141): **only what the
 * "Reportes" screen draws**. What only the PDF uses (`status`, `atStart`,
 * `registrationNumber`, `differenceFromAverage`, `balance`, `activeAtEnd`, the
 * bands' `percentage`, `prescription.alerts` and `deadlines`) is not here.
 */
export class MonthlyReportSummaryResponseDto {
  activeCases!: number;
  admitted!: number;
  archived!: number;
  admittedChange!: number | null;
  archivedChange!: number | null;
  averagePerLawyer!: number;
  minPerLawyer!: number | null;
  maxPerLawyer!: number | null;
}

export class MonthlyReportJurisdictionResponseDto {
  jurisdiction!: string;
  atEnd!: number;
  percentage!: number;
}

export class MonthlyReportLawyerResponseDto {
  lawyer!: { id: number; lastName: string; firstName: string };
  criminal!: number;
  administrative!: number;
  amparo!: number;
  total!: number;
}

/** D-145: the "Sin asignar" row of the load by lawyer. Only numbers, never a case. */
export class MonthlyReportUnassignedResponseDto {
  criminal!: number;
  administrative!: number;
  amparo!: number;
  total!: number;
}

export class MonthlyReportMonthResponseDto {
  period!: string;
  admitted!: number | null;
  archived!: number | null;
}

export class MonthlyReportPrescriptionResponseDto {
  cases!: number;
  bands!: { band: string; cases: number }[];
}

export class MonthlyReportResponseDto {
  period!: string;
  dataAsOf!: string;
  availableFrom!: string;
  currentPeriod!: string;
  summary!: MonthlyReportSummaryResponseDto;
  byJurisdiction!: MonthlyReportJurisdictionResponseDto[];
  lawyers!: MonthlyReportLawyerResponseDto[];
  unassigned!: MonthlyReportUnassignedResponseDto;
  monthly!: MonthlyReportMonthResponseDto[];
  prescription!: MonthlyReportPrescriptionResponseDto;
}
