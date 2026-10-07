import { Injectable } from '@nestjs/common';
import { FindLawyerUseCase } from '@subsystems/people/core/application/use-cases/find-lawyer.use-case';
import { LawyerLookupPort, LawyerRef } from '../../core/domain/ports/lawyer-lookup.port';

/**
 * Anti-corruption adapter: implements {@link LawyerLookupPort} with the
 * `FindLawyerUseCase` that `people` exports. A deactivated lawyer counts as
 * non-existent (RN12), so no case can be assigned to it.
 */
@Injectable()
export class PeopleLawyerLookupAdapter implements LawyerLookupPort {
  constructor(private readonly findLawyer: FindLawyerUseCase) {}

  async findActiveById(id: number): Promise<LawyerRef | null> {
    const lawyer = await this.findLawyer.execute({ id });
    if (!lawyer || !lawyer.active) {
      return null;
    }
    return { id: lawyer.id, fullName: lawyer.fullName, registrationNumber: lawyer.registrationNumber };
  }
}
