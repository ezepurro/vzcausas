import { Module } from '@nestjs/common';
import { ProceduralStatesController } from './infraestructure/http/controllers/procedural-states.controller';
import { ViewProceduralStates } from './core/application/use-cases/view-procedural-states.use-case';
import { ProceduralStateRepository } from './core/domain/ports/procedural-states.repository';
import { ProceduralStateInMemoryRepository } from './infraestructure/persistence/proc-state-in-memo.repository';
import { ProceduralStatePrismaRepository } from './infraestructure/persistence/proc-state-prisma.repository';

@Module({
  controllers: [ProceduralStatesController],
  providers: [
    ViewProceduralStates,
    {
      provide: ProceduralStateRepository,
      useClass: ProceduralStatePrismaRepository,
    },
  ],
})
export class LegalParametersModule {}
