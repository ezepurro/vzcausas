import { Module } from '@nestjs/common';
import { ProceduralStatesController } from './infrastructure/http/controllers/procedural-states.controller';
import { PROC_STATE_LOOKUP } from '@subsystems/cases/core/domain/ports/proc-state-lookup.port';
import { ViewProceduralStates } from './core/application/use-cases/view-procedural-states.use-case';
import { ProceduralStateRepository } from './core/domain/ports/procedural-states.repository';
import { ProcStateLookupAdapter } from './infrastructure/acl/proc-state-lookup.adapter';
import { ProceduralStatePrismaRepository } from './infrastructure/persistence/proc-state-prisma.repository';

@Module({
  controllers: [ProceduralStatesController],
  providers: [
    ViewProceduralStates,
    {
      provide: ProceduralStateRepository,
      useClass: ProceduralStatePrismaRepository,
    },
    // Adapter of the port that `cases` defines to ask for procedural states.
    { provide: PROC_STATE_LOOKUP, useClass: ProcStateLookupAdapter },
  ],
  exports: [PROC_STATE_LOOKUP],
})
export class LegalParametersModule {}
