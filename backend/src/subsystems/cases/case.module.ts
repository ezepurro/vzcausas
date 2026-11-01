import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditModule } from '@shared/infrastructure/audit/audit.module';
import { ClockModule } from '@shared/infrastructure/clock/clock.module';
import { OPEN_DEADLINES } from '@subsystems/deadlines/core/domain/ports/open-deadlines.port';
import { PRESCRIPTION_STATUS } from '@subsystems/deadlines/core/domain/ports/prescription-status.port';
import { ActiveCasesCounterPort } from '@subsystems/legal-parameters/core/domain/ports/active-cases-counter.port';
import { LegalParametersModule } from '@subsystems/legal-parameters/legal-parameters.module';
import { ActiveCasesCounterPort as PeopleActiveCasesCounterPort } from '@subsystems/people/core/domain/ports/active-cases-counter.port';
import { PeopleModule } from '@subsystems/people/people.module';
import { GetCase } from './core/application/use-cases/case/get-case.use-case';
import { GetCaseTimeline } from './core/application/use-cases/case/get-case-timeline.use-case';
import { GetProceduralAct } from './core/application/use-cases/procedural-act/get-procedural-act.use-case';
import { ListCases } from './core/application/use-cases/case/list-cases.use-case';
import { ListCustomStates } from './core/application/use-cases/case/list-custom-states.use-case';
import { ListActivePrescriptions } from './core/application/use-cases/prescription/list-active-prescriptions.use-case';
import { ListInterruptiveActs } from './core/application/use-cases/interruptive-act/list-interruptive-acts.use-case';
import { ListOpenDeadlines } from './core/application/use-cases/case/list-open-deadlines.use-case';
import { ListProceduralActs } from './core/application/use-cases/procedural-act/list-procedural-acts.use-case';
import { RegisterInterruptiveAct } from './core/application/use-cases/interruptive-act/register-interruptive-act.use-case';
import { DeclarePrescription } from './core/application/use-cases/prescription/declare-prescription.use-case';
import { UpdateCase } from './core/application/use-cases/case/update-case.use-case';
import { DeactivateCase } from './core/application/use-cases/case/deactivate-case.use-case';
import { RegisterCase } from './core/application/use-cases/case/register-case.use-case';
import { RegisterProceduralAct } from './core/application/use-cases/procedural-act/register-procedural-act.use-case';
import { RequestCaseFolder } from './core/application/use-cases/case/request-case-folder.use-case';
import { CASE_FOLDER_OUTCOMES } from './core/domain/ports/case/case-folder-outcome.port';
import { CASE_FOLDER_STATE } from './core/domain/ports/case/case-folder-state.port';
import { CASE_REPOSITORY } from './core/domain/ports/case/case.repository';
import { CASE_TIMELINE_QUERY } from './core/domain/ports/case/case-timeline-query.port';
import { CRIMINAL_PRESCRIPTION_QUERY } from './core/domain/ports/prescription/criminal-prescription-query.port';
import { DEADLINE_CALCULATOR } from './core/domain/ports/procedural-act/deadline-calculator.port';
import { INTERRUPTIVE_ACT_REPOSITORY } from './core/domain/ports/interruptive-act/interruptive-act.repository';
import { OPEN_DEADLINE_QUERY } from './core/domain/ports/procedural-act/open-deadline-query.port';
import { PROCEDURAL_ACT_REPOSITORY } from './core/domain/ports/procedural-act/procedural-act.repository';
import { BusinessDaysDeadlineCalculatorAdapter } from './infrastructure/acl/business-days-deadline-calculator.adapter';
import { DeadlinesOpenDeadlinesAdapter } from './infrastructure/acl/deadlines-open-deadlines.adapter';
import { DeadlinesPrescriptionStatusAdapter } from './infrastructure/acl/deadlines-prescription-status.adapter';
import { LegalParametersActiveCasesCounterAdapter } from './infrastructure/acl/legal-parameters-active-cases-counter.adapter';
import { PeopleActiveCasesCounterAdapter } from './infrastructure/acl/people-active-cases-counter.adapter';
import { CaseFolderOutcomeListener } from './infrastructure/acl/events/case-folder-outcome.listener';
import {
  CASE_FOLDER_WAIT_MS,
  InMemoryCaseFolderOutcomes,
} from './infrastructure/events/in-memory-case-folder-outcomes';
import { CaseTimelineController } from './infrastructure/http/controllers/case-timeline.controller';
import { CasesController } from './infrastructure/http/controllers/cases.controller';
import { InterruptiveActsController } from './infrastructure/http/controllers/interruptive-acts.controller';
import { CaseHttpMapper } from './infrastructure/http/mappers/case-http.mapper';
import { InterruptiveActHttpMapper } from './infrastructure/http/mappers/interruptive-act-http.mapper';
import { ProceduralActHttpMapper } from './infrastructure/http/mappers/procedural-act-http.mapper';
import { TimelineHttpMapper } from './infrastructure/http/mappers/timeline-http.mapper';
import { PrismaCaseFolderStateAdapter } from './infrastructure/persistence/prisma/prisma-case-folder-state.adapter';
import { PrismaCaseRepository } from './infrastructure/persistence/prisma/prisma-case.repository';
import { CaseTimelinePrismaAdapter } from './infrastructure/persistence/prisma/case-timeline-prisma.adapter';
import { CriminalPrescriptionQueryPrismaAdapter } from './infrastructure/persistence/prisma/criminal-prescription-query-prisma.adapter';
import { PrismaInterruptiveActRepository } from './infrastructure/persistence/prisma/prisma-interruptive-act.repository';
import { PrismaOpenDeadlineQueryAdapter } from './infrastructure/persistence/prisma/prisma-open-deadline-query.adapter';
import { PrismaProceduralActRepository } from './infrastructure/persistence/prisma/prisma-procedural-act.repository';

