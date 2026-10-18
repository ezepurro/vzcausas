import { ClientRef, LawyerRef } from './people-lookup.port';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { ProceduralRole } from '../value-objects/procedural-role';

/** DI token for {@link CaseQueryPort}. */
export const CASE_QUERY = Symbol('CASE_QUERY');

/**
 * The current state of a case as a reader needs it (contract §3.7).
 *
 * Not `ProceduralStateRef`: that type serves the write path — "what `cases`
 * needs to know about a procedural state to put a case in it" — and carries
 * only `id`, `name`, `isInitial` and `jurisdictionId`. A reader needs four
 * more things it cannot supply: whether the state is hand-written, the act
 * that set it, that act's due date, and whether the date was adjusted by hand.
 *
 * `proceduralStateId` is `null` both for the initial state and for a
 * hand-written one, which is why it cannot be read off `cases.current_state_id`
 * directly: at registration that column points at the real "Iniciada" row, and
 * the contract requires `null`. Mapping it straight through is a silent bug.
 */
export type CaseCurrentStateView = {
  proceduralStateId: number | null;
  name: string;
  custom: boolean;
  initial: boolean;
  proceduralActId: number | null;
  dueDate: Date | null;
  /** Computed per response against today in Córdoba. `null` when there is no due date. */
  businessDaysRemaining: number | null;
  manuallyAdjusted: boolean;
};

/** A legal qualification of a case, with its own offense and prescription dates. */
export type CaseQualificationView = {
  id: number;
  name: string;
  prescriptionMonths: number;
  offenseDate: Date;
  prescriptionStartsOn: Date;
  prescriptionExpiresOn: Date | null;
};

/**
 * A case as every reader of it needs it: the listing (HU20), the detail
 * (HU22) and the response to a registration (HU18).
 *
 * **It is not the `Case` aggregate, on purpose.** The aggregate exists to
 * enforce the rules of writing a case, and it holds only the *identifiers*
 * of its client, its responsible lawyer and its qualifications. Rendering
 * one needs their names, which live in other subsystems, plus the due date
 * of the act that set the current state. Rebuilding the aggregate and then
 * resolving each reference one by one is the N+1: a page of 20 cases costs
 * about a hundred queries. A flat shape can be filled by one query that
 * joins, so the number of queries depends on how many *relations* are asked
 * for, not on how many *rows* come back.
 *
 * It is also what keeps the three endpoints honest. The contract requires
 * the listing and the detail to return the same resource as the
 * registration (§3.7), and `CaseHttpMapper.toResponse` is the single
 * function over this single type. If each endpoint built its own response,
 * they would drift and every one of them would still look right alone.
 */
export type CaseListItem = {
  id: number;
  sacNumber: string | null;
  caption: string;
  court: string | null;
  jurisdiction: JurisdictionCode;
  proceduralRole: ProceduralRole;
  instructorName: string | null;
  tribunalPhone: string | null;
  instructorExtension: string | null;
  /** Only `ADMINISTRATIVE` and `AMPARO`; `null` in `CRIMINAL`. */
  counterparty: string | null;
  subjectMatter: string | null;
  client: ClientRef;
  responsibleLawyer: LawyerRef;
  /** Empty unless the case is criminal. A deactivated qualification still shows (RN12). */
  legalQualifications: CaseQualificationView[];
  /**
   * `null` mientras la causa no tiene SAC (D-38): la fecha de inicio es la de
   * la causa en sede judicial y sin SAC no existe. Hasta el 10/10/2026 la
   * columna era `NOT NULL` y se guardaba la fecha del día, un dato inventado
   * que el detalle mostraba como real.
   */
  startDate: Date | null;
  currentState: CaseCurrentStateView;
  /** Always `true` in this version: a case given de baja is not returned. */
  active: boolean;
};

/**
 * The state filter of the listing, as **one** value of three kinds.
 *
 * The contract makes `proceduralStateId`, `customState` and
 * `withoutProceduralActs` mutually exclusive, because the prototype's
 * dropdown lets the user pick one option (§3.7). Modelling them as three
 * optional fields would let a caller set two and leave the use case to
 * notice; as a union, two at once does not typecheck. CA-20.4 is the
 * criterion that breaks most often, so the type carries the rule.
 */
export type CaseStateFilter =
  | { kind: 'proceduralState'; proceduralStateId: number }
  | { kind: 'custom'; customState: string }
  | { kind: 'withoutProceduralActs' };

/**
 * Filters of `GET /cases` (§3.7). An unknown lawyer, client or state is not
 * an error: it yields an empty collection, not a 404.
 */
export type CaseSearchCriteria = {
  page: number;
  limit: number;
  /** Matches `sacNumber`, `caption` **and** the client's surname and given names. The three. */
  search?: string;
  jurisdiction?: JurisdictionCode;
  responsibleLawyerId?: number;
  clientId?: number;
  /** `true`: only cases with a due date, **overdue ones included**. */
  openDeadline?: boolean;
  state?: CaseStateFilter;
};

export type CasePage = { items: CaseListItem[]; totalItems: number };

