import { Module, forwardRef } from '@nestjs/common';
import { CasesModule } from '@subsystems/cases/case.module';
import { LEGAL_PARAMETERS_LOOKUP } from '@subsystems/cases/core/domain/ports/legal-parameters-lookup.port';
import { ViewProceduralStates } from './core/application/use-cases/view-procedural-states.use-case';
import { GetProceduralState } from './core/application/use-cases/get-procedural-state.use-case';
import { RegisterProceduralState } from './core/application/use-cases/register-procedural-state.use-case';
import { UpdateProceduralState } from './core/application/use-cases/update-procedural-state.use-case';
import { DeactivateProceduralState } from './core/application/use-cases/deactivate-procedural-state.use-case';
import { FindLegalQualification } from './core/application/use-cases/find-legal-qualification.use-case';
import { RegisterLegalQualification } from './core/application/use-cases/register-legal-qualification.use-case';
import { ViewLegalQualifications } from './core/application/use-cases/view-legal-qualifications.use-case';
import { LegalQualificationRepository } from './core/domain/ports/legal-qualification.repository';
import { ProceduralStateRepository } from './core/domain/ports/procedural-states.repository';
import { CasesLegalParametersLookupAdapter } from './infrastructure/acl/cases-legal-parameters-lookup.adapter';
import { LegalQualificationsController } from './infrastructure/http/controllers/legal-qualifications.controller';
import { ProceduralStatesController } from './infrastructure/http/controllers/procedural-states.controller';
import { LegalQualificationPrismaRepository } from './infrastructure/persistence/legal-qualification-prisma.repository';
import { ProceduralStatePrismaRepository } from './infrastructure/persistence/proc-state-prisma.repository';

/**
 * Composition root of `legal-parameters`.
 *
 * **`ActiveCasesCounterPort` is not bound here, on purpose.** This subsystem
 * declares the port — it is the consumer, and the port is written in its own
 * terms (architecture §6.2) — but `cases` implements it and exports the token,
 * because the definition of an active case is `cases`' rule (§4). So the
 * binding arrives through the import below, the way `LEGAL_PARAMETERS_LOOKUP`
 * travels the other way. The stub that answered `0` is gone.
 *
 * **Why `forwardRef`.** The dependency between the two modules is mutual:
 * `cases` asks this one for the jurisdiction's initial procedural state and for
 * legal qualifications in order to register a case, and this one asks `cases`
 * for the count. Both sides need `forwardRef` — `case.module.ts` carries the
 * other half — or one of the two module classes is still `undefined` when the
 * decorator of the other is evaluated.
 */
@Module({
  imports: [forwardRef(() => CasesModule)],
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
