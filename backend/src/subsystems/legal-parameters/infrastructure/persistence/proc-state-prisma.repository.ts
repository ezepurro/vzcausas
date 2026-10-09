import { Injectable } from '@nestjs/common';
import { ProceduralState } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import { ProceduralStateRepository } from '@subsystems/legal-parameters/core/domain/ports/procedural-states.repository';
import { PaginatedResult } from '../../../../common/pagination/paginated-result';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
import { ProcStateFilter } from '@subsystems/legal-parameters/core/domain/ports/procedural-states.repository';
import { ProceduralStateMapper } from './proc-state.mapper';
import { JurisdictionCode } from '@subsystems/legal-parameters/core/domain/value-objects/jurisdiction-code';
import { INITIAL_STATE_NAME } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';

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
        // No order among states (D-31): by jurisdiction, then by id.
        orderBy: [{ jurisdiction: { name: 'asc' } }, { stateId: 'asc' }],
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

  async findInitialByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralState | null> {
    const row = await this.prisma.proceduralState.findFirst({
      where: {
        isInitial: true,
        isActive: true,
        name: { equals: INITIAL_STATE_NAME, mode: 'insensitive' },
        jurisdiction: { name: jurisdiction, isActive: true },
      },
      include: { jurisdiction: true },
    });
    return row ? ProceduralStateMapper.toDomain(row) : null;
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
