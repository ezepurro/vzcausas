import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { ProceduralAct } from '../../../core/domain/entities/procedural-act.entity';
import { Prisma } from '../../../../../generated/prisma/client';
import {
  ProceduralActPage,
  ProceduralActRepository,
  ProceduralActView,
} from '../../../core/domain/ports/procedural-act/procedural-act.repository';
import { ProceduralActPrismaMapper } from '../mappers/procedural-act-prisma.mapper';

/**
 * The two relations an act only holds as ids. Neither is filtered by
 * `active`: a deactivated procedural state, or a lawyer given de baja, is part
 * of the case's history and keeps showing in it (§4, Bajas).
 */
const ACT_INCLUDE = {
  proceduralState: { select: { name: true } },
  registeredByLawyer: { select: { lastName: true, firstName: true } },
  // HU28: the user who last modified it, by name from `users` (decision of 05/11/2026).
  lastModifiedBy: { select: { lastName: true, firstName: true } },
} satisfies Prisma.ProceduralActInclude;

type ActRow = Prisma.ProceduralActGetPayload<{ include: typeof ACT_INCLUDE }>;

/** Newest first; on the same date, the last registered first (CA-27.2). Matches the table's index. */
const NEWEST_FIRST: Prisma.ProceduralActOrderByWithRelationInput[] = [{ actDate: 'desc' }, { id: 'desc' }];

@Injectable()
export class PrismaProceduralActRepository implements ProceduralActRepository {
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

  async caseExists(caseId: number): Promise<boolean> {
    const row = await this.prisma.db.case.findFirst({
      where: { id: caseId, active: true },
      select: { id: true },
    });
    return row !== null;
  }

  /**
   * Page and count run in one `$transaction` so both see the same snapshot;
   * issued apart, an act registered between them could report a total that
   * disagrees with the page.
   */
  async listByCase(caseId: number, page: number, limit: number): Promise<ProceduralActPage> {
    const where = { caseId };
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.db.proceduralAct.findMany({
        where,
        include: ACT_INCLUDE,
        orderBy: NEWEST_FIRST,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.db.proceduralAct.count({ where }),
    ]);
    return { items: rows.map(toView), totalItems };
  }

  async findInCase(caseId: number, actId: number): Promise<ProceduralActView | null> {
    // `caseId` in the filter, not checked afterwards: an act of another case
    // must be as absent as one that does not exist.
    const row = await this.prisma.db.proceduralAct.findFirst({
      where: { id: actId, caseId },
      include: ACT_INCLUDE,
    });
    return row ? toView(row) : null;
  }

  async saveModification(act: ProceduralAct): Promise<void> {
    await this.prisma.db.proceduralAct.update({
      where: { id: act.id },
      data: ProceduralActPrismaMapper.toModificationData(act),
    });
  }

  /** Same order as the listing and the index: the newest date first and, on a tie, the last registered. */
  async findLatestInCaseExcept(caseId: number, exceptActId: number): Promise<ProceduralAct | null> {
    const row = await this.prisma.db.proceduralAct.findFirst({
      where: { caseId, id: { not: exceptActId } },
      orderBy: NEWEST_FIRST,
    });
    return row ? ProceduralActPrismaMapper.toDomain(row) : null;
  }
}

/**
 * The name of the resulting state is the table's, or the hand-written text.
 * The schema's CHECK guarantees exactly one of the two is set, so a row with
 * neither is corrupt data, not a case to render.
 */
function toView(row: ActRow): ProceduralActView {
  const resultingStateName = row.proceduralState?.name ?? row.customState;
  if (resultingStateName === null) {
    throw new Error(`Procedural act ${row.id} has neither a procedural state nor a custom state.`);
  }
  return {
    act: ProceduralActPrismaMapper.toDomain(row),
    resultingStateName,
    registeredBy: {
      lastName: row.registeredByLawyer.lastName,
      firstName: row.registeredByLawyer.firstName,
    },
    lastModifiedBy: row.lastModifiedBy,
  };
}

// Shared with `CaseTimelinePrismaAdapter` (HU27): the line of life reads the
// acts exactly as this listing does, so an entry cannot differ from the act.
export {
  ACT_INCLUDE as PROCEDURAL_ACT_INCLUDE,
  NEWEST_FIRST as PROCEDURAL_ACTS_NEWEST_FIRST,
  toView as toProceduralActView,
};
