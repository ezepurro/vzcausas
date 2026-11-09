import { Prisma, ProceduralAct as PrismaProceduralAct } from '../../../../../generated/prisma/client';
import { DayType as PrismaDayType } from '../../../../../generated/prisma/enums';
import { ProceduralAct } from '../../../core/domain/entities/procedural-act.entity';
import { DayType } from '../../../core/domain/value-objects/deadline/day-type';
import { Deadline } from '../../../core/domain/value-objects/deadline/deadline.vo';

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
      lastModifiedByUserId: row.lastModifiedByUserId,
      lastModifiedAt: row.lastModifiedAt,
    });
  }

  /**
   * What a modification writes (HU28). `registered_*` never change; the
   * `ck_procedural_acts_last_modified_*` CHECKs keep who and when together.
   */
  static toModificationData(act: ProceduralAct): Prisma.ProceduralActUncheckedUpdateInput {
    return {
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
      lastModifiedByUserId: act.lastModifiedByUserId,
      lastModifiedAt: act.lastModifiedAt,
    };
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
