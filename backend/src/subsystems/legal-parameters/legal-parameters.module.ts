import { forwardRef, Module } from '@nestjs/common';
import { ProceduralStatesController } from './infrastructure/http/controllers/procedural-states.controller';
import { PROC_STATE_LOOKUP } from '@subsystems/cases/core/domain/ports/proc-state-lookup.port';
import { CasesModule } from '@subsystems/cases/case.module';
import { ViewProceduralStates } from './core/application/use-cases/view-procedural-states.use-case';
import { GetProceduralState } from './core/application/use-cases/get-procedural-state.use-case';
import { RegisterProceduralState } from './core/application/use-cases/register-procedural-state.use-case';
import { UpdateProceduralState } from './core/application/use-cases/update-procedural-state.use-case';
import { DeactivateProceduralState } from './core/application/use-cases/deactivate-procedural-state.use-case';
import { ActiveCasesCounterPort } from './core/domain/ports/active-cases-counter.port';
import { ProceduralStateRepository } from './core/domain/ports/procedural-states.repository';
import { CasesActiveCasesCounterAdapter } from './infrastructure/acl/cases-active-cases-counter.adapter';
import { ProcStateLookupAdapter } from './infrastructure/acl/proc-state-lookup.adapter';
import { ProceduralStatePrismaRepository } from './infrastructure/persistence/proc-state-prisma.repository';

/**
 * Composition root of `legal-parameters`.
 *
 * Imports `CasesModule` only for `CountActiveCasesByProceduralState`, which
 * backs the `activeCases` of the `GET`s. `cases` imports this module too
 * (for `PROC_STATE_LOOKUP`), so the reference goes through `forwardRef` on
 * both sides — see the docstring of `CasesModule`.
 */
@Module({
  imports: [forwardRef(() => CasesModule)],
  controllers: [ProceduralStatesController],
  providers: [
    ViewProceduralStates,
    GetProceduralState,
    RegisterProceduralState,
    UpdateProceduralState,
    DeactivateProceduralState,
    {
      provide: ProceduralStateRepository,
      useClass: ProceduralStatePrismaRepository,
    },
    // Adapter of this subsystem's port towards `cases`, for `activeCases`.
    { provide: ActiveCasesCounterPort, useClass: CasesActiveCasesCounterAdapter },
    // Adapter of the port that `cases` defines to ask for procedural states.
    { provide: PROC_STATE_LOOKUP, useClass: ProcStateLookupAdapter },
  ],
  exports: [PROC_STATE_LOOKUP],
})
export class LegalParametersModule {}
