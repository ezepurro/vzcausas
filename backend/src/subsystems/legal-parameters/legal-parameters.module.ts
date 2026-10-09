import { Module } from '@nestjs/common';
import { LEGAL_PARAMETERS_LOOKUP } from '@subsystems/cases/core/domain/ports/legal-parameters-lookup.port';
import { ViewProceduralStates } from './core/application/use-cases/view-procedural-states.use-case';
import { GetProceduralState } from './core/application/use-cases/get-procedural-state.use-case';
import { RegisterProceduralState } from './core/application/use-cases/register-procedural-state.use-case';
import { UpdateProceduralState } from './core/application/use-cases/update-procedural-state.use-case';
import { DeactivateProceduralState } from './core/application/use-cases/deactivate-procedural-state.use-case';
import { FindLegalQualification } from './core/application/use-cases/find-legal-qualification.use-case';
import { RegisterLegalQualification } from './core/application/use-cases/register-legal-qualification.use-case';
import { ViewLegalQualifications } from './core/application/use-cases/view-legal-qualifications.use-case';
import { ActiveCasesCounterPort } from './core/domain/ports/active-cases-counter.port';
import { LegalQualificationRepository } from './core/domain/ports/legal-qualification.repository';
import { ProceduralStateRepository } from './core/domain/ports/procedural-states.repository';
import { CasesLegalParametersLookupAdapter } from './infrastructure/acl/cases-legal-parameters-lookup.adapter';
import { StubActiveCasesCounterAdapter } from './infrastructure/acl/stub-active-cases-counter.adapter';
import { LegalQualificationsController } from './infrastructure/http/controllers/legal-qualifications.controller';
import { ProceduralStatesController } from './infrastructure/http/controllers/procedural-states.controller';
import { LegalQualificationPrismaRepository } from './infrastructure/persistence/legal-qualification-prisma.repository';
import { ProceduralStatePrismaRepository } from './infrastructure/persistence/proc-state-prisma.repository';

/**
 * Composition root of `legal-parameters`.
 *
 * `ActiveCasesCounterPort` is bound to a stub until `cases` exports a use
 * case that counts active cases per procedural state — see
 * `StubActiveCasesCounterAdapter`.
 */
@Module({
  controllers: [ProceduralStatesController, LegalQualificationsController],
  providers: [
    // Estados procesales (HU16, HU45, HU17, HU46).
    ViewProceduralStates,
    GetProceduralState,
    RegisterProceduralState,
    UpdateProceduralState,
    DeactivateProceduralState,
    {
      provide: ProceduralStateRepository,
      useClass: ProceduralStatePrismaRepository,
    },
    // Stub until `cases` provides the count (see the adapter's docstring).
    { provide: ActiveCasesCounterPort, useClass: StubActiveCasesCounterAdapter },
    // Calificaciones legales (HU-47, HU-48).
    RegisterLegalQualification,
    ViewLegalQualifications,
    FindLegalQualification,
    {
      provide: LegalQualificationRepository,
      useClass: LegalQualificationPrismaRepository,
    },
    // Adapter of the port that `cases` defines to ask for procedural states and legal qualifications.
    { provide: LEGAL_PARAMETERS_LOOKUP, useClass: CasesLegalParametersLookupAdapter },
  ],
  exports: [LEGAL_PARAMETERS_LOOKUP],
})
export class LegalParametersModule {}
