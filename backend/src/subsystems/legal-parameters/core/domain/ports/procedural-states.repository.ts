import { Jurisdiction } from '../entities/jurisdiction';
import { ProceduralState } from '../entities/procedural-states';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';

/**
 * Filters of `GET /procedural-states`. Both optional: an absent field means
 * "no filter". Declared here, next to the port that consumes it, because
 * the domain must not import from `application` (architecture §5.4).
 */
export interface ProcStateFilter {
  jurisdiction?: JurisdictionCode;
  search?: string;
}

/**
 * Persistence port for {@link ProceduralState}. Declares what the use cases
 * need in business terms; the Prisma adapter supplies the queries and the
 * in-memory fake supplies an array, and no use case can tell them apart.
 *
 * Every lookup that serves the API ignores logically deleted states and the
 * system state "Iniciada": per the contract neither is part of the resource.
 * `findInitialByJurisdiction` is the one exception, since finding
 * "Iniciada" is its whole purpose.
 */
export interface ProceduralStateRepository {
  /**
   * One page of active states for `GET /procedural-states`, ordered by
   * jurisdiction and then by id (states have no position). Excludes
   * "Iniciada".
   */
  findPaginated(filter: ProcStateFilter, page: number, limit: number): Promise<PaginatedResult<ProceduralState>>;

  /**
   * The state with this id, or `null` if there is none, it was logically
   * deleted, or it is "Iniciada". The three cases collapse into `null` on
   * purpose: the contract answers all of them with the same 404, so the
   * use cases only need a null check.
   */
  findById(id: number): Promise<ProceduralState | null>;

  /**
   * `true` if an **active** state of this jurisdiction already has this
   * name, compared case-insensitively — the same rule as the partial unique
   * index `procedural_states_jurisdiction_name_active_key`. The index is
   * the real guarantee under concurrency; this check exists so the caller
   * gets the contract's 409 instead of a raw constraint violation.
   *
   * `excludingId` lets `UpdateProceduralState` check without colliding with
   * the state being renamed (e.g. "Archivada" → "ARCHIVADA").
   */
  existsByName(jurisdiction: JurisdictionCode, name: string, excludingId?: number): Promise<boolean>;

  /** The initial state ("Iniciada") of an active jurisdiction, or `null` if there is none. */
  findInitialByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralState | null>;

  /**
   * The active jurisdiction with this code, or `null`. `RegisterProceduralState`
   * needs it because the request carries the code (`"CRIMINAL"`) while the
   * entity holds a {@link Jurisdiction}.
   *
   * Lives here rather than in a port of its own because jurisdictions are
   * a read-only catalogue of this same subsystem and nothing else asks for
   * them yet. Split it out if jurisdictions ever get their own ABMC.
   */
  findJurisdictionByCode(code: JurisdictionCode): Promise<Jurisdiction | null>;

  /**
   * Reserves the next primary key. `ProceduralState.create()` takes the id
   * up front, so the use case obtains one before building the entity —
   * same approach as `UserRepository.nextId()`.
   */
  nextId(): Promise<number>;

  /**
   * Inserts a freshly created state (HU45). Fails if the id is taken: a new
   * state is never written over an existing one by mistake.
   */
  create(procState: ProceduralState): Promise<void>;

  /**
   * Persists the mutable fields of an existing state: name, time limit,
   * day type and terminal flag (HU17), and the active flag (HU46, logical
   * deletion). The jurisdiction is not written: it cannot change. There is
   * no `delete` on purpose — states are never physically removed.
   */
  save(procState: ProceduralState): Promise<void>;
}

export const ProceduralStateRepository = Symbol('ProceduralStateRepository');
