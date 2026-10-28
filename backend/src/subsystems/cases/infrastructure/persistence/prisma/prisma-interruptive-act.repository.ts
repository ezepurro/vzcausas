import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { InterruptiveAct } from '../../../core/domain/entities/interruptive-act.entity';
import { Prisma } from '../../../../../generated/prisma/client';
import {
  InterruptiveActPage,
  InterruptiveActRepository,
  InterruptiveActView,
} from '../../../core/domain/ports/interruptive-act/interruptive-act.repository';
import { InterruptiveActPrismaMapper } from '../mappers/interruptive-act-prisma.mapper';

/** The lawyer is not filtered by `active`: one given de baja is still part of the case's history (§4, Bajas). */
const ACT_INCLUDE = {
  registeredByLawyer: { select: { lastName: true, firstName: true } },
} satisfies Prisma.InterruptiveActInclude;

type ActRow = Prisma.InterruptiveActGetPayload<{ include: typeof ACT_INCLUDE }>;

/**
 * Newest first; on the same date, the last registered first. Matches the
 * table's index, and puts first the act that governs the prescription.
 */
const NEWEST_FIRST: Prisma.InterruptiveActOrderByWithRelationInput[] = [{ actDate: 'desc' }, { id: 'desc' }];

@Injectable()
export class PrismaInterruptiveActRepository implements InterruptiveActRepository {
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

  async caseExists(caseId: number): Promise<boolean> {
    const row = await this.prisma.db.case.findFirst({
      where: { id: caseId, active: true },
      select: { id: true },
    });
    return row !== null;
  }

  /** Page and count in one `$transaction`, so both see the same snapshot. */
  async listByCase(caseId: number, page: number, limit: number): Promise<InterruptiveActPage> {
    const where = { caseId };
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.db.interruptiveAct.findMany({
        where,
        include: ACT_INCLUDE,
        orderBy: NEWEST_FIRST,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.db.interruptiveAct.count({ where }),
    ]);
    return { items: rows.map(toView), totalItems };
  }
}

function toView(row: ActRow): InterruptiveActView {
  return {
    act: InterruptiveActPrismaMapper.toDomain(row),
    registeredBy: {
      lastName: row.registeredByLawyer.lastName,
      firstName: row.registeredByLawyer.firstName,
    },
  };
}

// Shared with `CaseTimelinePrismaAdapter` (HU27), for the same reason as the
// procedural acts: one way of reading an interruptive act.
export {
  ACT_INCLUDE as INTERRUPTIVE_ACT_INCLUDE,
  NEWEST_FIRST as INTERRUPTIVE_ACTS_NEWEST_FIRST,
  toView as toInterruptiveActView,
};
