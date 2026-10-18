import { Jurisdiction } from '@subsystems/legal-parameters/core/domain/entities/jurisdiction';
import {
  INITIAL_STATE_NAME,
  ProceduralState,
  ProceduralStateProps,
} from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import {
  ProceduralStateRepository,
  ProcStateFilter,
} from '@subsystems/legal-parameters/core/domain/ports/procedural-states.repository';
import { DayType } from '@subsystems/legal-parameters/core/domain/entities/day-types';
import { ActiveCasesCounterPort } from '@subsystems/legal-parameters/core/domain/ports/active-cases-counter.port';
import { JurisdictionCode } from '@subsystems/legal-parameters/core/domain/value-objects/jurisdiction-code';
import { PaginatedResult } from '../../../../../../common/pagination/paginated-result';

/**
 * The jurisdiction catalogue the fake knows, one per code. Exported so specs
 * can build states with the same `Jurisdiction` the repository returns.
 */
export const FAKE_JURISDICTIONS: Readonly<Record<JurisdictionCode, Jurisdiction>> = {
  [JurisdictionCode.CRIMINAL]: Jurisdiction.hydrate({
    id: 1,
    code: JurisdictionCode.CRIMINAL,
    dayTypeDefault: DayType.BUSINESS,
    isActive: true,
  }),
  [JurisdictionCode.ADMINISTRATIVE]: Jurisdiction.hydrate({
    id: 2,
    code: JurisdictionCode.ADMINISTRATIVE,
    dayTypeDefault: DayType.BUSINESS,
    isActive: true,
  }),
  [JurisdictionCode.AMPARO]: Jurisdiction.hydrate({
    id: 3,
    code: JurisdictionCode.AMPARO,
    dayTypeDefault: DayType.BUSINESS,
    isActive: true,
  }),
};

/**
 * In-memory fake of {@link ActiveCasesCounterPort}. A spec sets the counts
 * it wants in `counts`; `calls` records every request so a spec can assert
 * the counts were asked for in one call.
 *
 * Honours the port's promise like the real adapter does: every requested
 * id comes back, with `0` when it has no count set.
 */
export class FakeActiveCasesCounter implements ActiveCasesCounterPort {
  public readonly counts = new Map<number, number>();
  public readonly calls = new Array<readonly number[]>();

  async countByStates(stateIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    this.calls.push(stateIds);
    return new Map(stateIds.map((id) => [id, this.counts.get(id) ?? 0]));
  }

  /**
   * The count per legal qualification shares `counts` and `calls` with the one
   * per procedural state: no spec exercises both at once, and one set of books
   * makes an accidental crossover visible instead of silently plausible.
   */
  async countByQualifications(qualificationIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    this.calls.push(qualificationIds);
    return new Map(qualificationIds.map((id) => [id, this.counts.get(id) ?? 0]));
  }
}

/**
 * A valid, active, non-initial state of the CRIMINAL jurisdiction. Built
 * with `hydrate` so specs can also set up states the API could never create
 * (deactivated ones, or "Iniciada").
 */
export function aProceduralState(overrides: Partial<ProceduralStateProps> = {}): ProceduralState {
  return ProceduralState.hydrate({
    id: 1,
    name: 'Citación a juicio',
    timeLimitDays: 5,
    dayType: DayType.BUSINESS,
    terminal: false,
    isInitial: false,
    isActive: true,
    jurisdiction: FAKE_JURISDICTIONS[JurisdictionCode.CRIMINAL],
    createdAt: new Date('2026-09-27T00:00:00Z'),
    ...overrides,
  });
}

/** The system state "Iniciada" of a jurisdiction, as the seed creates it. */
export function anInitialState(id: number, code: JurisdictionCode = JurisdictionCode.CRIMINAL): ProceduralState {
  return aProceduralState({
    id,
    name: INITIAL_STATE_NAME,
    timeLimitDays: 0,
    dayType: DayType.NONE,
    isInitial: true,
    jurisdiction: FAKE_JURISDICTIONS[code],
  });
}

