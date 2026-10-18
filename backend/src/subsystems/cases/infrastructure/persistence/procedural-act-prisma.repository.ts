import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { ProceduralAct } from '../../core/domain/entities/procedural-act';
import { ProceduralActRepository } from '../../core/domain/ports/procedural-act.repository';
import { ProceduralActPrismaMapper } from './procedural-act-prisma.mapper';

@Injectable()
export class ProceduralActPrismaRepository implements ProceduralActRepository {
  constructor(private readonly prisma: PrismaService) {}

  async nextId(): Promise<number> {
    const [{ nextval }] = await this.prisma.db.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval(pg_get_serial_sequence('procedural_acts', 'id'))
    `;
    return Number(nextval);
  }

  async save(act: ProceduralAct): Promise<void> {
    await this.prisma.db.proceduralAct.create({ data: ProceduralActPrismaMapper.toCreateData(act) });
  }
}
