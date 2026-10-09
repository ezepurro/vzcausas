import { Injectable } from '@nestjs/common';
import { ActiveCasesCounterPort } from '../../core/domain/ports/active-cases-counter.port';

/**
 * TEMPORARY stand-in for {@link ActiveCasesCounterPort}: answers `0` for
 * every state, which is what `activeCases` returned before the port existed.
 *
 * The real count belongs to `cases`, which owns the cases and the rule of
 * what an active case is (contract §4, *Causa activa*). Pending on that
 * subsystem: a use case that counts the active cases per procedural state,
 * exported by `CasesModule`. Once it exists, replace this binding in
 * `LegalParametersModule` with an adapter that invokes it (architecture
 * §6.2), and delete this file.
 */
@Injectable()
export class StubActiveCasesCounterAdapter implements ActiveCasesCounterPort {
  async countByStates(stateIds: readonly number[]): Promise<ReadonlyMap<number, number>> {
    return new Map(stateIds.map((id) => [id, 0]));
  }
}
