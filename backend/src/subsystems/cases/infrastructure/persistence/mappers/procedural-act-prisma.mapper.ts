import { Prisma, ProceduralAct as PrismaProceduralAct } from '../../../../../generated/prisma/client';
import { DayType as PrismaDayType } from '../../../../../generated/prisma/enums';
import { ProceduralAct } from '../../../core/domain/entities/procedural-act';
import { DayType } from '../../../core/domain/value-objects/day-type';
import { Deadline } from '../../../core/domain/value-objects/deadline';

/** Translates a {@link ProceduralAct} to and from its `procedural_acts` row. */
export class ProceduralActPrismaMapper {
  static toDomain(row: PrismaProceduralAct): ProceduralAct {
    return ProceduralAct.hydrate({
      id: row.id,
      caseId: row.caseId,
      proceduralStateId: row.proceduralStateId,
      customState: row.customState,
      actDate: row.actDate,
      notificationDate: row.notificationDate,
      notes: row.notes,
      // The deadline is stored flat, with the `deadline_` prefix: it is a value object of the act.
      deadline: Deadline.hydrate({
        timeLimitDays: row.deadlineTimeLimitDays,
        dayType: row.deadlineDayType as DayType,
        countsFrom: row.deadlineCountsFrom,
        computedDueDate: row.deadlineComputedDueDate,
        manualDueDate: row.deadlineManualDueDate,
      }),
      registeredByUserId: row.registeredByUserId,
      registeredByLawyerId: row.registeredByLawyerId,
      registeredAt: row.registeredAt,
    });
  }

  static toCreateData(act: ProceduralAct): Prisma.ProceduralActUncheckedCreateInput {
    return {
      id: act.id,
      caseId: act.caseId,
      proceduralStateId: act.proceduralStateId,
      customState: act.customState,
      actDate: act.actDate,
      notificationDate: act.notificationDate,
      notes: act.notes,
      deadlineTimeLimitDays: act.deadline.timeLimitDays,
      deadlineDayType: act.deadline.dayType as PrismaDayType,
      deadlineCountsFrom: act.deadline.countsFrom,
      deadlineComputedDueDate: act.deadline.computedDueDate,
      deadlineManualDueDate: act.deadline.manualDueDate,
      registeredByUserId: act.registeredByUserId,
      registeredByLawyerId: act.registeredByLawyerId,
      registeredAt: act.registeredAt,
    };
  }
}
