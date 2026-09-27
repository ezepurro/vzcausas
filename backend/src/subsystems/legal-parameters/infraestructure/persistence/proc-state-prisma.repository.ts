import { Injectable } from '@nestjs/common';
import { ProceduralState } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import { ProceduralStateRepository } from '@subsystems/legal-parameters/core/domain/ports/procedural-states.repository';
import { PaginatedResult } from '../../../../common/pagination/paginated-result';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
import { ProcStateFilter } from '@subsystems/legal-parameters/core/application/common/get-proc-states.interfaces';
import { ProceduralStateMapper } from './proc-state.mapper';

@Injectable()
export class ProceduralStatePrismaRepository implements ProceduralStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(procState: ProceduralState): Promise<void> {}

  async findAll(): Promise<ProceduralState[]> {
    throw new Error('Method not implemented.');
  }

  async findPaginated(filter: ProcStateFilter, page: number, limit: number): Promise<PaginatedResult<ProceduralState>> {
    const where = this.toWhere(filter);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.proceduralState.findMany({
        where,
        include: { jurisdiction: true },
        skip: (page - 1) * limit,
        take: limit,
        // Contract §3.4: by jurisdiction, then by position within it.
        orderBy: [{ jurisdiction: { name: 'asc' } }, { position: 'asc' }, { stateId: 'asc' }],
      }),
      this.prisma.proceduralState.count({ where }),
    ]);

    return {
      items: rows.map(ProceduralStateMapper.toDomain),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAndCountAll(): Promise<ProceduralState[]> {
    throw new Error('Method not implemented.');
  }

  private toWhere(filter: ProcStateFilter): Prisma.ProceduralStateWhereInput {
    return {
      // Logical deletes are invisible to the client (contract §4).
      isActive: true,
      ...(filter.jurisdiction && {
        jurisdiction: { name: filter.jurisdiction },
      }),
      ...(filter.search && {
        name: { contains: filter.search, mode: 'insensitive' },
      }),
    };
  }
}
