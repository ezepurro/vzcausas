import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { ACTIVE_CASE } from '@subsystems/cases/infrastructure/persistence/case-query-prisma.adapter';
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

/**
 * Prisma-backed {@link LawyerDashboardQuery} (HU41).
 *
 * Reads the tables of `cases` and `people` directly, as ADR-002 allows
 * `reporting`. The definition of an active case is **not** written here: it is
 * `cases`' {@link ACTIVE_CASE}, so the dashboard counts exactly what every
 * other `activeCases` of the contract counts.
 *
 * One query for all the cases, with the two last-act dates as `take: 1`
 * relations, and the offenses for the prescription: the number of queries does
 * not grow with the lawyer's cases.
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
      select: {
        id: true,
        sacNumber: true,
        caption: true,
        currentCustomState: true,
        jurisdiction: { select: { name: true } },
        currentState: { select: { name: true } },
        currentProceduralAct: { select: { deadlineManualDueDate: true, deadlineComputedDueDate: true } },
        proceduralActs: LAST_ACT,
        interruptiveActs: LAST_ACT,
        offenses: {
          select: {
            offenseDate: true,
            legalQualification: { select: { id: true, name: true, prescriptionMonths: true } },
          },
        },
        responsibleLawyer: { select: { id: true, lastName: true, firstName: true } },
      },
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => ({
      caseId: row.id,
      sacNumber: row.sacNumber,
      caption: row.caption,
      jurisdiction: row.jurisdiction.name,
      // A hand-written state wins; otherwise the state of the table, which is
      // "Iniciada" for a case that has no act yet.
      currentStateName: row.currentCustomState ?? row.currentState?.name ?? '',
      // Same rule as `CaseQueryPrismaAdapter`: the manual due date, if adjusted.
      dueDate: row.currentProceduralAct
        ? (row.currentProceduralAct.deadlineManualDueDate ?? row.currentProceduralAct.deadlineComputedDueDate)
        : null,
      lastProceduralActDate: row.proceduralActs[0]?.actDate ?? null,
      lastInterruptiveActDate: row.interruptiveActs[0]?.actDate ?? null,
      offenses: row.offenses.map((offense) => ({
        legalQualificationId: offense.legalQualification.id,
        legalQualificationName: offense.legalQualification.name,
        prescriptionMonths: offense.legalQualification.prescriptionMonths,
        offenseDate: offense.offenseDate,
      })),
      responsibleLawyer: row.responsibleLawyer,
    }));
  }
}
