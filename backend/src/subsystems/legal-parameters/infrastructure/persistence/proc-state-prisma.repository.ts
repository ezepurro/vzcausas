import { Injectable } from '@nestjs/common';
import { ProceduralState } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import {
  ProceduralStateRepository,
  ProcStateFilter,
} from '@subsystems/legal-parameters/core/domain/ports/procedural-states.repository';
import { PaginatedResult } from '../../../../common/pagination/paginated-result';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { DayType, Prisma } from '../../../../generated/prisma/client';
import { ProceduralStateMapper } from './proc-state.mapper';
import { JurisdictionCode } from '@subsystems/legal-parameters/core/domain/value-objects/jurisdiction-code';
import { INITIAL_STATE_NAME } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import { Jurisdiction } from '@subsystems/legal-parameters/core/domain/entities/jurisdiction';
import { JurisdictionMapper } from './jurisdiction.mapper';

@Injectable()
export class ProceduralStatePrismaRepository implements ProceduralStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<ProceduralState | null> {
    const row = await this.prisma.proceduralState.findFirst({
      where: {
        stateId: id,
        isActive: true,
        isInitial: false,
      },
      include: { jurisdiction: true },
    });
    return row ? ProceduralStateMapper.toDomain(row) : null;
  }

  async existsByName(jurisdiction: JurisdictionCode, name: string, excludingId?: number): Promise<boolean> {
    const row = await this.prisma.proceduralState.findFirst({
      where: {
        isActive: true,
        name: { equals: name.trim(), mode: 'insensitive' },
        jurisdiction: { name: jurisdiction, isActive: true },
        // Only on PATCH: the state being renamed must not collide with itself.
        ...(excludingId !== undefined && { stateId: { not: excludingId } }),
      },
      select: { stateId: true },
    });
    return row !== null;
  }

  async findJurisdictionByCode(code: JurisdictionCode): Promise<Jurisdiction | null> {
    const row = await this.prisma.jurisdiction.findFirst({
      where: {
        name: code,
        isActive: true,
      },
    });
    return row ? JurisdictionMapper.toDomain(row) : null;
  }

  async nextId(): Promise<number> {
    const [{ nextval }] = await this.prisma.db.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval(pg_get_serial_sequence('procedural_states', 'state_id'))`;
    return Number(nextval);
  }

  /**
   * `stateId` goes explicitly: it was reserved with {@link nextId}, and
   * letting the database pick another one would leave the entity holding an
   * id that matches no row. `createdAt`/`updatedAt` are left to their
   * database defaults.
   */
  async create(procState: ProceduralState): Promise<void> {
    await this.prisma.proceduralState.create({
      data: {
        stateId: procState.id,
        name: procState.name,
        timeLimitDays: procState.timeLimitDays,
        dayType: procState.dayType ?? DayType.NONE,
        terminal: procState.terminal,
        isInitial: procState.isInitial,
        isActive: procState.isActive,
        jurisdictionId: procState.jurisdiction.id,
      },
    });
  }

  /**
   * Writes only the fields a state can change (HU17, HU46). `jurisdictionId`
   * and `isInitial` are left out on purpose: they are fixed, and not sending
   * them makes it impossible for a bug to move a state to another
   * jurisdiction. `updatedAt` is set by Prisma (`@updatedAt`).
   */
  async save(procState: ProceduralState): Promise<void> {
    await this.prisma.proceduralState.update({
      where: { stateId: procState.id },
      data: {
        name: procState.name,
        timeLimitDays: procState.timeLimitDays,
        dayType: procState.dayType ?? DayType.NONE,
        terminal: procState.terminal,
        isActive: procState.isActive,
      },
    });
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

  private toWhere(filter: ProcStateFilter): Prisma.ProceduralStateWhereInput {
    return {
      // Logical deletes are invisible to the client (contract §4), and the
      // system state "Iniciada" is not part of the listing.
      isActive: true,
      isInitial: false,
      ...(filter.jurisdiction && {
        jurisdiction: { name: filter.jurisdiction },
      }),
      ...(filter.search && {
        name: { contains: filter.search, mode: 'insensitive' },
      }),
    };
  }
}
