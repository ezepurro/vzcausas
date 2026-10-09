import { Inject, Injectable } from '@nestjs/common';
import { ActiveCasesCounterPort } from '../../domain/ports/active-cases-counter.port';
import { ProceduralStateRepository, ProcStateFilter } from '../../domain/ports/procedural-states.repository';
import { GetProcStatesInput } from '../common/get-proc-states.interfaces';
import { ProceduralStateWithActiveCases } from '../read-models/procedural-state-with-active-cases';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';

/**
 * `GET /procedural-states` — one page of states, each with its
 * `activeCases`. The counts for the whole page are asked for in a single
 * call, never one per state.
 */
@Injectable()
export class ViewProceduralStates {
  constructor(
    @Inject(ProceduralStateRepository)
    private readonly procStateRepo: ProceduralStateRepository,
    @Inject(ActiveCasesCounterPort)
    private readonly activeCasesCounter: ActiveCasesCounterPort,
  ) {}

  async getAll(queryParams: GetProcStatesInput): Promise<PaginatedResult<ProceduralStateWithActiveCases>> {
    const filter: ProcStateFilter = {
      jurisdiction: queryParams.jurisdiction,
      search: queryParams.search?.trim() || undefined,
    };
    const page = await this.procStateRepo.findPaginated(filter, queryParams.page, queryParams.limit);

    // An empty page needs no counts: skip the call to `cases`.
    const counts =
      page.items.length > 0
        ? await this.activeCasesCounter.countByStates(page.items.map((procState) => procState.id))
        : new Map<number, number>();

    return {
      ...page,
      items: page.items.map((procState) => ({
        procState,
        activeCases: counts.get(procState.id) ?? 0,
      })),
    };
  }
}
