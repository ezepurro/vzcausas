import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { ACTIVE_CASE } from '@subsystems/cases/infrastructure/persistence/prisma/prisma-case.repository';
import { Prisma } from '../../../../generated/prisma/client';
import {
  DashboardCaseRow,
  DashboardLawyerRef,
  LawyerDashboardQuery,
} from '../../core/application/ports/lawyer-dashboard.query';

/** The most recent act of a relation: only its date, and only one row. */
const LAST_ACT = {
  select: { actDate: true },
  orderBy: [{ actDate: 'desc' as const }, { id: 'desc' as const }],
  take: 1,
};

/** Every interruptive act of the case, by date (D-113): the prescription needs them all. */
const ALL_INTERRUPTIVE_ACTS = {
  select: { actDate: true },
  orderBy: [{ actDate: 'asc' as const }, { id: 'asc' as const }],
};

/** Fields every dashboard case row needs, shared so the lawyer's and the firm's query ask for the same shape. */
const CASE_SELECT = {
  id: true,
  sacNumber: true,
  caption: true,
  currentCustomState: true,
  jurisdiction: { select: { name: true } },
  currentState: { select: { name: true } },
  currentProceduralAct: { select: { deadlineManualDueDate: true, deadlineComputedDueDate: true } },
  proceduralActs: LAST_ACT,
  // Every act, by date (D-113): the prescription needs them all; the last one is
  // also the case's latest actuación.
  interruptiveActs: ALL_INTERRUPTIVE_ACTS,
  offenses: {
    select: {
      offenseDate: true,
      // D-113: a declared offense no longer governs the prescription alerts.
      prescriptionDeclaredOn: true,
      legalQualification: { select: { id: true, name: true, prescriptionMonths: true } },
    },
  },
  responsibleLawyer: { select: { id: true, lastName: true, firstName: true } },
} as const;

type CaseRow = Prisma.CaseGetPayload<{ select: typeof CASE_SELECT }>;

/**
 * Prisma-backed {@link LawyerDashboardQuery} of both dashboards, "Mi día"
 * (HU41) and "Estudio" (HU42).
 *
 * Reads the tables of `cases` and `people` directly, as ADR-002 allows
 * `reporting`. The definition of an active case is **not** written here: it is
 * `cases`' {@link ACTIVE_CASE}, so the dashboards count exactly what every
 * other `activeCases` of the contract counts.
 *
 * One query for all the cases, with the two last-act dates as `take: 1`
 * relations, and the offenses for the prescription: the number of queries does
 * not grow with the lawyer's or the firm's cases.
 */
@Injectable()
export class LawyerDashboardPrismaQuery implements LawyerDashboardQuery {
  constructor(private readonly prisma: PrismaService) {}

  async findLawyer(lawyerId: number): Promise<DashboardLawyerRef | null> {
    return this.prisma.db.lawyer.findUnique({
      where: { id: lawyerId },
      select: { id: true, lastName: true, firstName: true },
    });
  }

  async findActiveCasesOf(lawyerId: number): Promise<DashboardCaseRow[]> {
    const rows = await this.prisma.db.case.findMany({
      where: { ...ACTIVE_CASE, responsibleLawyerId: lawyerId },
      select: CASE_SELECT,
      orderBy: { id: 'asc' },
    });
    return rows.map(LawyerDashboardPrismaQuery.toCaseRow);
  }

  async findActiveLawyers(): Promise<DashboardLawyerRef[]> {
    return this.prisma.db.lawyer.findMany({
      where: { active: true },
      select: { id: true, lastName: true, firstName: true },
      orderBy: { id: 'asc' },
    });
  }

  async findAllActiveCases(): Promise<DashboardCaseRow[]> {
    const rows = await this.prisma.db.case.findMany({
      where: ACTIVE_CASE,
      select: CASE_SELECT,
      orderBy: { id: 'asc' },
    });
    return rows.map(LawyerDashboardPrismaQuery.toCaseRow);
  }

  /** A row of `cases` as the dashboards read it. */
  private static toCaseRow(row: CaseRow): DashboardCaseRow {
    return {
      caseId: row.id,
      sacNumber: row.sacNumber,
      caption: row.caption,
      jurisdiction: row.jurisdiction.name,
      // A hand-written state wins; otherwise the state of the table, which is
      // "Iniciada" for a case that has no act yet.
      currentStateName: row.currentCustomState ?? row.currentState?.name ?? '',
      // Same rule as `PrismaCaseRepository`: the manual due date, if adjusted.
      dueDate: row.currentProceduralAct
        ? (row.currentProceduralAct.deadlineManualDueDate ?? row.currentProceduralAct.deadlineComputedDueDate)
        : null,
      lastProceduralActDate: row.proceduralActs[0]?.actDate ?? null,
      lastInterruptiveActDate: row.interruptiveActs.at(-1)?.actDate ?? null,
      interruptiveActDates: row.interruptiveActs.map((act) => act.actDate),
      offenses: row.offenses.map((offense) => ({
        legalQualificationId: offense.legalQualification.id,
        legalQualificationName: offense.legalQualification.name,
        prescriptionMonths: offense.legalQualification.prescriptionMonths,
        offenseDate: offense.offenseDate,
        prescriptionDeclaredOn: offense.prescriptionDeclaredOn,
      })),
      responsibleLawyer: row.responsibleLawyer,
    };
  }
}
