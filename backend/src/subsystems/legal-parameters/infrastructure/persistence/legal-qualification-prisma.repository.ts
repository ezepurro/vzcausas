import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { QualificationFilter } from '@subsystems/legal-parameters/core/application/common/get-qualifications.interfaces';
import { LegalQualification } from '@subsystems/legal-parameters/core/domain/entities/legal-qualification';
import { LegalQualificationRepository } from '@subsystems/legal-parameters/core/domain/ports/legal-qualification.repository';
import { LegalQualificationAlreadyExistsError } from '@subsystems/legal-parameters/core/domain/errors/legal-parameters.errors';
import { PaginatedResult } from '@shared/domain/paginated-result';
import { Prisma } from '../../../../generated/prisma/client';
import { LegalQualificationMapper } from './legal-qualification.mapper';

/**
 * Partial unique index (migration `add_indexes_constraints_sprint2`):
 * `lower(name) WHERE active`. Its violation is the only `P2002` that means
 * "duplicate denomination"; any other one is a bug and must surface as such.
 */
const ACTIVE_NAME_UNIQUE_INDEX = 'legal_qualifications_name_active_key';

/**
 * Prisma-backed {@link LegalQualificationRepository}.
 *
 * Every query goes through `prisma.db` rather than the service
 * itself: that accessor returns the open transaction's client when
 * there is one, and a write issued outside it would not roll back
 * with the rest.
 */
@Injectable()
export class LegalQualificationPrismaRepository implements LegalQualificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async nextId(): Promise<number> {
    const [{ nextval }] = await this.prisma.db.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval(pg_get_serial_sequence('legal_qualifications', 'id'))`;
    return Number(nextval);
  }

  async save(qualification: LegalQualification): Promise<void> {
    await this.prisma.db.legalQualification.create({
      data: {
        id: qualification.id,
        name: qualification.name,
        prescriptionMonths: qualification.prescriptionMonths,
        active: qualification.isActive,
      },
    });
  }

  /**
   * Mirrors the partial unique index
   * `legal_qualifications_name_active_key` over `lower(name)`: only
   * current qualifications are considered, so one given up releases
   * its denomination (CA-48.4).
   *
   * `mode: 'insensitive'` with `equals` is what makes the comparison
   * ignore case, the way the index's `lower()` does. Postgres string
   * equality is case-sensitive by default, so without it "HURTO
   * SIMPLE" would pass this check and then hit a raw constraint
   * violation at insert time.
   */
  async existsActiveByName(name: string, excludingId?: number): Promise<boolean> {
    const row = await this.prisma.db.legalQualification.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        active: true,
        // The qualification being renamed does not collide with itself (CA-49.2).
        ...(excludingId !== undefined && { id: { not: excludingId } }),
      },
      select: { id: true },
    });
    return row !== null;
  }

  /**
   * One conditional write: `active: true` in the `WHERE` makes a row given
   * up by a concurrent request count as not written, so the use case answers
   * 404 instead of modifying — or giving up twice — a qualification the
   * client can no longer see (CA-49.6, CA-50.4). `updatedAt` is Prisma's.
   */
  async update(qualification: LegalQualification): Promise<boolean> {
    try {
      const { count } = await this.prisma.db.legalQualification.updateMany({
        where: { id: qualification.id, active: true },
        data: {
          name: qualification.name,
          prescriptionMonths: qualification.prescriptionMonths,
          active: qualification.isActive,
        },
      });
      return count === 1;
    } catch (error) {
      this.translateUniqueViolation(error);
    }
  }

  /**
   * `UpdateLegalQualification` checks `existsActiveByName` before writing,
   * but two concurrent renames can both pass that check; the partial unique
   * index stops the second one. Without this, that request would end in a
   * 500 instead of the contract's 409 (CA-49.2). Same translation as
   * `proc-state-prisma.repository.ts`: with the `PrismaPg` driver adapter the
   * violated index arrives in `meta.driverAdapterError.cause.constraint.index`,
   * and any other error, a `P2002` on another constraint included, is
   * rethrown untouched.
   */
  private translateUniqueViolation(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      this.violatedIndex(error) === ACTIVE_NAME_UNIQUE_INDEX
    ) {
      throw new LegalQualificationAlreadyExistsError();
    }
    throw error;
  }

  /** Name of the index behind a `P2002`, or `undefined` if Prisma did not report it. */
  private violatedIndex(error: Prisma.PrismaClientKnownRequestError): string | undefined {
    const meta = error.meta as { driverAdapterError?: { cause?: { constraint?: { index?: string } } } } | undefined;
    return meta?.driverAdapterError?.cause?.constraint?.index;
  }

  async findActiveById(id: number): Promise<LegalQualification | null> {
    const row = await this.prisma.db.legalQualification.findFirst({
      where: { id, active: true },
    });
    return row ? LegalQualificationMapper.toDomain(row) : null;
  }

  /**
   * Page and count run inside one `$transaction` so both observe the
   * same snapshot. Issued separately, a concurrent insert between them
   * could report a total that disagrees with the page.
   *
   * This is the one place that goes through `this.prisma` rather than
   * `this.prisma.db`: it opens its own read transaction, which the
   * transactional client deliberately cannot do. Safe because listing
   * is never called from inside a write transaction.
   */
  async findPaginated(
    filter: QualificationFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<LegalQualification>> {
    const where = this.toWhere(filter);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.db.legalQualification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        // Alphabetically by denomination (CA-47.3).
        orderBy: { name: 'asc' },
      }),
      this.prisma.db.legalQualification.count({ where }),
    ]);

    return {
      items: rows.map(LegalQualificationMapper.toDomain),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private toWhere(filter: QualificationFilter): Prisma.LegalQualificationWhereInput {
    return {
      // Logical deletes are invisible to the client (CA-47.9).
      active: true,
      ...(filter.search && {
        // One field covers both halves of CA-47.4: `name` carries the
        // article, so "hurto" and "art. 162" match the same column.
        // `mode: 'insensitive'` does not fold accents — same known
        // limit as the client search (Q-03).
        name: { contains: filter.search, mode: 'insensitive' },
      }),
    };
  }
}
