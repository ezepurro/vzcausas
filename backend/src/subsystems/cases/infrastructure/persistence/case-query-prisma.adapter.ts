import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Prisma } from '../../../../generated/prisma/client';
import {
  CaseListItem,
  CasePage,
  CaseQueryPort,
  CaseSearchCriteria,
} from '../../core/domain/ports/case-query.port';
import { addPrescriptionMonths, prescriptionStartsOn } from '../../core/domain/prescription';
import { DayType } from '../../core/domain/value-objects/day-type';
import { JurisdictionCode } from '../../core/domain/value-objects/jurisdiction-code';
import { ProceduralRole } from '../../core/domain/value-objects/procedural-role';
import { CASE_FOLDER_INCLUDE, toCaseFolderView } from './case-folder-prisma.mapper';
import { PRESCRIPTION_DECLARATION_SELECT, toPrescriptionDeclarationView } from './prescription-declaration-prisma.mapper';

/** What `findMany` has to bring for a row to be projected into a {@link CaseListItem}. */
const CASE_INCLUDE = {
  jurisdiction: true,
  client: true,
  responsibleLawyer: true,
  currentState: true,
  currentProceduralAct: true,
  offenses: { include: { legalQualification: true } },
  // HU39: the folder it points to and its ancestors, to show its link and path.
  cloudFolder: CASE_FOLDER_INCLUDE,
  // HU31: only the act that governs the prescription, the most recent by its
  // date — not by when it was registered (CA-31.4). Same order as the index.
  interruptiveActs: {
    select: { actDate: true },
    orderBy: [{ actDate: 'desc' }, { id: 'desc' }],
    take: 1,
  },
  // HU33: who marked the case as prescribed. The other declaration columns are
  // scalars of `cases`, which an `include` already brings.
  prescriptionRegisteredBy: PRESCRIPTION_DECLARATION_SELECT.prescriptionRegisteredBy,
} as const satisfies Prisma.CaseInclude;

/**
 * The row with exactly the relations {@link CASE_INCLUDE} asks for. Derived
 * from the include rather than written by hand: adding a relation there
 * widens this type, and forgetting to read it is a compile error instead of
 * an `undefined` at runtime.
 */
type CaseRow = Prisma.CaseGetPayload<{ include: typeof CASE_INCLUDE }>;

/**
 * Read adapter for {@link CaseQueryPort}, separate from `CasePrismaRepository`:
 * that one rebuilds the `Case` aggregate to write it, this one projects
 * straight to {@link CaseListItem} to show it.
 *
 * **Why `search` costs two queries.** The order of CA-20.1 is by the case's
 * live due date, which is `COALESCE(deadline_manual_due_date,
 * deadline_computed_due_date)` on the act that set the current state. Prisma's
 * `orderBy` can sort by a related column, but it cannot express a `COALESCE`
 * of two of them — and ordering by one column and then the other is not an
 * approximation, it is wrong: a case whose manual date is null never gets its
 * computed date compared against another case's manual date.
 *
 * So the ordering goes to SQL and nothing else does. The first query returns
 * **only ids**, ordered and paged; the second is ordinary Prisma with the
 * relations. Keeping the hand-written SQL down to one column is what keeps a
 * mistyped column name obvious, and it leaves the joins and the typing to
 * Prisma. The alternative that needs no SQL at all is denormalising the due
 * date onto `cases`, which costs a migration and a column that only the act
 * registration (HU26) can maintain.
 */
@Injectable()
export class CaseQueryPrismaAdapter implements CaseQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async search(criteria: CaseSearchCriteria): Promise<CasePage> {
    const { page, limit } = criteria;
    const offset = (page - 1) * limit;

    const state = criteria.state;
    const proceduralStateId = state?.kind === 'proceduralState' ? state.proceduralStateId : null;
    const customState = state?.kind === 'custom' ? state.customState : null;
    const withoutProceduralActs = state?.kind === 'withoutProceduralActs' ? true : null;
    const search = criteria.search?.trim() || null;

