/**
 * Body of `GET /dashboards/lawyer` (contract V4 §3.11). Matches
 * `frontend/src/features/dashboard/types/dashboard.ts` field by field: the
 * screen already consumes it. Dates go out as `YYYY-MM-DD`.
 */
export class DashboardLawyerResponseDto {
  id!: number;
  lastName!: string;
  firstName!: string;
}

export class DashboardSummaryResponseDto {
  dueToday!: number;
  overdue!: number;
  dueSoon!: number;
  activeCases!: number;
}

export class DashboardDeadlineResponseDto {
  caseId!: number;
  kind!: 'PROCEDURAL_ACT' | 'HARMFUL_ACT';
  sacNumber!: string | null;
  caption!: string;
  jurisdiction!: string;
  currentStateName!: string;
  responsibleLawyer!: DashboardLawyerResponseDto;
  dueDate!: string;
  businessDaysRemaining!: number;
}

export class CaseToAdvanceResponseDto {
  caseId!: number;
  sacNumber!: string | null;
  caption!: string;
  jurisdiction!: string;
  currentStateName!: string;
  lastActDate!: string | null;
  daysSinceLastAct!: number | null;
}

export class PrescriptionAlertResponseDto {
  caseId!: number;
  sacNumber!: string | null;
  caption!: string;
  responsibleLawyer!: DashboardLawyerResponseDto;
  legalQualificationName!: string;
  startsOn!: string;
  expiresOn!: string;
  elapsedPercentage!: number;
  expired!: boolean;
}

export class LawyerDashboardResponseDto {
  date!: string;
  lawyer!: DashboardLawyerResponseDto;
  summary!: DashboardSummaryResponseDto;
  deadlines!: DashboardDeadlineResponseDto[];
  prescriptionAlerts!: PrescriptionAlertResponseDto[];
  casesToAdvance!: CaseToAdvanceResponseDto[];
}
