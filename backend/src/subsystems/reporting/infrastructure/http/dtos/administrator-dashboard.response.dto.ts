import {
  DashboardDeadlineResponseDto,
  DashboardLawyerResponseDto,
  DashboardSummaryResponseDto,
  PrescriptionAlertResponseDto,
} from './lawyer-dashboard.response.dto';

/**
 * Body of `GET /dashboards/administrator` (contract V4 §3.11). Reuses the
 * lawyer dashboard's shared shapes (`DashboardLawyerResponseDto`,
 * `DashboardSummaryResponseDto`, `DashboardDeadlineResponseDto`,
 * `PrescriptionAlertResponseDto`): the two tableros share them field by
 * field. Dates go out as `YYYY-MM-DD`.
 */
export class CasesByJurisdictionResponseDto {
  jurisdiction!: string;
  activeCases!: number;
}

export class OpenDeadlinesResponseDto {
  overdue!: number;
  dueToday!: number;
  dueSoon!: number;
  later!: number;
}

export class TeamMemberResponseDto {
  lawyer!: DashboardLawyerResponseDto;
  activeCases!: number;
  openDeadlines!: OpenDeadlinesResponseDto;
}

export class AdministratorDashboardResponseDto {
  date!: string;
  summary!: DashboardSummaryResponseDto;
  casesByJurisdiction!: CasesByJurisdictionResponseDto[];
  deadlines!: DashboardDeadlineResponseDto[];
  prescriptionAlerts!: PrescriptionAlertResponseDto[];
  team!: TeamMemberResponseDto[];
}