/**
 * Composition root of `cases`.
 *
 * **Escritura** (HU18): `cases` only receives adapters for its ports.
 * `people` provides `PEOPLE_LOOKUP` (lawyers and clients) and
 * `legal-parameters` provides `LEGAL_PARAMETERS_LOOKUP` (initial procedural
 * state and legal qualifications): their modules are imported just to get
 * those exported tokens. There are no stubs left.
 *
 * **Lectura** (HU20, HU22): `GET /cases`, `GET /cases/{caseId}` y
 * `GET /cases/custom-states`. Van por el mismo `CASE_REPOSITORY` que la
 * escritura, pero sus métodos de lectura proyectan a un modelo de lectura
 * (`CaseListItem`) en vez de reconstruir el agregado: el recurso junta datos de cinco tablas que la entidad `Case` no
 * tiene, y resolverlos de a uno por causa sería un N+1 de unas cien consultas
 * por página. El orden por urgencia lo hace `ListCases` en memoria, porque el
 * `orderBy` de Prisma no sabe expresar un `COALESCE` de dos columnas; el
 * motivo está en `PrismaCaseRepository`.
 *
 * Los tres endpoints de lectura y el `POST` comparten `CaseHttpMapper`: el
 * contrato exige que devuelvan el mismo recurso (§3.7), y un solo mapeo es lo
 * que lo vuelve estructural en vez de disciplina.
 *
 * **Lo que `cases` provee a otros** (§8.4): `ActiveCasesCounterPort`, el puerto
 * que declara `legal-parameters` para el `activeCases` de sus estados
 * procesales. Acá la dirección se invierte —`cases` es el proveedor— porque la
 * definición de causa activa es suya (§4). El adaptador está en
 * `infrastructure/acl/`, igual que `people` pone el suyo para el puerto que
 * `cases` declara (`people.module.ts:44`).
 *
 * **Por qué `forwardRef` en el import de `LegalParametersModule`.** La
 * dependencia es mutua y real: `cases` le pide el estado inicial del fuero y
 * las calificaciones legales para registrar una causa, y él le pide el conteo
 * de causas activas. Sin `forwardRef` de los dos lados, uno de los dos módulos
 * se evalúa como `undefined` y Nest no puede resolver el grafo. Lo mismo con
 * `PeopleModule`, por el `activeCases` de abogados y clientes.
 *
 * **Actos procesales** (HU-26): `POST /cases/:caseId/procedural-acts`. El
 * cómputo de plazos va por `DEADLINE_CALCULATOR`, hoy un adaptador
 * provisorio de lunes a viernes (P-02); `deadlines` lo reemplazará.
 *
 * El acto es lo que mueve el estado de la causa, así que es también lo que
 * mueve los cuatro conteos de `activeCases`: `saveCurrentAct` escribe
 * `current_state_id` y `current_custom_state` en un solo `UPDATE` y mantiene
 * el CHECK de exclusión mutua del que dependen los conteos.
 */
