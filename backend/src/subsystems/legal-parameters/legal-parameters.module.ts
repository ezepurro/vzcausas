import { Module } from '@nestjs/common';
import { ProceduralStatesController } from './infraestructure/http/controllers/procedural-states.controller';
import { LEGAL_PARAMETERS_LOOKUP } from '@subsystems/cases/core/domain/ports/legal-parameters-lookup.port';
import { FindLegalQualification } from './core/application/use-cases/find-legal-qualification.use-case';
import { RegisterLegalQualification } from './core/application/use-cases/register-legal-qualification.use-case';
import { ViewLegalQualifications } from './core/application/use-cases/view-legal-qualifications.use-case';
import { ViewProceduralStates } from './core/application/use-cases/view-procedural-states.use-case';
import { LegalQualificationRepository } from './core/domain/ports/legal-qualification.repository';
import { ProceduralStateRepository } from './core/domain/ports/procedural-states.repository';
import { CasesLegalParametersLookupAdapter } from './infraestructure/acl/cases-legal-parameters-lookup.adapter';
import { LegalQualificationsController } from './infraestructure/http/controllers/legal-qualifications.controller';
import { LegalQualificationPrismaRepository } from './infraestructure/persistence/legal-qualification-prisma.repository';
import { ProceduralStateInMemoryRepository } from './infraestructure/persistence/proc-state-in-memo.repository';
import { ProceduralStatePrismaRepository } from './infraestructure/persistence/proc-state-prisma.repository';

@Module({
  controllers: [ProceduralStatesController, LegalQualificationsController],
  providers: [
    ViewProceduralStates,
    {
      provide: ProceduralStateRepository,
      useClass: ProceduralStatePrismaRepository,
    },
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
