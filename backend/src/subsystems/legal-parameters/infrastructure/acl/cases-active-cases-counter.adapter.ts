import { Injectable } from '@nestjs/common';
import { CountActiveCasesByProceduralState } from '@subsystems/cases/core/application/use-cases/count-active-cases-by-procedural-state.use-case';
import { ActiveCasesCounterPort } from '../../core/domain/ports/active-cases-counter.port';

/**
 * Anti-corruption adapter (architecture §6.2): implements this subsystem's
 * {@link ActiveCasesCounterPort} by invoking the use case that `cases`
 * exports. The only file of `legal-parameters` that knows `cases` exists.
 *
 * Translates `cases`' answer, where ids with no active case are absent,
 * into the port's promise of one entry per requested id.
 */
@Injectable()
export class CasesActiveCasesCounterAdapter implements ActiveCasesCounterPort {
  constructor(private readonly countActiveCases: CountActiveCasesByProceduralState) {}

  async countByStates(stateIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    const counted = await this.countActiveCases.execute({ stateIds });
    return new Map(stateIds.map((id) => [id, counted.get(id) ?? 0]));
  }
}
