import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import {
  CaseListItem,
  CurrentStateView,
} from "../../../core/application/read-models/case-list-item";
import {
  CasePage,
  CaseQueryPort,
  CaseSearchCriteria,
} from "../../../core/domain/ports/case-query.port";

/** What the query below pulls back, before being projected. */
type CaseRow = {
  id: number;
  sacNumber: string | null;
  caption: string;
  court: string | null;
  startDate: Date;
  active: boolean;
  currentCustomState: string | null;
  client: {
    id: number;
    lastName: string;
    firstName: string;
    dni: string;
  };
  responsibleLawyer: {
    id: number;
    fullName: string;
    registrationNumber: string;
  };
  currentState: { stateId: number; name: string } | null;
  currentProceduralAct: {
    deadlineComputedDueDate: Date | null;
    deadlineManualDueDate: Date | null;
  } | null;
};

/**
 * Read-side adapter of `cases`. Projects straight to
 * {@link CaseListItem} without rebuilding the aggregate — see that
 * type for why.
 */
@Injectable()
export class PrismaCaseQueryAdapter implements CaseQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async search(criteria: CaseSearchCriteria): Promise<CasePage> {
    const where = {
      active: true,
      ...(criteria.clientId !== undefined
        ? { clientId: criteria.clientId }
        : {}),
    };

    const include = {
      client: {
        select: { id: true, lastName: true, firstName: true, dni: true },
      },
      responsibleLawyer: {
        select: { id: true, fullName: true, registrationNumber: true },
      },
      currentState: { select: { stateId: true, name: true } },
      currentProceduralAct: {
        select: {
          deadlineComputedDueDate: true,
          deadlineManualDueDate: true,
        },
      },
    } as const;

    // Página y conteo en una sola transacción, para que el total no
    // contradiga a la página si alguien inserta en el medio.
    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.db.case.findMany({
        where,
        include,
        // Orden estable y simple. El contrato ordena por urgencia
        // (`currentState.dueDate`), pero esa fecha vive en el acto
        // procesal y no en la causa, así que ordenarla en SQL exige un
        // join con `COALESCE` que es trabajo de HU-20.
        orderBy: { id: "desc" },
        skip: (criteria.page - 1) * criteria.limit,
        take: criteria.limit,
      }),
      this.prisma.db.case.count({ where }),
    ]);

    return { items: rows.map(toListItem), totalItems };
  }

  /**
   * One `GROUP BY current_state_id` for every id at once, so the
   * procedural-states listing (up to 100 states) costs a single query
   * instead of one per state.
   */
  async countActiveByProceduralStates(
    stateIds: readonly number[],
  ): Promise<ReadonlyMap<number, number>> {
    if (stateIds.length === 0) {
      return new Map();
    }

    const groups = await this.prisma.db.case.groupBy({
      by: ["currentStateId"],
      where: {
        active: true,
        currentStateId: { in: [...stateIds] },
        // A case in a terminal state is not active (contract §4).
        currentState: { terminal: false },
      },
      _count: { _all: true },
    });

    const counts = new Map<number, number>();
    for (const group of groups) {
      // Never null here: the `in` filter above excludes cases on a
      // hand-written state, whose `currentStateId` is null.
      if (group.currentStateId !== null) {
        counts.set(group.currentStateId, group._count._all);
      }
    }
    return counts;
  }
}

function toListItem(row: CaseRow): CaseListItem {
  return {
    id: row.id,
    sacNumber: row.sacNumber,
    caption: row.caption,
    court: row.court,
    startDate: row.startDate,
    active: row.active,
    client: row.client,
    responsibleLawyer: row.responsibleLawyer,
    currentState: toCurrentState(row),
  };
}

/**
 * The schema guarantees exactly one of `currentStateId` /
 * `currentCustomState` is set (`num_nonnulls(...) = 1`), so the two
 * branches below are exhaustive for a well-formed row.
 *
 * The due date is `COALESCE(manual, computed)`: the lawyer's manual
 * adjustment wins when there is one, which the schema spells out as
 * *"Vencimiento vigente = COALESCE(manual, computed), calculado al
 * leer"*. Null while the case sits in its initial state, which has no
 * procedural act yet.
 */
function toCurrentState(row: CaseRow): CurrentStateView | null {
  const dueDate =
    row.currentProceduralAct?.deadlineManualDueDate ??
    row.currentProceduralAct?.deadlineComputedDueDate ??
    null;

  if (row.currentCustomState !== null) {
    return {
      proceduralStateId: null,
      name: row.currentCustomState,
      custom: true,
      dueDate,
    };
  }

  if (row.currentState !== null) {
    return {
      proceduralStateId: row.currentState.stateId,
      name: row.currentState.name,
      custom: false,
      dueDate,
    };
  }

  return null;
}
