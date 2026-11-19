import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { JurisdictionCode } from '@subsystems/cases/core/domain/value-objects/case/jurisdiction-code';
import {
  MonthlyReportDataset,
  MonthlyReportSource,
} from '../../core/application/ports/monthly-report-source.port';
import { ReportCase } from '../../core/domain/report/report-case';

/**
 * Prisma-backed {@link MonthlyReportSource}.
 *
 * Reads the tables of `cases` and `people` directly, as ADR-002 allows `reporting`
 * (the same exception the dashboards use). The cases of the report are the vigentes
 * (`active: true`, so one given de baja is not there, D-97) **with `startDate`**
 * (D-129). Their history comes with them — procedural acts in force, interruptive
 * acts and offenses — in a single query, so the number of queries does not grow
 * with the cases, and the domain answers "what was true at that date" from it.
 *
 * It does not use `cases`' `ACTIVE_CASE`: that constant is the state **today**,
 * and a report of a past month needs the state **at its cut-off**, which
 * {@link ReportCase} derives from the acts. For today the two agree.
 */
@Injectable()
export class MonthlyReportPrismaSource implements MonthlyReportSource {
  constructor(private readonly prisma: PrismaService) {}

  async load(): Promise<MonthlyReportDataset> {
    const [rows, lawyers] = await Promise.all([
      this.prisma.db.case.findMany({
        where: { active: true, startDate: { not: null } },
        select: {
          id: true,
          sacNumber: true,
          caption: true,
          startDate: true,
          prescriptionDate: true,
          jurisdiction: { select: { name: true } },
          // An orphaned case has none (D-143). One given de baja stays on a case that is already closed.
          responsibleLawyer: { select: { id: true, lastName: true, firstName: true } },
          // An annulled act does not count in anything (§3.13, HU29).
          proceduralActs: {
            where: { active: true },
            select: {
              id: true,
              actDate: true,
              deadlineManualDueDate: true,
              deadlineComputedDueDate: true,
              proceduralState: { select: { terminal: true } },
            },
          },
          interruptiveActs: { select: { actDate: true } },
          offenses: {
            select: {
              offenseDate: true,
              prescriptionDeclaredOn: true,
              legalQualification: { select: { id: true, name: true, prescriptionMonths: true } },
            },
          },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.db.lawyer.findMany({
        where: { active: true },
        select: { id: true, lastName: true, firstName: true, registrationNumber: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    const cases = rows.map((row) =>
      ReportCase.hydrate({
        caseId: row.id,
        sacNumber: row.sacNumber,
        caption: row.caption,
        jurisdiction: row.jurisdiction.name as JurisdictionCode,
        // The filter above guarantees it; the type does not know.
        startDate: row.startDate as Date,
        prescribedOn: row.prescriptionDate,
        responsibleLawyer: row.responsibleLawyer,
        proceduralActs: row.proceduralActs.map((act) => ({
          id: act.id,
          actDate: act.actDate,
          // A hand-written state belongs to no row of `procedural_states`, and is never terminal.
          terminal: act.proceduralState?.terminal ?? false,
          // Same rule as the dashboards and `PrismaCaseRepository`: the manual due date, if adjusted.
          dueDate: act.deadlineManualDueDate ?? act.deadlineComputedDueDate,
        })),
        interruptiveActDates: row.interruptiveActs.map((act) => act.actDate),
        offenses: row.offenses.map((offense) => ({
          legalQualificationId: offense.legalQualification.id,
          legalQualificationName: offense.legalQualification.name,
          prescriptionMonths: offense.legalQualification.prescriptionMonths,
          offenseDate: offense.offenseDate,
          prescriptionDeclaredOn: offense.prescriptionDeclaredOn,
        })),
      }),
    );

    return { cases, lawyers };
  }

  async findUserName(userId: number): Promise<string | null> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: { lastName: true, firstName: true },
    });
    return user === null ? null : `${user.lastName}, ${user.firstName}`;
  }
}
