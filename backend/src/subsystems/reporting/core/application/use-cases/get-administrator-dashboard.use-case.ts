import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { ForbiddenActionError } from '@shared/domain/domain-error';
import { JurisdictionCode } from '@subsystems/cases/core/domain/value-objects/case/jurisdiction-code';
import {
  DashboardCaseRow,
  DashboardLawyerRef,
  LAWYER_DASHBOARD_QUERY,
  LawyerDashboardQuery,
} from '../ports/lawyer-dashboard.query';
import {
  countByUrgency,
  DashboardDeadlineView,
  DUE_SOON_MAX_BUSINESS_DAYS,
  PrescriptionAlertView,
  toDeadline,
  toPrescriptionAlerts,
} from './dashboard-shared';

const ADMINISTRATOR_ROLE = 'ADMINISTRATOR';

export type CasesByJurisdictionView = { jurisdiction: string; activeCases: number };

export type TeamMemberView = {
  lawyer: DashboardLawyerRef;
  activeCases: number;
  openDeadlines: { overdue: number; dueToday: number; dueSoon: number; later: number };
};

export type AdministratorDashboardView = {
  date: Date;
  summary: { dueToday: number; overdue: number; dueSoon: number; activeCases: number };
  casesByJurisdiction: CasesByJurisdictionView[];
  deadlines: DashboardDeadlineView[];
  prescriptionAlerts: PrescriptionAlertView[];
  team: TeamMemberView[];
};

/**
 * HU42 — "Estudio": the dashboard of the whole firm (contract V4 §3.11,
 * `GET /dashboards/administrator`).
 *
 * Unlike HU41, its scope is not the caller's own cases: it needs the
 * `ADMINISTRATOR` role and nothing else — no linked lawyer record to check.
 *
 * Reuses `toDeadline`, `toPrescriptionAlerts` and `countByUrgency` from
 * `dashboard-shared` (same cuts as "Mi día") and `JurisdictionCode` from
 * `cases` for the three fueros, so none of those rules are written twice
 * (ADR-002).
 */
@Injectable()
export class GetAdministratorDashboard {
  constructor(
    @Inject(LAWYER_DASHBOARD_QUERY) private readonly query: LawyerDashboardQuery,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(input: { actor: AuthenticatedUser }): Promise<AdministratorDashboardView> {
    const { actor } = input;
    if (!actor.roleNames.includes(ADMINISTRATOR_ROLE)) {
      throw new ForbiddenActionError('FORBIDDEN', 'Se requiere el rol ADMINISTRATOR para realizar esta operación.');
    }

    const today = this.clock.today();
    const cases = await this.query.findAllActiveCases();
    const lawyers = await this.query.findActiveLawyers();

    const deadlines = cases
      .filter((row): row is DashboardCaseRow & { dueDate: Date } => row.dueDate !== null)
      .map((row) => toDeadline(row, today))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime() || a.caseId - b.caseId);

    const team = lawyers.map((lawyer) => toTeamMember(lawyer, cases, deadlines)).sort(byUrgencyThenName);

    return {
      date: today,
      summary: { ...countByUrgency(deadlines), activeCases: cases.length },
      casesByJurisdiction: toCasesByJurisdiction(cases),
      deadlines,
      prescriptionAlerts: toPrescriptionAlerts(cases, today),
      team,
    };
  }
}

/** "Cartera por fuero": the three fueros always appear, even with zero cases (CA-42.3). */
function toCasesByJurisdiction(cases: DashboardCaseRow[]): CasesByJurisdictionView[] {
  return Object.values(JurisdictionCode).map((jurisdiction) => ({
    jurisdiction,
    activeCases: cases.filter((row) => row.jurisdiction === jurisdiction).length,
  }));
}

/** "Carga del equipo": one row per lawyer vigente, cases or not (CA-42.6). */
function toTeamMember(
  lawyer: DashboardLawyerRef,
  cases: DashboardCaseRow[],
  deadlines: DashboardDeadlineView[],
): TeamMemberView {
  const ownDeadlines = deadlines.filter((d) => d.responsibleLawyer.id === lawyer.id);
  return {
    lawyer,
    activeCases: cases.filter((row) => row.responsibleLawyer.id === lawyer.id).length,
    openDeadlines: {
      ...countByUrgency(ownDeadlines),
      later: ownDeadlines.filter((d) => d.businessDaysRemaining > DUE_SOON_MAX_BUSINESS_DAYS).length,
    },
  };
}

/** CA-42.7: most overdue first, then most due today, then most due soon; ties by last/first name. */
function byUrgencyThenName(a: TeamMemberView, b: TeamMemberView): number {
  return (
    b.openDeadlines.overdue - a.openDeadlines.overdue ||
    b.openDeadlines.dueToday - a.openDeadlines.dueToday ||
    b.openDeadlines.dueSoon - a.openDeadlines.dueSoon ||
    a.lawyer.lastName.localeCompare(b.lawyer.lastName) ||
    a.lawyer.firstName.localeCompare(b.lawyer.firstName)
  );
}
