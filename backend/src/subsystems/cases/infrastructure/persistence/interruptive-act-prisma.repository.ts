import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { InterruptiveAct } from '../../core/domain/entities/interruptive-act';
import { InterruptiveActRepository } from '../../core/domain/ports/interruptive-act.repository';
import { InterruptiveActPrismaMapper } from './interruptive-act-prisma.mapper';

@Injectable()
export class InterruptiveActPrismaRepository implements InterruptiveActRepository {
  constructor(private readonly prisma: PrismaService) {}

  async nextId(): Promise<number> {
    const [{ nextval }] = await this.prisma.db.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval(pg_get_serial_sequence('interruptive_acts', 'id'))
    `;
    return Number(nextval);
  }

  async save(act: InterruptiveAct): Promise<void> {
    await this.prisma.db.interruptiveAct.create({ data: InterruptiveActPrismaMapper.toCreateData(act) });
  }
}
