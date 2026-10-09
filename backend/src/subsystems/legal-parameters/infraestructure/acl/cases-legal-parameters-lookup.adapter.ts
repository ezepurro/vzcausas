import { Inject, Injectable } from '@nestjs/common';
import {
  LegalParametersLookupPort,
  LegalQualificationRef,
  ProceduralStateRef,
} from '@subsystems/cases/core/domain/ports/legal-parameters-lookup.port';
import { LegalQualificationRepository } from '../../core/domain/ports/legal-qualification.repository';
import { ProceduralStateRepository } from '../../core/domain/ports/procedural-states.repository';
import { JurisdictionCode } from '../../core/domain/value-objects/jurisdiction-code';

/**
 * Implements the {@link LegalParametersLookupPort} that `cases` defines, with
 * the procedural states and the legal qualifications that this subsystem
 * owns. It translates its own entities into the smaller references `cases`
 * works with, so `cases` never depends on this subsystem's domain.
 */
@Injectable()
export class CasesLegalParametersLookupAdapter implements LegalParametersLookupPort {
  constructor(
    @Inject(ProceduralStateRepository)
    private readonly procStateRepo: ProceduralStateRepository,
    @Inject(LegalQualificationRepository)
    private readonly qualificationRepo: LegalQualificationRepository,
  ) {}

  async findInitialProcStateByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralStateRef | null> {
    const state = await this.procStateRepo.findInitialByJurisdiction(jurisdiction);
    if (!state) {
      return null;
    }
    return { id: state.id, name: state.name, isInitial: state.isInitial, jurisdictionId: state.jurisdiction.id };
  }

  async findActiveQualificationsByIds(ids: number[]): Promise<LegalQualificationRef[]> {
    // A case carries few qualifications, so one query per id is enough.
    // `findActiveById` leaves out one that does not exist or was given up.
    const found = await Promise.all(ids.map((id) => this.qualificationRepo.findActiveById(id)));
    return found.flatMap((qualification) =>
      qualification
        ? [{ id: qualification.id, name: qualification.name, prescriptionMonths: qualification.prescriptionMonths }]
        : [],
    );
  }
}