@Module({
  // `AuditModule`: `UpdateCase` and `DeactivateCase` audit what they write (CA-19.15, CA-21.3).
  imports: [forwardRef(() => PeopleModule), forwardRef(() => LegalParametersModule), ClockModule, AuditModule],
  controllers: [CasesController, InterruptiveActsController, CaseTimelineController],
  providers: [
    RegisterCase,
    // HU39: asks `documents` for the folder of a case and waits for the answer.
    // Used by the registration and by `POST /cases/{caseId}/folder`.
    RequestCaseFolder,
    CaseFolderOutcomeListener,
    { provide: CASE_FOLDER_STATE, useClass: PrismaCaseFolderStateAdapter },
    { provide: CASE_FOLDER_OUTCOMES, useClass: InMemoryCaseFolderOutcomes },
    {
      // How long a request waits for the folder before answering `CREATING`.
      provide: CASE_FOLDER_WAIT_MS,
      useFactory: (config: ConfigService) => {
        const configured = Number(config.get<string>('CASE_FOLDER_WAIT_MS'));
        return Number.isFinite(configured) && configured > 0 ? configured : 10_000;
      },
      inject: [ConfigService],
    },
    ListCases,
    GetCase,
    ListCustomStates,
    // The case resource of the listing, the detail and the registration (§3.7).
    CaseHttpMapper,
    // HU33: marks a criminal case as prescribed; answers with the detail (`GetCase`).
    DeclarePrescription,
    UpdateCase,
    // HU21: logical baja, audited.
    DeactivateCase,
    RegisterProceduralAct,
    // HU27: la consulta de actos procesales, por el mismo repositorio que los registra.
    ListProceduralActs,
    GetProceduralAct,
    ProceduralActHttpMapper,
    { provide: CASE_REPOSITORY, useClass: PrismaCaseRepository },
    { provide: PROCEDURAL_ACT_REPOSITORY, useClass: PrismaProceduralActRepository },
    // HU31: actos interruptivos. Su efecto sobre la prescripción no se guarda:
    // lo calculan `PrismaCaseRepository` y `withDeadlines` en cada lectura de la causa.
    RegisterInterruptiveAct,
    ListInterruptiveActs,
    InterruptiveActHttpMapper,
    { provide: INTERRUPTIVE_ACT_REPOSITORY, useClass: PrismaInterruptiveActRepository },
    // HU27: la línea de vida de la causa (D-85), con las tres fuentes intercaladas.
    GetCaseTimeline,
    TimelineHttpMapper,
    { provide: CASE_TIMELINE_QUERY, useClass: CaseTimelinePrismaAdapter },
    { provide: DEADLINE_CALCULATOR, useClass: BusinessDaysDeadlineCalculatorAdapter },
    // Adapters of the ports that other subsystems define to ask `cases` for
    // the number of active cases. The two tokens happen to share a name in
    // their own subsystems, which is why one is imported aliased here.
    { provide: ActiveCasesCounterPort, useClass: LegalParametersActiveCasesCounterAdapter },
    { provide: PeopleActiveCasesCounterPort, useClass: PeopleActiveCasesCounterAdapter },
    // HU52: la prescripción de las causas penales activas, para la verificación
    // diaria de `deadlines`. El puerto es suyo; `cases` lo implementa porque la
    // regla de la prescripción es de `cases` (V-04, V-05 de
    // IMPLEMENTACION_DETECCION.md). Solo se exporta el token.
    ListActivePrescriptions,
    { provide: CRIMINAL_PRESCRIPTION_QUERY, useClass: CriminalPrescriptionQueryPrismaAdapter },
    { provide: PRESCRIPTION_STATUS, useClass: DeadlinesPrescriptionStatusAdapter },
    // HU51: los vencimientos abiertos de las causas activas, para la
    // verificación diaria de `deadlines` (V-04, V-05). Solo se exporta el token.
    ListOpenDeadlines,
    { provide: OPEN_DEADLINE_QUERY, useClass: PrismaOpenDeadlineQueryAdapter },
    { provide: OPEN_DEADLINES, useClass: DeadlinesOpenDeadlinesAdapter },
  ],
  exports: [ActiveCasesCounterPort, PeopleActiveCasesCounterPort, PRESCRIPTION_STATUS, OPEN_DEADLINES],
})
export class CasesModule {}
