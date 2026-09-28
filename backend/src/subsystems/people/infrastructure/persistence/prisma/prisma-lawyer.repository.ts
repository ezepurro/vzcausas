import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import { Lawyer } from "../../../core/domain/entities/lawyer.entity";
import {
  LawyerPage,
  LawyerRepository,
  LawyerSearchCriteria,
} from "../../../core/domain/ports/lawyer.repository";
import { RegistrationNumber } from "../../../core/domain/value-objects/registration-number.vo";
import { LawyerPrismaMapper } from "./lawyer-prisma.mapper";

@Injectable()
export class PrismaLawyerRepository implements LawyerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async nextId(): Promise<number> {
    const [{ nextval }] = await this.prisma.client.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval(pg_get_serial_sequence('lawyers', 'id'))`;
    return Number(nextval);
  }

  async existsByRegistrationNumber(
    registrationNumber: RegistrationNumber,
  ): Promise<boolean> {
    const row = await this.prisma.client.lawyer.findUnique({
      where: { registrationNumber: registrationNumber.toString() },
      select: { id: true },
    });
    return row !== null;
  }

  async create(lawyer: Lawyer): Promise<void> {
    await this.prisma.client.lawyer.create({
      data: {
        id: lawyer.id,
        fullName: lawyer.fullName,
        registrationNumber: lawyer.registrationNumber.toString(),
        active: lawyer.isActive(),
      },
    });
  }

  async findById(id: number): Promise<Lawyer | null> {
    const row = await this.prisma.client.lawyer.findUnique({ where: { id } });
    return row ? LawyerPrismaMapper.toDomain(row) : null;
  }

  async findByIds(ids: readonly number[]): Promise<Lawyer[]> {
    const rows = await this.prisma.client.lawyer.findMany({
      where: { id: { in: [...ids] } },
    });
    return rows.map(LawyerPrismaMapper.toDomain);
  }

  /**
   * Page and count run inside one `$transaction` so both observe the
   * same snapshot. Issued separately, a concurrent insert between
   * them could yield a `totalItems` that disagrees with the page —
   * the kind of drift that shows up as a phantom empty last page.
   *
   * This is the one place that goes through `this.prisma` rather than
   * `this.prisma.client`: it opens its own read transaction, which the
   * transactional client deliberately cannot do. Safe because listing
   * is never called from inside a write transaction — if that ever
   * changes, this has to become two plain awaits.
   *
   * `mode: "insensitive"` gives the case-insensitive match the
   * contract's `search` implies; Postgres `LIKE` is case-sensitive by
   * default, so without it "peralta" would miss "Peralta".
   */
  async search(criteria: LawyerSearchCriteria): Promise<LawyerPage> {
    const where = {
      active: true,
      ...(criteria.search
        ? {
            OR: [
              {
                fullName: {
                  contains: criteria.search,
                  mode: "insensitive" as const,
                },
              },
              {
                registrationNumber: {
                  contains: criteria.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.client.lawyer.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (criteria.page - 1) * criteria.limit,
        take: criteria.limit,
      }),
      this.prisma.client.lawyer.count({ where }),
    ]);

    return { items: rows.map(LawyerPrismaMapper.toDomain), totalItems };
  }
}
