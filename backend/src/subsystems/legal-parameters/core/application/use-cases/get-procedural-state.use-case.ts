import { Inject, Injectable } from '@nestjs/common';
import { ProceduralStateNotFoundError } from '../../domain/errors/procedural-state.errors';
import { ActiveCasesCounterPort } from '../../domain/ports/active-cases-counter.port';
import { ProceduralStateRepository } from '../../domain/ports/procedural-states.repository';
import { ProceduralStateWithActiveCases } from '../read-models/procedural-state-with-active-cases';

export type GetProceduralStateQuery = { id: number };

/**
 * `GET /procedural-states/{stateId}` — fetches a single procedural state,
 * with its `activeCases`.
 *
 * A logically deleted state (HU46, CA-46.2) and the system state "Iniciada"
 * must be indistinguishable from one that never existed: the contract
 * answers all three with the same 404 (`ProceduralStateNotFound`). The
 * repository already collapses them into `null`, so a null check is enough.
 */
@Injectable()
export class GetProceduralState {
  constructor(
    @Inject(ProceduralStateRepository)
    private readonly procStateRepo: ProceduralStateRepository,
    @Inject(ActiveCasesCounterPort)
    private readonly activeCasesCounter: ActiveCasesCounterPort,
  ) {}

  async execute(query: GetProceduralStateQuery): Promise<ProceduralStateWithActiveCases> {
    const procState = await this.procStateRepo.findById(query.id);
    if (!procState) {
      throw new ProceduralStateNotFoundError();
    }

    const counts = await this.activeCasesCounter.countByStates([procState.id]);
    return { procState, activeCases: counts.get(procState.id) ?? 0 };
  }
}
