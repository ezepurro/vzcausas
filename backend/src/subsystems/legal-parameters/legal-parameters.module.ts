import { Module } from '@nestjs/common';
import { ProceduralStatesController } from './infraestructure/http/controllers/procedural-states.controller';
import { PROC_STATE_LOOKUP } from '@subsystems/cases/core/domain/ports/proc-state-lookup.port';
import { FindLegalQualification } from './core/application/use-cases/find-legal-qualification.use-case';
import { RegisterLegalQualification } from './core/application/use-cases/register-legal-qualification.use-case';
import { ViewLegalQualifications } from './core/application/use-cases/view-legal-qualifications.use-case';
import { ViewProceduralStates } from './core/application/use-cases/view-procedural-states.use-case';
import { LegalQualificationRepository } from './core/domain/ports/legal-qualification.repository';
import { ProceduralStateRepository } from './core/domain/ports/procedural-states.repository';
import { ProcStateLookupAdapter } from './infraestructure/acl/proc-state-lookup.adapter';
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
    // Calificaciones legales (HU-47, HU-48). El catálogo real que
    // `StubLegalQualificationLookupAdapter` todavía simula del lado de
    // `cases`: reemplazarlo es un adaptador exportado desde acá, igual
    // que `PROC_STATE_LOOKUP`, pero el binding del stub vive en
    // `CasesModule` y un proveedor local gana sobre el importado, así
    // que lo hace esa historia (C-09).
    RegisterLegalQualification,
    ViewLegalQualifications,
    FindLegalQualification,
    {
      provide: LegalQualificationRepository,
      useClass: LegalQualificationPrismaRepository,
    },
    // Adapter of the port that `cases` defines to ask for procedural states.
    { provide: PROC_STATE_LOOKUP, useClass: ProcStateLookupAdapter },
  ],
  exports: [PROC_STATE_LOOKUP],
})
export class LegalParametersModule {}
