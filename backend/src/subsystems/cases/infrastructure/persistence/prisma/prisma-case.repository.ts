import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Prisma } from '../../../../../generated/prisma/client';
import { DayType as PrismaDayType, ProceduralRole as PrismaProceduralRole } from '../../../../../generated/prisma/enums';
import { Case } from '../../../core/domain/entities/case/case.entity';
import { CaseSacAlreadyExistsError } from '../../../core/domain/errors/case.errors';
import {
  CaseDueDateKey,
  CaseListItem,
  CaseRepository,
  CaseSearchFilters,
} from '../../../core/domain/ports/case/case.repository';
import { ProceduralStateRef } from '../../../core/domain/ports/case/legal-parameters-lookup.port';
import { addPrescriptionMonths, prescriptionStartsOn } from '../../../core/domain/prescription';
import { DayType } from '../../../core/domain/value-objects/deadline/day-type';
import { JurisdictionCode } from '../../../core/domain/value-objects/case/jurisdiction-code';
import { ProceduralRole } from '../../../core/domain/value-objects/case/procedural-role';
import { CASE_FOLDER_INCLUDE, TEMPLATE_COPIES_SELECT, toCaseFolderView } from '../mappers/case-folder-prisma.mapper';
import { CasePrismaMapper } from '../mappers/case-prisma.mapper';
import { PRESCRIPTION_DECLARATION_SELECT, toPrescriptionDeclarationView } from '../mappers/prescription-declaration-prisma.mapper';

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
  // HU40: how many templates were copied into it and how many are pending.
  templateCopies: TEMPLATE_COPIES_SELECT,
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
 * Prisma adapter for {@link CaseRepository}. Writing rebuilds the `Case`
 * aggregate through {@link CasePrismaMapper}; reading projects straight to
 * {@link CaseListItem} to show it.
 *
 * **Why the listing is two reads and orders nothing.** The order of CA-20.1 is
 * by the case's live due date, `COALESCE(deadline_manual_due_date,
 * deadline_computed_due_date)` on the act that set the current state. Prisma's
 * `orderBy` cannot express a `COALESCE` of two columns, and ordering by one
 * and then the other is not an approximation, it is wrong. So the order is not
 * the query's: {@link findDueDateKeys} returns the id and due date of every
 * matching case, `ListCases` orders and pages them, and
 * {@link findListItemsByIds} reads the resource for that page only.
 */
@Injectable()
export class PrismaCaseRepository implements CaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async nextId(): Promise<number> {
    const [{ nextval }] = await this.prisma.db.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval(pg_get_serial_sequence('cases', 'id'))
    `;
    return Number(nextval);
  }

  async existsBySacNumber(sacNumber: string, exceptCaseId?: number): Promise<boolean> {
    // Only active cases count: a deactivated case frees its SAC (D-97). The
    // partial unique index `cases_sac_number_active_key` enforces the same
    // rule in the database.
    const row = await this.prisma.db.case.findFirst({
      where: { sacNumber, active: true, ...(exceptCaseId !== undefined && { id: { not: exceptCaseId } }) },
      select: { id: true },
    });
    return row !== null;
  }

  async saveModification(modifiedCase: Case): Promise<void> {
    const data = modifiedCase.toSnapshot();
    try {
      await this.prisma.db.case.update({
        where: { id: data.id },
        data: {
          sacNumber: data.sacNumber,
          caption: data.caption,
          court: data.court,
          proceduralRole: data.proceduralRole as PrismaProceduralRole,
          instructorName: data.instructor.name,
          instructorPhone: data.instructor.phone,
          instructorExtension: data.instructor.extension,
          counterparty: data.counterparty,
          subjectMatter: data.subjectMatter,
          clientId: data.clientId,
          responsibleLawyerId: data.responsibleLawyerId,
          startDate: data.startDate,
          courtFeePaid: data.courtFeePaid,
          clientDetained: data.clientDetained,
          injunctionGranted: data.injunctionGranted,
          harmfulActDate: data.harmfulActDate,
          harmfulActRenews: data.harmfulActRenews,
          harmfulActRenewalDays: data.harmfulActRenewalDays,
          harmfulActTermDays: data.harmfulActTermDays,
          harmfulActTermDayType: data.harmfulActTermDayType as PrismaDayType | null,
          administrativeRemedyExhaustedOn: data.administrativeRemedyExhaustedOn,
          updatedAt: data.updatedAt,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new CaseSacAlreadyExistsError();
      }
      throw error;
    }

    // Only a criminal case has offenses. The list is replaced whole (CA-19.11):
    // rewriting it is simpler and as cheap as diffing a handful of rows.
    if (modifiedCase.jurisdictionCode === JurisdictionCode.CRIMINAL) {
      await this.prisma.db.offense.deleteMany({ where: { caseId: data.id } });
      if (data.offenses.length > 0) {
        await this.prisma.db.offense.createMany({
          data: data.offenses.map((offense) => ({
            caseId: data.id,
            legalQualificationId: offense.legalQualificationId,
            offenseDate: offense.offenseDate,
            prescriptionDate: offense.prescriptionExpiresOn,
          })),
        });
      }
    }
  }

  async save(newCase: Case): Promise<void> {
    // The data of each jurisdiction (D-67) is already `null` outside its own in the snapshot;
    // the `ck_cases_harmful_act_*` constraints agree with how the factory builds them.
    const data = newCase.toSnapshot();

    // One nested create: the case and its offenses are saved together or not at all.
    // Every offense already carries its prescription date (`CriminalCase` calculates
    // it, and `Offense.toSnapshot` refuses one without it).

    await this.prisma.db.case.create({
      data: {
        id: data.id,
        sacNumber: data.sacNumber,
        caption: data.caption,
        court: data.court,
        jurisdictionId: data.jurisdictionId,
        proceduralRole: data.proceduralRole as PrismaProceduralRole,
        instructorName: data.instructor.name,
        instructorPhone: data.instructor.phone,
        instructorExtension: data.instructor.extension,
        counterparty: data.counterparty,
        subjectMatter: data.subjectMatter,
        clientId: data.clientId,
        responsibleLawyerId: data.responsibleLawyerId,
        startDate: data.startDate,
        courtFeePaid: data.courtFeePaid,
        clientDetained: data.clientDetained,
        injunctionGranted: data.injunctionGranted,
        harmfulActDate: data.harmfulActDate,
        harmfulActRenews: data.harmfulActRenews,
        harmfulActRenewalDays: data.harmfulActRenewalDays,
        harmfulActTermDays: data.harmfulActTermDays,
        harmfulActTermDayType: data.harmfulActTermDayType as PrismaDayType | null,
        administrativeRemedyExhaustedOn: data.administrativeRemedyExhaustedOn,
        currentStateId: data.currentStateId,
        currentCustomState: data.currentCustomState,
        currentProceduralActId: data.currentProceduralActId,
        active: data.active,
        // The folder is asked for after the case is saved (`RequestCaseFolder`),
        // which is what moves it to `CREATING`.
        folderStatus: 'PENDING',
        createdByUserId: data.createdByUserId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        offenses: {
          create: data.offenses.map((offense) => ({
            legalQualificationId: offense.legalQualificationId,
            offenseDate: offense.offenseDate,
            prescriptionDate: offense.prescriptionExpiresOn,
          })),
        },
      },
    });
  }

  async findById(id: number): Promise<Case | null> {
    const row = await this.prisma.db.case.findUnique({
      where: { id },
      include: {
        jurisdiction: true,
        offenses: { include: { legalQualification: true } },
        currentState: true,
        currentProceduralAct: true,
      },
    });
    return row ? CasePrismaMapper.toDomain(row) : null;
  }

  async findCurrentState(caseId: number): Promise<ProceduralStateRef> {
    const row = await this.prisma.db.case.findUniqueOrThrow({
      where: { id: caseId },
      select: {
        currentState: {
          select: {
            stateId: true,
            name: true,
            isInitial: true,
            jurisdictionId: true,
            terminal: true,
            isPrescribed: true,
            isActive: true,
            timeLimitDays: true,
            dayType: true,
          },
        },
      },
    });
    const state = row.currentState;
    if (!state) {
      throw new Error(`The case ${caseId} has no procedural state.`);
    }
    return {
      id: state.stateId,
      name: state.name,
      isInitial: state.isInitial,
      jurisdictionId: state.jurisdictionId,
      terminal: state.terminal,
      isPrescribed: state.isPrescribed,
      isActive: state.isActive,
      timeLimitDays: state.timeLimitDays,
      dayType: state.dayType as DayType,
    };
  }

  async saveCurrentAct(updatedCase: Case): Promise<void> {
    // One UPDATE, so the state and the custom state change together and keep the CHECK that exactly one is set.
    await this.prisma.db.case.update({
      where: { id: updatedCase.id },
      data: {
        currentStateId: updatedCase.currentStateId,
        currentCustomState: updatedCase.currentCustomState,
        currentProceduralActId: updatedCase.currentProceduralActId,
        updatedAt: updatedCase.updatedAt,
      },
    });
  }

  /**
   * HU33. One conditional `UPDATE`: the state, the empty current act and the
   * five declaration columns change together, which keeps the
   * `ck_cases_prescription_declaration_complete` CHECK and the exclusive
   * state/custom-state CHECK. `prescriptionDate: null` in the `WHERE` makes
   * the check and the write one step in the database, so of two simultaneous
   * markings only one writes (D-54: the declaration is recorded once).
   */
  async saveDeclaredPrescription(prescribedCase: Case): Promise<boolean> {
    const declaration = prescribedCase.prescriptionDeclaration;
    if (declaration === null) {
      throw new Error(`The case ${prescribedCase.id} has no prescription declaration to save.`);
    }

    const { count } = await this.prisma.db.case.updateMany({
      where: { id: prescribedCase.id, prescriptionDate: null },
      data: {
        currentStateId: prescribedCase.currentStateId,
        currentCustomState: prescribedCase.currentCustomState,
        currentProceduralActId: prescribedCase.currentProceduralActId,
        prescriptionDate: declaration.prescriptionDate,
        prescriptionResolution: declaration.resolution,
        prescriptionGrounds: declaration.grounds,
        prescriptionRegisteredByUserId: declaration.registeredByUserId,
        prescriptionRegisteredAt: declaration.registeredAt,
        updatedAt: prescribedCase.updatedAt,
      },
    });
    return count === 1;
  }

  async findDueDateKeys(filters: CaseSearchFilters): Promise<CaseDueDateKey[]> {
    const rows = await this.prisma.db.case.findMany({
      where: PrismaCaseRepository.searchWhere(filters),
      select: {
        id: true,
        currentProceduralAct: { select: { deadlineManualDueDate: true, deadlineComputedDueDate: true } },
      },
    });

    return rows.map((row) => {
      const act = row.currentProceduralAct;
      return { id: row.id, dueDate: act ? (act.deadlineManualDueDate ?? act.deadlineComputedDueDate) : null };
    });
  }

  async findListItemsByIds(ids: readonly number[]): Promise<CaseListItem[]> {
    if (ids.length === 0) {
      return [];
    }
    // As in `findListItemById`: the case itself must be active, its relations
    // are not filtered (§4, Bajas).
    const rows = await this.prisma.db.case.findMany({
      where: { id: { in: [...ids] }, active: true },
      include: CASE_INCLUDE,
    });
    return rows.map((row) => toListItem(row));
  }

  /**
   * The `WHERE` of `GET /cases` (§3.7). A filter that was not sent adds no
   * condition. `mode: 'insensitive'` is PostgreSQL's `ILIKE`: case does not
   * matter, accents do (decided with mmachuca on 07/10/2026; ignoring them
   * needs the `unaccent` extension).
   *
   * Every relation filter also drops the cases without that relation, the way
   * the old SQL's `LEFT JOIN` + `WHERE` did: `openDeadline` drops a case with no
   * current act, `withoutProceduralActs` one with no table state.
   */
  private static searchWhere(filters: CaseSearchFilters): Prisma.CaseWhereInput {
    const { state } = filters;
    const search = filters.search?.trim();
    const matches = { contains: search, mode: 'insensitive' } as const;

    return {
      active: true,
      ...(search
        ? {
            OR: [
              { sacNumber: matches },
              { caption: matches },
              { client: { lastName: matches } },
              { client: { firstName: matches } },
            ],
          }
        : {}),
      ...(filters.jurisdiction !== undefined ? { jurisdiction: { name: filters.jurisdiction } } : {}),
      ...(filters.responsibleLawyerId !== undefined ? { responsibleLawyerId: filters.responsibleLawyerId } : {}),
      ...(filters.clientId !== undefined ? { clientId: filters.clientId } : {}),
      // Overdue ones included: any due date, past or not.
      ...(filters.openDeadline === true
        ? {
            currentProceduralAct: {
              OR: [{ deadlineManualDueDate: { not: null } }, { deadlineComputedDueDate: { not: null } }],
            },
          }
        : {}),
      ...(state?.kind === 'proceduralState' ? { currentStateId: state.proceduralStateId } : {}),
      // Exact match, ignoring case (CA-20.4).
      ...(state?.kind === 'custom' ? { currentCustomState: { equals: state.customState, mode: 'insensitive' } } : {}),
      ...(state?.kind === 'withoutProceduralActs' ? { currentState: { isInitial: true } } : {}),
    };
  }

  async findListItemById(id: number): Promise<CaseListItem | null> {
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
 * PENDIENTE (delegado desde HU-41, CA-41.6 · 18/10/2026; ratificado con mmachuca
 * el 21/10/2026 en `fix/cases-contract-v4`, sin implementar y sin test): el
 * detalle y el listado ya lo devuelven, pero **no** ordenan ni filtran por
 * `harmfulActDeadline.dueDate` (D-82, `API_CONTRACT_V4.md:3719-3725` y `:7402`;
 * `openDeadline`). El orden lo resuelve `ListCases` (`byUrgency`), y ese vencimiento
 * depende de hoy (renovaciones, días hábiles): resolverlo es decidir dónde vive
 * esa regla, no solo una consulta. Los tableros del abogado
 * y del administrador (`reporting`, `GET /dashboards/*`) no lo cuentan: cada
 * vencimiento del acto lesivo es un elemento de `deadlines` con
 * `kind: HARMFUL_ACT` y cuenta en `summary`. Hoy listan solo `PROCEDURAL_ACT`.
 *
 * Nota del 20/10/2026, desde HU-51 (no es de HU-51; es D-82 de `GET /cases` y
 * CA-41.6 de los tableros): la verificación diaria ya avisa por correo el
 * vencimiento del acto lesivo, así que mientras esto siga pendiente el correo
 * avisa un amparo que el orden por urgencia y `openDeadline` no consideran
 * (CA-51.9). El vencimiento no está guardado —depende de hoy y de las
 * renovaciones—, así que no se puede leer de una columna. Desde que el orden
 * se hace en memoria (`ListCases.byUrgency`), sumarlo no exige reescribir la
 * regla en SQL: alcanza con `harmfulActOf` + `HarmfulAct.deadline` en el caso
 * de uso. El filtro `openDeadline` sí sigue en la consulta. Ver
 * `IMPLEMENTACION_DETECCION.md`, B4.
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
