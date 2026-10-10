import { Inject, Injectable } from '@nestjs/common';
import {
  LegalParametersLookupPort,
  LegalQualificationRef,
  ProceduralStateRef,
} from '@subsystems/cases/core/domain/ports/legal-parameters-lookup.port';
import { DayType as CasesDayType } from '@subsystems/cases/core/domain/value-objects/day-type';
import { ProceduralState } from '../../core/domain/entities/procedural-states';
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
    return state ? this.toStateRef(state) : null;
  }

  async findProcStateById(id: number): Promise<ProceduralStateRef | null> {
    const state = await this.procStateRepo.findById(id);
    return state ? this.toStateRef(state) : null;
  }

  async existsProcStateActiveByName(jurisdictionId: number, name: string): Promise<boolean> {
    return this.procStateRepo.existsActiveByName(jurisdictionId, name);
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

  private toStateRef(state: ProceduralState): ProceduralStateRef {
    // A state without a term has no day type; one without its own day type counts as its jurisdiction does.
    const dayType =
      state.timeLimitDays === 0 ? CasesDayType.NONE : ((state.dayType ?? state.jurisdiction.dayTypeDefault) as string);
    return {
      id: state.id,
      name: state.name,
      isInitial: state.isInitial,
      jurisdictionId: state.jurisdiction.id,
      terminal: state.terminal,
      isActive: state.isActive,
      timeLimitDays: state.timeLimitDays,
      dayType: dayType as CasesDayType,
    };
  }
}
