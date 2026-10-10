import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { QualificationFilter } from '@subsystems/legal-parameters/core/application/common/get-qualifications.interfaces';
import { LegalQualification } from '@subsystems/legal-parameters/core/domain/entities/legal-qualification';
import { LegalQualificationRepository } from '@subsystems/legal-parameters/core/domain/ports/legal-qualification.repository';
import { PaginatedResult } from '../../../../common/pagination/paginated-result';
import { Prisma } from '../../../../generated/prisma/client';
import { LegalQualificationMapper } from './legal-qualification.mapper';

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
  async existsActiveByName(name: string): Promise<boolean> {
    const row = await this.prisma.db.legalQualification.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, active: true },
      select: { id: true },
    });
    return row !== null;
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