    // Every filter is a parameter that disables its own clause when null, so
    // the statement is a single fixed string: nothing is concatenated, so
    // there is nothing to inject. `COUNT(*) OVER ()` is evaluated before
    // `LIMIT`, so it yields the total of the filtered set, not of the page —
    // which is why this does not need a third query.
    const rows = await this.prisma.db.$queryRaw<{ id: number; total: bigint }[]>`
      SELECT c.id, COUNT(*) OVER () AS total
      FROM cases c
      LEFT JOIN procedural_acts   a  ON a.id             = c.current_procedural_act_id
      LEFT JOIN procedural_states s  ON s.state_id       = c.current_state_id
      LEFT JOIN jurisdictions     j  ON j.jurisdiction_id = c.jurisdiction_id
      LEFT JOIN clients           cl ON cl.id            = c.client_id
      WHERE c.active = true
        AND (${search}::text IS NULL
             OR c.sac_number ILIKE '%' || ${search} || '%'
             OR c.caption    ILIKE '%' || ${search} || '%'
             OR cl.last_name ILIKE '%' || ${search} || '%'
             OR cl.first_name ILIKE '%' || ${search} || '%')
        AND (${criteria.jurisdiction ?? null}::text IS NULL OR j.name = ${criteria.jurisdiction ?? null})
        AND (${criteria.responsibleLawyerId ?? null}::int IS NULL
             OR c.responsible_lawyer_id = ${criteria.responsibleLawyerId ?? null})
        AND (${criteria.clientId ?? null}::int IS NULL OR c.client_id = ${criteria.clientId ?? null})
        AND (${criteria.openDeadline ?? null}::boolean IS NOT TRUE
             OR COALESCE(a.deadline_manual_due_date, a.deadline_computed_due_date) IS NOT NULL)
        AND (${proceduralStateId}::int IS NULL OR c.current_state_id = ${proceduralStateId})
        AND (${customState}::text IS NULL OR lower(c.current_custom_state) = lower(${customState}))
        AND (${withoutProceduralActs}::boolean IS NOT TRUE OR s.is_initial = true)
      ORDER BY COALESCE(a.deadline_manual_due_date, a.deadline_computed_due_date) ASC NULLS LAST,
               c.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    if (rows.length === 0) {
      return { items: [], totalItems: 0 };
    }

    const ids = rows.map((row) => row.id);
    const found = await this.prisma.db.case.findMany({
      where: { id: { in: ids } },
      include: CASE_INCLUDE,
    });

    // `WHERE id IN (...)` does not preserve the order of the list, so the
    // order the database already decided is restored here. This is not a sort:
    // it is a lookup by the position the first query assigned.
    const byId = new Map(found.map((row) => [row.id, row]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => row !== undefined)
      .map((row) => toListItem(row));

    return { items, totalItems: Number(rows[0].total) };
  }

  async findById(id: number): Promise<CaseListItem | null> {
    // `active: true` applies to the case itself: one given de baja answers 404.
    // The relations are **not** filtered by `active`: a case keeps showing a
    // deactivated procedural state or legal qualification, because they are
    // part of its history (§4, Bajas).
    const row = await this.prisma.db.case.findFirst({
      where: { id, active: true },
      include: CASE_INCLUDE,
    });

    return row ? toListItem(row) : null;
  }

  async listCustomStates(jurisdiction?: JurisdictionCode): Promise<string[]> {
    // `distinct` + `orderBy` en vez de agrupar: la lista es corta por
    // naturaleza —son los textos que los abogados escribieron a mano— y así
    // el orden alfabético lo hace la base, con su collation.
    const rows = await this.prisma.db.case.findMany({
      where: {
        active: true,
        currentCustomState: { not: null },
        ...(jurisdiction ? { jurisdiction: { name: jurisdiction } } : {}),
      },
      select: { currentCustomState: true },
      distinct: ['currentCustomState'],
      orderBy: { currentCustomState: 'asc' },
    });

    return rows
      .map((row) => row.currentCustomState)
      .filter((state): state is string => state !== null);
  }

  async countActiveByProceduralState(stateIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    if (stateIds.length === 0) {
      return new Map();
    }

    // Deliberately **not** {@link ACTIVE_CASE}: this is the one count that also
    // excludes the initial state. And `currentStateId: { in }` already
    // guarantees the relation exists, so that constant's `OR` — which is there
    // to keep hand-written states alive — would be dead weight here. A case in
    // a hand-written state belongs to no row of `procedural_states`, so it is
    // left out by the `in` itself, with no clause of its own.
    const rows = await this.prisma.db.case.groupBy({
      by: ['currentStateId'],
      where: {
        active: true,
        currentStateId: { in: [...stateIds] },
        currentState: { terminal: false, isInitial: false },
      },
      _count: { _all: true },
    });

    return fill(
      stateIds,
      rows.map((row): [number | null, number] => [row.currentStateId, row._count._all]),
    );
  }

  async countActiveByLegalQualification(qualificationIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    if (qualificationIds.length === 0) {
      return new Map();
    }

    // Groups `offenses`, not `cases`: a case counts for **each** of its
    // qualifications, so grouping the cases would lose all but one. The
    // composite primary key `(case_id, legal_qualification_id)`
    // (`schema.prisma:362`) means one row per pair, so counting rows is
    // counting cases and nothing double-counts.
    //
    // Nothing filters the qualification's own `active`: one given de baja keeps
    // counting the cases that hold it, because the case keeps showing it as
    // part of its history (RN12). What `active` forbids is picking it for a new
    // case, which is a concern of the write path.
    const rows = await this.prisma.db.offense.groupBy({
      by: ['legalQualificationId'],
      where: {
        legalQualificationId: { in: [...qualificationIds] },
        case: ACTIVE_CASE,
      },
      _count: { _all: true },
    });

    return fill(
      qualificationIds,
      rows.map((row): [number, number] => [row.legalQualificationId, row._count._all]),
    );
  }

  async countActiveByResponsibleLawyer(lawyerIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    if (lawyerIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.db.case.groupBy({
      by: ['responsibleLawyerId'],
      where: { ...ACTIVE_CASE, responsibleLawyerId: { in: [...lawyerIds] } },
      _count: { _all: true },
    });

    return fill(
      lawyerIds,
      rows.map((row): [number, number] => [row.responsibleLawyerId, row._count._all]),
    );
  }

  async countActiveByClient(clientIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    if (clientIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.db.case.groupBy({
      by: ['clientId'],
      where: { ...ACTIVE_CASE, clientId: { in: [...clientIds] } },
      _count: { _all: true },
    });

    return fill(
      clientIds,
      rows.map((row): [number, number] => [row.clientId, row._count._all]),
    );
  }
}

/**
 * "Active case" as §4 defines it, for the three counts that do not care which
 * procedural state the case is in: not given de baja, and its current state is
 * not terminal.
 *
 * **The `OR` is the part that is easy to get wrong.** A case in a hand-written
 * state holds `current_custom_state` and **no** `current_state_id`, so
 * `currentState: { terminal: false }` on its own does not match it: a relation
 * filter on an absent to-one relation fails, and the case drops out of every
 * count without a trace. It is active — the contract settles that a
 * hand-written state is not terminal — so it has to count for its lawyer, its
 * client and its qualifications.
 *
 * The initial state is **not** excluded here, on purpose: a freshly registered
 * case counts for those three. Only `countActiveByProceduralState` excludes it,
 * and it writes its own `where` for that reason.
 *
 * **Exported for `reporting`** (HU41, ADR-002): the dashboards read the
 * database directly, but the definition of an active case is this subsystem's
 * rule, so they reuse it instead of writing their own copy that could drift.
 */
export const ACTIVE_CASE = {
  active: true,
  OR: [{ currentStateId: null }, { currentState: { terminal: false } }],
} as const satisfies Prisma.CaseWhereInput;

/**
 * Turns the rows of a `GROUP BY` into the map the four counts promise: **every
 * requested id present**, with `0` when the database returned no row for it.
 *
 * The promise is what frees all four callers from remembering the default, and
 * a `GROUP BY` cannot keep it on its own: it only yields the ids that have at
 * least one row.
 */
function fill(
  ids: readonly number[],
  counted: readonly [number | null, number][],
): ReadonlyMap<number, number> {
  const byId = new Map(counted.filter((pair): pair is [number, number] => pair[0] !== null));
  return new Map(ids.map((id) => [id, byId.get(id) ?? 0]));
}

/**
 * Projects a row into the read model.
 *
 * `businessDaysRemaining` stays `null` here on purpose: it is computed per
 * response against today's date in Córdoba, and persistence has no business
 * reading a clock. The use case fills it from `dueDate` and `ClockPort.today()`.
 *
 * `harmfulActDeadline` (contrato V4 §3.7, D-78) y `prescription` tampoco se
 * arman acá: como `businessDaysRemaining`, dependen de la fecha de hoy y los
 * completa el caso de uso (`withDeadlines`, `list-cases.use-case.ts`).
 *
 * PENDIENTE (delegado desde HU-41, CA-41.6 · 18/10/2026): el detalle y el
 * listado ya lo devuelven, pero **no** ordenan ni filtran por
 * `harmfulActDeadline.dueDate` (D-82, `openDeadline`) y los tableros del abogado
 * y del administrador (`reporting`, `GET /dashboards/*`) no lo cuentan: cada
 * vencimiento del acto lesivo es un elemento de `deadlines` con
 * `kind: HARMFUL_ACT` y cuenta en `summary`. Hoy listan solo `PROCEDURAL_ACT`.
 */
function toListItem(row: CaseRow): CaseListItem {
  const act = row.currentProceduralAct;
  const state = row.currentState;
  const custom = row.currentCustomState !== null;
  const initial = state?.isInitial === true;
  const dueDate = act ? (act.deadlineManualDueDate ?? act.deadlineComputedDueDate) : null;
  const lastInterruptiveActDate = row.interruptiveActs[0]?.actDate ?? null;
  const jurisdiction = row.jurisdiction.name as JurisdictionCode;

  return {
    id: row.id,
    sacNumber: row.sacNumber,
    caption: row.caption,
    court: row.court,
    jurisdiction,
    proceduralRole: row.proceduralRole as ProceduralRole,
    instructorName: row.instructorName,
    // The column is `instructor_phone`; the contract calls the field `tribunalPhone`.
    tribunalPhone: row.instructorPhone,
    instructorExtension: row.instructorExtension,
    counterparty: row.counterparty,
    subjectMatter: row.subjectMatter,
    // A case that predates D-67 has `NULL` in the data of its own jurisdiction: it reads as `false`.
    clientDetained: jurisdiction === JurisdictionCode.CRIMINAL ? (row.clientDetained ?? false) : null,
    injunctionGranted: jurisdiction === JurisdictionCode.AMPARO ? (row.injunctionGranted ?? false) : null,
    harmfulActDate: row.harmfulActDate,
    harmfulActRenews: jurisdiction === JurisdictionCode.AMPARO ? (row.harmfulActRenews ?? false) : null,
    harmfulActRenewalDays: row.harmfulActRenewalDays,
    harmfulActTermDays: row.harmfulActTermDays,
    harmfulActTermDayType: row.harmfulActTermDayType as DayType | null,
    // Depends on today's date: the use case fills it (`withDeadlines`).
    harmfulActDeadline: null,
    administrativeRemedyExhaustedOn: row.administrativeRemedyExhaustedOn,
    courtFeePaid: row.courtFeePaid,
    client: {
      id: row.client.id,
      lastName: row.client.lastName,
      firstName: row.client.firstName,
      dni: row.client.dni,
      phone: row.client.phone,
      email: row.client.email,
      clientSince: row.client.clientSince,
    },
    responsibleLawyer: {
      id: row.responsibleLawyer.id,
      lastName: row.responsibleLawyer.lastName,
      firstName: row.responsibleLawyer.firstName,
      registrationNumber: row.responsibleLawyer.registrationNumber,
    },
    // HU31: both dates are computed on every read (V4, D-08), from the most
    // recent interruptive act of the case. The `prescription_date` stored at
    // registration is not read: it cannot know about acts registered later.
    // Without interruptive acts the result is the same date it holds.
    legalQualifications: row.offenses.map((offense) => {
      const startsOn = prescriptionStartsOn(offense.offenseDate, lastInterruptiveActDate);
      return {
        id: offense.legalQualification.id,
        name: offense.legalQualification.name,
        prescriptionMonths: offense.legalQualification.prescriptionMonths,
        offenseDate: offense.offenseDate,
        prescriptionStartsOn: startsOn,
        prescriptionExpiresOn: addPrescriptionMonths(startsOn, offense.legalQualification.prescriptionMonths),
      };
    }),
    lastInterruptiveActDate,
    // Depends on today's date: the use case fills it (`withDeadlines`).
    prescription: null,
    prescriptionDeclaration: toPrescriptionDeclarationView(row.id, row),
    startDate: row.startDate,
    // `proceduralStateId` is null for the initial state and for a hand-written
    // one, even though `cases.current_state_id` holds the real "Iniciada" row:
    // sending that id would make the frontend look for a state that
    // `/procedural-states` does not list.
    currentState: {
      proceduralStateId: initial || custom ? null : row.currentStateId,
      name: custom ? (row.currentCustomState as string) : (state?.name ?? ''),
      custom,
      initial,
      proceduralActId: row.currentProceduralActId,
      dueDate,
      businessDaysRemaining: null,
      manuallyAdjusted: act?.deadlineManualDueDate !== null && act?.deadlineManualDueDate !== undefined,
    },
    folder: toCaseFolderView(row),
    active: row.active,
  };
}