/**
 * In-memory fake of {@link ProceduralStateRepository} for the use-case specs
 * (no NestJS, no database). Mirrors what the Prisma adapter does in SQL —
 * active states only, "Iniciada" excluded, case-insensitive names — on
 * purpose: a fake that behaved differently would let specs pass against
 * behaviour production does not have.
 *
 * `created` and `saved` record every write so a spec can assert what the
 * use case persisted.
 */
export class FakeProceduralStateRepository implements ProceduralStateRepository {
  private readonly byId = new Map<number, ProceduralState>();
  public readonly created = new Array<ProceduralState>();
  public readonly saved = new Array<ProceduralState>();
  private nextIdValue = 1;

  /**
   * Arranges the data a spec starts from. Unlike {@link create}, it does not
   * record into `created`, so a spec only sees what the use case wrote.
   *
   * Moves {@link nextId} past the seeded ids, as if they had come from the
   * sequence: otherwise a later `create` would collide with them.
   */
  seed(...procStates: ProceduralState[]): void {
    for (const procState of procStates) {
      this.byId.set(procState.id, procState);
      this.nextIdValue = Math.max(this.nextIdValue, procState.id + 1);
    }
  }

  async findPaginated(filter: ProcStateFilter, page: number, limit: number): Promise<PaginatedResult<ProceduralState>> {
    const search = filter.search?.toLowerCase();

    const matches = [...this.byId.values()]
      .filter((state) => state.isActive && !state.isInitial)
      .filter((state) => !filter.jurisdiction || state.jurisdiction.code === filter.jurisdiction)
      .filter((state) => !search || state.name.toLowerCase().includes(search))
      .sort((a, b) => a.jurisdiction.code.localeCompare(b.jurisdiction.code) || a.id - b.id);
    const start = (page - 1) * limit;

    return {
      items: matches.slice(start, start + limit),
      total: matches.length,
      page,
      limit,
      totalPages: Math.ceil(matches.length / limit),
    };
  }
  async findById(id: number): Promise<ProceduralState | null> {
    const procState = this.byId.get(id);
    return procState && !procState.isInitial && procState.isActive ? procState : null;
  }

  async existsByName(jurisdiction: JurisdictionCode, name: string, excludingId?: number): Promise<boolean> {
    return [...this.byId.values()].some(
      (proc) =>
        proc.isActive &&
        proc.jurisdiction.code === jurisdiction &&
        proc.name.toLowerCase() === name.toLowerCase().trim() &&
        proc.id !== excludingId,
    );
  }

  /** By jurisdiction id, active states only, "Iniciada" included: what the Prisma query does. */
  async existsActiveByName(jurisdictionId: number, name: string): Promise<boolean> {
    return [...this.byId.values()].some(
      (proc) =>
        proc.isActive && proc.jurisdiction.id === jurisdictionId && proc.name.toLowerCase() === name.toLowerCase(),
    );
  }

  async findInitialByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralState | null> {
    const initial = [...this.byId.values()].find(
      (procState) => procState.isInitial && procState.jurisdiction.code === jurisdiction,
    );

    return initial ?? null;
  }

  /**
   * Looks in its own catalogue, not in the stored states: in the database
   * jurisdictions live in their own table, so the first state of a
   * jurisdiction must be registrable.
   */
  async findJurisdictionByCode(code: JurisdictionCode): Promise<Jurisdiction | null> {
    const jurisdiction = FAKE_JURISDICTIONS[code];
    return jurisdiction?.isActive ? jurisdiction : null;
  }

  /** Like a Postgres sequence: never hands out the same number twice. */
  async nextId(): Promise<number> {
    return this.nextIdValue++;
  }

  /**
   * Fails on a taken id, like an INSERT on the primary key. Overwriting in
   * silence would hide a spec that seeds ids by hand and then collides with
   * {@link nextId}.
   */
  async create(procState: ProceduralState): Promise<void> {
    if (this.byId.has(procState.id)) {
      throw new Error(`FakeProceduralStateRepository: id ${procState.id} already exists.`);
    }
    this.byId.set(procState.id, procState);
    this.created.push(procState);
  }
  async save(procState: ProceduralState): Promise<void> {
    this.byId.set(procState.id, procState);
    this.saved.push(procState);
  }
}
