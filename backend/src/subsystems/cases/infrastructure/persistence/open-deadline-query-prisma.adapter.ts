import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
import {
  OpenDeadlineQueryPort,
  OpenProceduralDeadlineRow,
} from '../../core/domain/ports/open-deadline-query.port';
import { JurisdictionCode } from '../../core/domain/value-objects/jurisdiction-code';
import { ACTIVE_CASE } from './case-query-prisma.adapter';

/** Only what the deadline and its notice need. */
const OPEN_DEADLINE_SELECT = {
  id: true,
  caption: true,
  sacNumber: true,
  responsibleLawyerId: true,
  jurisdiction: { select: { name: true } },
  currentProceduralAct: {
    select: { id: true, deadlineManualDueDate: true, deadlineComputedDueDate: true },
  },
} as const satisfies Prisma.CaseSelect;

/**
 * Prisma-backed {@link OpenDeadlineQueryPort} (HU51).
 *
 * The definition of an active case is **not** written here: it is
 * {@link ACTIVE_CASE}, the same one the dashboards and every `activeCases`
 * use. This only adds that the current act has a due date, manual or
 * computed.
 *
 * One query, the current act as a one-to-one relation: the number of queries
 * does not grow with the number of cases.
 */
@Injectable()
export class OpenDeadlineQueryPrismaAdapter implements OpenDeadlineQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveWithOpenDeadline(): Promise<OpenProceduralDeadlineRow[]> {
    const rows = await this.prisma.db.case.findMany({
      where: {
        ...ACTIVE_CASE,
        currentProceduralAct: {
          is: {
            OR: [{ deadlineManualDueDate: { not: null } }, { deadlineComputedDueDate: { not: null } }],
          },
        },
      },
      select: OPEN_DEADLINE_SELECT,
      orderBy: { id: 'asc' },
    });

    return rows.flatMap((row): OpenProceduralDeadlineRow[] => {
      const act = row.currentProceduralAct;
      // Same rule as `currentState.dueDate`: the manual date wins (CA-51.4).
      const dueDate = act ? (act.deadlineManualDueDate ?? act.deadlineComputedDueDate) : null;
      // The `where` already guarantees both; narrowed here for the type.
      if (act === null || dueDate === null) {
        return [];
      }
      return [
        {
          caseId: row.id,
          caption: row.caption,
          sacNumber: row.sacNumber,
          jurisdiction: row.jurisdiction.name as JurisdictionCode,
          responsibleLawyerId: row.responsibleLawyerId,
          proceduralActId: act.id,
          dueDate,
        },
      ];
    });
  }
}
