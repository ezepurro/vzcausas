import { Inject, Injectable } from '@nestjs/common';
import { ProcStateLookupPort, ProceduralStateRef } from '@subsystems/cases/core/domain/ports/proc-state-lookup.port';
import { ProceduralStateRepository } from '../../core/domain/ports/procedural-states.repository';
import { JurisdictionCode } from '../../core/domain/value-objects/jurisdiction-code';

/**
 * Implements the {@link ProcStateLookupPort} that `cases` defines, with the
 * procedural states that this subsystem owns. It translates its own
 * `ProceduralState` into the smaller reference `cases` works with, so `cases` never
 * depends on this subsystem's domain.
 */
@Injectable()
export class ProcStateLookupAdapter implements ProcStateLookupPort {
  constructor(
    @Inject(ProceduralStateRepository)
    private readonly procStateRepo: ProceduralStateRepository,
  ) {}

  async findInitialByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralStateRef | null> {
    const state = await this.procStateRepo.findInitialByJurisdiction(jurisdiction);
    if (!state) {
      return null;
    }
    return { id: state.id, name: state.name, isInitial: state.isInitial, jurisdictionId: state.jurisdiction.id };
  }
}
