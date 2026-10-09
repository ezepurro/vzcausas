import { Inject, Injectable } from '@nestjs/common';
import { ProceduralStateNotFoundError } from '../../domain/errors/procedural-state.errors';
import { ProceduralStateRepository } from '../../domain/ports/procedural-states.repository';

export type DeactivateProceduralStateCommand = { id: number };

/**
 * HU46 — logically deletes a procedural state (RN12, CA-46.2). The row is
 * kept; for the client the state simply ceases to exist.
 *
 * - CA-46.1: once inactive, the repository no longer returns it, so it
 *   leaves the listing and cannot be chosen as the target of an act.
 * - CA-46.3 / CA-46.4: the deletion goes through even if cases are in this
 *   state. Nothing to check or update on them: they keep pointing to the
 *   row, so they keep its name and their deadlines untouched.
 * - CA-46.5, only ADMINISTRATOR: enforced by the HTTP layer.
 *
 * Deactivating an already-deactivated state answers "not found" rather than
 * being a no-op: that state is already invisible, and the caller must not be
 * able to tell "I just deleted it" from "it was already gone". Same for
 * "Iniciada", which is not part of the resource.
 */
@Injectable()
export class DeactivateProceduralState {
  constructor(
    @Inject(ProceduralStateRepository)
    private readonly procStateRepo: ProceduralStateRepository,
  ) {}

  async execute(command: DeactivateProceduralStateCommand): Promise<void> {
    const procState = await this.procStateRepo.findById(command.id);
    if (!procState) {
      throw new ProceduralStateNotFoundError();
    }

    procState.deactivate();
    await this.procStateRepo.save(procState);
  }
}