/**
 * Read port for cases, separate from {@link CaseRepository}.
 *
 * The repository rebuilds the `Case` aggregate to write it; this one
 * projects straight to {@link CaseListItem} to show it. Keeping them apart
 * is what stops the write repository from growing read concerns, and it is
 * the design the module already states (`case.module.ts`).
 *
 */
export interface CaseQueryPort {
  /**
   * One page of cases, ordered by urgency: first those with a due date,
   * by due date ascending — **overdue first** — then those without one, by
   * `id`. Not by `id`, and not by registration date.
   *
   * Returns the total alongside the page because the `pagination` block
   * needs it and counting belongs to the database.
   */
  search(criteria: CaseSearchCriteria): Promise<CasePage>;

  /**
   * One case for the detail (HU22), or `null` if there is none — which is
   * also the answer for a case given de baja, so the two are
   * indistinguishable through the endpoint.
   *
   * Entities *referenced* by the case are not filtered by `active`: a case
   * keeps showing a deactivated procedural state or legal qualification,
   * because they are part of its history (§4, Bajas).
   */
  findById(id: number): Promise<CaseListItem | null>;

  /**
   * The hand-written states that **active** cases currently hold, without
   * repeats and in alphabetical order (`GET /cases/custom-states`).
   *
   * Feeds the "Escritos a mano en causas" group of the listing's state filter.
   * It needs its own endpoint because those texts live in no table: a lawyer
   * typed them when registering an act, and they cannot be derived from one
   * page of the listing.
   *
   * **"Iniciada" is never in this list.** It is the initial state, not a
   * hand-written one, and the filter offers it separately as
   * `withoutProceduralActs`. That falls out of the data rather than needing a
   * rule: a case in the initial state holds `current_state_id`, not
   * `current_custom_state`.
   *
   * **On "active case".** The definition is "not given de baja **and** its
   * current procedural state is not terminal" (§4). The second half is vacuous
   * here: a hand-written state has no row in `procedural_states`, so it has no
   * `terminal` flag, and the contract settles it — a hand-written state is not
   * terminal. The schema's CHECK guarantees a case holds either a state id or
   * a custom text, never both, so every case this returns is non-terminal by
   * construction. Only `active` has to be filtered.
   */
  listCustomStates(jurisdiction?: JurisdictionCode): Promise<string[]>;

  /**
   * Active cases per procedural state id, for the `activeCases` that
   * `GET /procedural-states` and `GET /procedural-states/{stateId}` show
   * (§8.4).
   *
   * **Why a batch and not one id.** The listing is paginated, so one call per
   * row is an N+1: twenty queries for a page of twenty states. The four counts
   * here each take an array and answer with one `GROUP BY`.
   *
   * **Why the four live in `cases`.** "Active case" is this subsystem's rule
   * (§4), not the caller's. Counted in four subsystems it would drift in four
   * subsystems.
   *
   * **The predicate is not the same for the four, and this is the one that
   * differs.** A case is active when it was not given de baja and its current
   * state is not terminal. This count adds a third condition that the other
   * three must **not** have — the initial state does not count:
   *
   * |                                | not de baja | state not terminal | not initial |
   * | ------------------------------ | ----------- | ------------------ | ----------- |
   * | `countActiveByProceduralState` | yes         | yes                | **yes**     |
   * | the other three                | yes         | yes                | **no**      |
   *
   * "Iniciada" is not part of `GET /procedural-states` at all, so an
   * `activeCases` for it has nowhere to show. But a freshly registered case
   * **does** count for its lawyer, its client and its qualifications: giving
   * the three the `is_initial` clause is the easy bug, and it hides exactly
   * the cases a new study has most of.
   *
   * A case in a hand-written state counts for no procedural state at all: it
   * holds `current_custom_state` and no `current_state_id`, so it belongs to
   * no row of the table. It still counts for its lawyer, client and
   * qualifications, because a hand-written state is not terminal (§4).
   *
   * **Every requested id comes back**, with `0` when it has no active case, so
   * no caller has to remember the default.
   */
  countActiveByProceduralState(stateIds: readonly number[]): Promise<ReadonlyMap<number, number>>;

  /**
   * Active cases per legal qualification id, for `GET /legal-qualifications`
   * (§8.4). Same contract as {@link countActiveByProceduralState} except the
   * initial state counts — see its table.
   *
   * A case counts for **each** of its qualifications, and a qualification
   * given de baja still counts the cases that hold it: its own `active` is
   * irrelevant here, because the case keeps showing it as part of its history
   * (RN12).
   */
  countActiveByLegalQualification(qualificationIds: readonly number[]): Promise<ReadonlyMap<number, number>>;

  /**
   * Active cases per responsible lawyer id, for `GET /lawyers` (§8.4). Same
   * contract as {@link countActiveByProceduralState} except the initial state
   * counts — see its table.
   *
   * This is the count of RN3's "carga de trabajo": every case has exactly one
   * responsible lawyer, so the counts partition the active cases.
   */
  countActiveByResponsibleLawyer(lawyerIds: readonly number[]): Promise<ReadonlyMap<number, number>>;

  /**
   * Active cases per client id, for `GET /clients` (§8.4). Same contract as
   * {@link countActiveByProceduralState} except the initial state counts —
   * see its table.
   */
  countActiveByClient(clientIds: readonly number[]): Promise<ReadonlyMap<number, number>>;
}
