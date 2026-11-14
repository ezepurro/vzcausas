import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { ForbiddenActionError } from '@shared/domain/domain-error';
import {
  DashboardCaseRow,
  DashboardLawyerRef,
  LAWYER_DASHBOARD_QUERY,
  LawyerDashboardQuery,
} from '../ports/lawyer-dashboard.query';
import {
  countByUrgency,
  DashboardDeadlineView,
  PrescriptionAlertView,
  toDeadline,
  toPrescriptionAlerts,
} from './dashboard-shared';

const LAWYER_ROLE = 'LAWYER';
const DAY_MS = 24 * 60 * 60 * 1000;

export type CaseToAdvanceView = {
  caseId: number;
  sacNumber: string | null;
  caption: string;
  jurisdiction: string;
  currentStateName: string;
  lastActDate: Date | null;
  daysSinceLastAct: number | null;
};

export type LawyerDashboardView = {
  date: Date;
  lawyer: DashboardLawyerRef;
  summary: { dueToday: number; overdue: number; dueSoon: number; activeCases: number };
  deadlines: DashboardDeadlineView[];
  prescriptionAlerts: PrescriptionAlertView[];
  casesToAdvance: CaseToAdvanceView[];
};

/**
 * HU41 — "Mi día": the dashboard of the lawyer who is asking (contract V4
 * §3.11, `GET /dashboards/lawyer`).
 *
 * It is always **the caller's own** dashboard: the user needs the `LAWYER` role
 * and a linked lawyer record, and there is no parameter to ask for another
 * lawyer's. The scope is the active cases the lawyer is responsible for.
 *
 * Everything is computed here, per request, against today's date in Córdoba,
 * so a procedural act shows the moment it is registered (CA-41.12). The rules
 * it rests on are `cases`' — what an active case is, how business days count,
 * how prescription runs —
 * and are reused from there, not rewritten (ADR-002).
 */
@Injectable()
export class GetLawyerDashboard {
  constructor(
    @Inject(LAWYER_DASHBOARD_QUERY) private readonly query: LawyerDashboardQuery,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(input: { actor: AuthenticatedUser }): Promise<LawyerDashboardView> {
    const { actor } = input;
    if (!actor.roleNames.includes(LAWYER_ROLE) || actor.lawyerId === null) {
      throw new ForbiddenActionError('FORBIDDEN', 'Se requiere el rol LAWYER para realizar esta operación.');
    }

    const lawyer = await this.query.findLawyer(actor.lawyerId);
    if (lawyer === null) {
      throw new Error(`The lawyer ${actor.lawyerId} linked to user ${actor.userId} does not exist.`);
    }

    const today = this.clock.today();
    const cases = await this.query.findActiveCasesOf(actor.lawyerId);

    const deadlines = cases
      .filter((row): row is DashboardCaseRow & { dueDate: Date } => row.dueDate !== null)
      .map((row) => toDeadline(row, today))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime() || a.caseId - b.caseId);

    const casesToAdvance = cases
      .filter((row) => row.dueDate === null)
      .map((row) => GetLawyerDashboard.toCaseToAdvance(row, today))
      .sort(GetLawyerDashboard.longestWithoutMovementFirst);

    return {
      date: today,
      lawyer,
      summary: { ...countByUrgency(deadlines), activeCases: cases.length },
      deadlines,
      prescriptionAlerts: toPrescriptionAlerts(cases, today),
      casesToAdvance,
    };
  }

  /** "Última actuación": the most recent act, procedural or interruptive. */
  private static toCaseToAdvance(row: DashboardCaseRow, today: Date): CaseToAdvanceView {
    const lastActDate = GetLawyerDashboard.latest(row.lastProceduralActDate, row.lastInterruptiveActDate);
    return {
      caseId: row.caseId,
      sacNumber: row.sacNumber,
      caption: row.caption,
      jurisdiction: row.jurisdiction,
      currentStateName: row.currentStateName,
      lastActDate,
      // Calendar days ("71 días"), not business days: it measures how long the case has been still.
      daysSinceLastAct: lastActDate === null ? null : Math.round((today.getTime() - lastActDate.getTime()) / DAY_MS),
    };
  }

  private static latest(a: Date | null, b: Date | null): Date | null {
    if (a === null) return b;
    if (b === null) return a;
    return a > b ? a : b;
  }

  /** Cases with no act at all first; then the longest without movement. */
  private static longestWithoutMovementFirst(a: CaseToAdvanceView, b: CaseToAdvanceView): number {
    if (a.daysSinceLastAct === null || b.daysSinceLastAct === null) {
      return (a.daysSinceLastAct === null ? 0 : 1) - (b.daysSinceLastAct === null ? 0 : 1) || a.caseId - b.caseId;
    }
    return b.daysSinceLastAct - a.daysSinceLastAct || a.caseId - b.caseId;
  }
}
