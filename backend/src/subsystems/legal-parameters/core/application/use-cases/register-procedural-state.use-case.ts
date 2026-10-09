import { Inject, Injectable } from '@nestjs/common';
import { DayType } from '../../domain/entities/day-types';
import { ProceduralState } from '../../domain/entities/procedural-states';
import {
  ProceduralStateAlreadyExistsError,
  ProceduralStateJurisdictionNotFoundError,
} from '../../domain/errors/procedural-state.errors';
import { ProceduralStateRepository } from '../../domain/ports/procedural-states.repository';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';

/**
 * Every field is required here: the contract's defaults (`timeLimitDays: 0`,
 * `dayType: NONE`, `terminal: false`) are applied by the HTTP mapper, so the
 * use case never has to guess what an absent value means.
 */
export type RegisterProceduralStateCommand = {
  name: string;
  jurisdiction: JurisdictionCode;
  timeLimitDays: number;
  dayType: DayType;
  terminal: boolean;
};

/**
 * HU45 — registers a new procedural state in a jurisdiction's table.
 *
 * Rules and where each one is enforced:
 * - CA-45.2, name unique per jurisdiction: checked here against the
 *   repository, because it needs the other states. The partial unique index
 *   `procedural_states_jurisdiction_name_active_key` is the real guarantee
 *   under concurrency; the Prisma adapter translates its violation into the
 *   same error.
 * - CA-45.3 / CA-45.5, `timeLimitDays` ⇔ `dayType` coherence, and CA-45.4,
 *   "Iniciada" reserved: validated by `ProceduralState.create`.
 * - CA-45.6, only ADMINISTRATOR: enforced by the HTTP layer
 *   (`@RequirePermissions`), not here.
 */
@Injectable()
export class RegisterProceduralState {
  constructor(
    @Inject(ProceduralStateRepository)
    private readonly procStateRepo: ProceduralStateRepository,
  ) {}

  async execute(command: RegisterProceduralStateCommand): Promise<ProceduralState> {
    // The entity holds a `Jurisdiction`, not a code, so it is resolved first.
    const jurisdiction = await this.procStateRepo.findJurisdictionByCode(command.jurisdiction);
    if (!jurisdiction) {
      throw new ProceduralStateJurisdictionNotFoundError();
    }

    // Checked before reserving an id so a duplicate does not burn a value
    // of the sequence.
    if (await this.procStateRepo.existsByName(command.jurisdiction, command.name)) {
      throw new ProceduralStateAlreadyExistsError();
    }

    const id = await this.procStateRepo.nextId();
    const procState = ProceduralState.create({
      id,
      name: command.name,
      timeLimitDays: command.timeLimitDays,
      dayType: command.dayType,
      terminal: command.terminal,
      // Only the seed creates "Iniciada"; a state registered through the
      // API is never the initial one.
      isInitial: false,
      isActive: true,
      jurisdiction,
      // Set by the database default on insert.
      createdAt: null,
    });

    await this.procStateRepo.create(procState);

    return procState;
  }
}
