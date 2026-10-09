import { Jurisdiction } from '@subsystems/legal-parameters/core/domain/entities/jurisdiction';
import { ProceduralState } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import {
  ProceduralStateRepository,
  ProcStateFilter,
} from '@subsystems/legal-parameters/core/domain/ports/procedural-states.repository';
import { DayType } from '@subsystems/legal-parameters/core/domain/entities/day-types';
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
