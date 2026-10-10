import { Inject, Injectable } from '@nestjs/common';
import { DayType } from '../../domain/entities/day-types';
import { ProceduralState } from '../../domain/entities/procedural-states';
import {
  ProceduralStateAlreadyExistsError,
  ProceduralStateEmptyPatchError,
  ProceduralStateNotFoundError,
} from '../../domain/errors/procedural-state.errors';
import { ProceduralStateRepository } from '../../domain/ports/procedural-states.repository';

/**
 * Partial update: `undefined` means "leave as is". There is no
 * `jurisdiction` on purpose — it is not modifiable (contract V3, D-36), and
 * the HTTP mapper rejects it before reaching here.
 */
export type UpdateProceduralStateCommand = {
  id: number;
  name?: string;
  timeLimitDays?: number;
  dayType?: DayType;
  terminal?: boolean;
};

/**
 * HU17 — partially updates a procedural state.
 *
 * - CA-17.2, renaming propagates to the cases: nothing to do here, cases
 *   reference the state by FK and do not copy its name.
 * - CA-17.3, a new time limit does not recompute deadlines already
 *   registered: nothing to do here either, this use case only touches the
 *   state's own row.
 * - CA-17.4, moving to another jurisdiction: superseded by contract V3
 *   (D-36), the jurisdiction is not modifiable.
 * - CA-17.5, name unique per jurisdiction: checked here.
 * - CA-17.6, `timeLimitDays` ⇔ `dayType` coherence: validated by the entity
 *   against the state's **final** values.
 * - CA-17.7, only ADMINISTRATOR: enforced by the HTTP layer.
 */
@Injectable()
export class UpdateProceduralState {
  constructor(
    @Inject(ProceduralStateRepository)
    private readonly procStateRepo: ProceduralStateRepository,
  ) {}

  async execute(command: UpdateProceduralStateCommand): Promise<ProceduralState> {
    // The contract requires at least one field (`minProperties: 1`).
    if (
      command.name === undefined &&
      command.timeLimitDays === undefined &&
      command.dayType === undefined &&
      command.terminal === undefined
    ) {
      throw new ProceduralStateEmptyPatchError();
    }

    const procState = await this.procStateRepo.findById(command.id);
    if (!procState) {
      throw new ProceduralStateNotFoundError();
    }

    if (command.name !== undefined) {
      // The entity validates first (blank name, reserved "Iniciada") and
      // trims, so the uniqueness check runs against the name it will save.
      procState.rename(command.name);

      // Excluding the state itself lets a case-only rename go through
      // ("Archivada" → "ARCHIVADA") instead of colliding with itself.
      if (await this.procStateRepo.existsByName(procState.jurisdiction.code, procState.name, procState.id)) {
        throw new ProceduralStateAlreadyExistsError();
      }
    }

    if (command.timeLimitDays !== undefined || command.dayType !== undefined) {
      // The rule is between both fields, so a PATCH that sends only one of
      // them is validated against the current value of the other.
      procState.changeTimeLimit(
        command.timeLimitDays ?? procState.timeLimitDays,
        command.dayType ?? procState.dayType,
      );
    }

    if (command.terminal !== undefined) {
      procState.changeTerminal(command.terminal);
    }

    await this.procStateRepo.save(procState);

    return procState;
  }
}
