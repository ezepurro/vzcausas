import { Module } from '@nestjs/common';
import { ProceduralStatesController } from './infrastructure/http/controllers/procedural-states.controller';
import { PROC_STATE_LOOKUP } from '@subsystems/cases/core/domain/ports/proc-state-lookup.port';
import { ViewProceduralStates } from './core/application/use-cases/view-procedural-states.use-case';
import { GetProceduralState } from './core/application/use-cases/get-procedural-state.use-case';
import { RegisterProceduralState } from './core/application/use-cases/register-procedural-state.use-case';
import { UpdateProceduralState } from './core/application/use-cases/update-procedural-state.use-case';
import { DeactivateProceduralState } from './core/application/use-cases/deactivate-procedural-state.use-case';
import { ActiveCasesCounterPort } from './core/domain/ports/active-cases-counter.port';
import { ProceduralStateRepository } from './core/domain/ports/procedural-states.repository';
import { StubActiveCasesCounterAdapter } from './infrastructure/acl/stub-active-cases-counter.adapter';
import { ProcStateLookupAdapter } from './infrastructure/acl/proc-state-lookup.adapter';
import { ProceduralStatePrismaRepository } from './infrastructure/persistence/proc-state-prisma.repository';

/**
 * Composition root of `legal-parameters`.
 *
 * `ActiveCasesCounterPort` is bound to a stub until `cases` exports a use
 * case that counts active cases per procedural state — see
 * `StubActiveCasesCounterAdapter`.
 */
@Module({
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
    // Stub until `cases` provides the count (see the adapter's docstring).
    { provide: ActiveCasesCounterPort, useClass: StubActiveCasesCounterAdapter },
    // Adapter of the port that `cases` defines to ask for procedural states.
    { provide: PROC_STATE_LOOKUP, useClass: ProcStateLookupAdapter },
  ],
  exports: [PROC_STATE_LOOKUP],
})
export class LegalParametersModule {}
