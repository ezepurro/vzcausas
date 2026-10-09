import { Inject, Injectable } from '@nestjs/common';
import { ProceduralState } from '../../domain/entities/procedural-states';
import { ProceduralStateNotFoundError } from '../../domain/errors/procedural-state.errors';
import { ProceduralStateRepository } from '../../domain/ports/procedural-states.repository';

export type GetProceduralStateQuery = { id: number };

/**
 * `GET /procedural-states/{stateId}` — fetches a single procedural state.
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
  ) {}

  async execute(query: GetProceduralStateQuery): Promise<ProceduralState> {
    const procState = await this.procStateRepo.findById(query.id);
    if (!procState) {
      throw new ProceduralStateNotFoundError();
    }

    return procState;
  }
}
