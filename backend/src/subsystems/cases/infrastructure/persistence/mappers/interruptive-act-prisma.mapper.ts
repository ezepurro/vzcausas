import { Prisma, InterruptiveAct as PrismaInterruptiveAct } from '../../../../../generated/prisma/client';
import { InterruptiveAct } from '../../../core/domain/entities/interruptive-act.entity';

export class InterruptiveActPrismaMapper {
  static toDomain(row: PrismaInterruptiveAct): InterruptiveAct {
    return InterruptiveAct.hydrate({
      id: row.id,
      caseId: row.caseId,
      name: row.name,
      actDate: row.actDate,
      notes: row.notes,
      registeredByUserId: row.registeredByUserId,
      registeredByLawyerId: row.registeredByLawyerId,
      registeredAt: row.registeredAt,
    });
  }

  static toCreateData(act: InterruptiveAct): Prisma.InterruptiveActUncheckedCreateInput {
    return {
      id: act.id,
      caseId: act.caseId,
      name: act.name,
      actDate: act.actDate,
      notes: act.notes,
      registeredByUserId: act.registeredByUserId,
      registeredByLawyerId: act.registeredByLawyerId,
      registeredAt: act.registeredAt,
    };
  }
}
