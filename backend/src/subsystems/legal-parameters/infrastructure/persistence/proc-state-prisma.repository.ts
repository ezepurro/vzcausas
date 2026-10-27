import { Injectable } from '@nestjs/common';
import { ProceduralState } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import {
  ProceduralStateRepository,
  ProcStateFilter,
} from '@subsystems/legal-parameters/core/domain/ports/procedural-states.repository';
import { PaginatedResult } from '@shared/domain/paginated-result';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { DayType, Prisma } from '../../../../generated/prisma/client';
import { ProceduralStateMapper } from './proc-state.mapper';
import { JurisdictionCode } from '@subsystems/legal-parameters/core/domain/value-objects/jurisdiction-code';
import { INITIAL_STATE_NAME } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import { Jurisdiction } from '@subsystems/legal-parameters/core/domain/entities/jurisdiction';
import { JurisdictionMapper } from './jurisdiction.mapper';
import { ProceduralStateAlreadyExistsError } from '@subsystems/legal-parameters/core/domain/errors/procedural-state.errors';

/**
 * Partial unique index (migration `add_indexes_constraints_sprint2`):
 * `(jurisdiction_id, lower(name)) WHERE is_active`. Its violation is the
 * only `P2002` that means "duplicate name"; any other one is a bug and must
 * surface as such.
 */
const ACTIVE_NAME_UNIQUE_INDEX = 'procedural_states_jurisdiction_name_active_key';

@Injectable()
export class ProceduralStatePrismaRepository implements ProceduralStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsActiveByName(jurisdictionId: number, name: string): Promise<boolean> {
    // Same rule as the partial unique index of the table: per jurisdiction,
    // among the active states, ignoring case. The initial state counts too.
    const row = await this.prisma.proceduralState.findFirst({
      where: { jurisdictionId, isActive: true, name: { equals: name, mode: 'insensitive' } },
      select: { stateId: true },
    });
    return row !== null;
  }

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
   *
   * @throws {ProceduralStateAlreadyExistsError} if another active state of
   *   the jurisdiction took the name in the meantime (see {@link translateUniqueViolation}).
   */
  async create(procState: ProceduralState): Promise<void> {
    try {
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
    } catch (error) {
      this.translateUniqueViolation(error);
    }
  }

  /**
   * Writes only the fields a state can change (HU17, HU46). `jurisdictionId`
   * and `isInitial` are left out on purpose: they are fixed, and not sending
   * them makes it impossible for a bug to move a state to another
   * jurisdiction. `updatedAt` is set by Prisma (`@updatedAt`).
   *
   * @throws {ProceduralStateAlreadyExistsError} if a rename collides with a
   *   name taken in the meantime (see {@link translateUniqueViolation}).
   */
  async save(procState: ProceduralState): Promise<void> {
    try {
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
    } catch (error) {
      this.translateUniqueViolation(error);
    }
  }

  /**
   * The use cases check `existsByName` before writing, but two concurrent
   * requests can both pass that check; the partial unique index stops the
   * second one. Without this, that request would end in a 500 instead of
   * the contract's 409.
   *
   * With the `PrismaPg` driver adapter, the violated index arrives in
   * `meta.driverAdapterError.cause.constraint.index`. Any other error,
   * including a `P2002` on a different constraint, is rethrown untouched.
   */
  private translateUniqueViolation(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      this.violatedIndex(error) === ACTIVE_NAME_UNIQUE_INDEX
    ) {
      throw new ProceduralStateAlreadyExistsError();
    }
    throw error;
  }

  /** Name of the index behind a `P2002`, or `undefined` if Prisma did not report it. */
  private violatedIndex(error: Prisma.PrismaClientKnownRequestError): string | undefined {
    const meta = error.meta as { driverAdapterError?: { cause?: { constraint?: { index?: string } } } } | undefined;
    return meta?.driverAdapterError?.cause?.constraint?.index;
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

  async findPrescribedByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralState | null> {
    // The flag, not the name: a partial unique index keeps one per jurisdiction
    // (`procedural_states_one_prescribed_per_jurisdiction_key`). It is protected
    // against a baja (CA-33.13), so `isActive` only guards against broken data.
    const row = await this.prisma.proceduralState.findFirst({
      where: { isPrescribed: true, isActive: true, jurisdiction: { name: jurisdiction, isActive: true } },
      include: { jurisdiction: true },
    });
    return row ? ProceduralStateMapper.toDomain(row) : null;
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
