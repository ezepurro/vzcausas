import { Injectable } from '@nestjs/common';
import { ProceduralState } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import { ProceduralStateRepository } from '@subsystems/legal-parameters/core/domain/ports/procedural-states.repository';
import { ProcStateFilter } from '@subsystems/legal-parameters/core/domain/ports/procedural-states.repository';
import { JurisdictionCode } from '@subsystems/legal-parameters/core/domain/value-objects/jurisdiction-code';
import { PaginatedResult } from '../../../../common/pagination/paginated-result';

@Injectable()
export class ProceduralStateInMemoryRepository implements ProceduralStateRepository {
  private readonly procStates: ProceduralState[] = [];

  async save(procState: ProceduralState): Promise<void> {
    this.procStates.push(procState);
  }

  async findAll(): Promise<ProceduralState[]> {
    return [...this.procStates];
  }

  async findInitialByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralState | null> {
    return (
      this.procStates.find(
        (state) =>
          state.isInitial && state.isActive && state.jurisdiction.isActive && state.jurisdiction.code === jurisdiction,
      ) ?? null
    );
  }

  async findPaginated(filter: ProcStateFilter, page: number, limit: number): Promise<PaginatedResult<ProceduralState>> {
    const search = filter.search?.toLowerCase();
    const matches = this.procStates.filter(
      (state) =>
        state.isActive &&
        (!filter.jurisdiction || state.jurisdiction.code === filter.jurisdiction) &&
        (!search || state.name.toLowerCase().includes(search)),
    );
    const start = (page - 1) * limit;

    return {
      items: matches.slice(start, start + limit),
      total: matches.length,
      page,
      limit,
      totalPages: Math.ceil(matches.length / limit),
    };
  }
}
