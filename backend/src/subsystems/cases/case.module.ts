import { Module, forwardRef } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { ActiveCasesCounterPort } from '@subsystems/legal-parameters/core/domain/ports/active-cases-counter.port';
import { LegalParametersModule } from '@subsystems/legal-parameters/legal-parameters.module';
import { ActiveCasesCounterPort as PeopleActiveCasesCounterPort } from '@subsystems/people/core/domain/ports/active-cases-counter.port';
import { PeopleModule } from '@subsystems/people/people.module';
import { GetCase } from './core/application/use-cases/get-case.use-case';
import { ListCases } from './core/application/use-cases/list-cases.use-case';
import { ListCustomStates } from './core/application/use-cases/list-custom-states.use-case';
import { RegisterCase } from './core/application/use-cases/register-case.use-case';
import { RegisterProceduralAct } from './core/application/use-cases/register-procedural-act.use-case';
import { CASE_QUERY } from './core/domain/ports/case-query.port';
import { CASE_REPOSITORY } from './core/domain/ports/case.repository';
import { DEADLINE_CALCULATOR } from './core/domain/ports/deadline-calculator.port';
import { PROCEDURAL_ACT_REPOSITORY } from './core/domain/ports/procedural-act.repository';
import { BusinessDaysDeadlineCalculatorAdapter } from './infrastructure/acl/business-days-deadline-calculator.adapter';
import { LegalParametersActiveCasesCounterAdapter } from './infrastructure/acl/legal-parameters-active-cases-counter.adapter';
import { PeopleActiveCasesCounterAdapter } from './infrastructure/acl/people-active-cases-counter.adapter';
import { CasesController } from './infrastructure/http/controllers/cases.controller';
import { ProceduralActHttpMapper } from './infrastructure/http/mappers/procedural-act-http.mapper';
import { CasePrismaRepository } from './infrastructure/persistence/case-prisma.repository';
import { CaseQueryPrismaAdapter } from './infrastructure/persistence/case-query-prisma.adapter';
import { ProceduralActPrismaRepository } from './infrastructure/persistence/procedural-act-prisma.repository';

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
 * `GET /cases/custom-states`. Van por un puerto aparte, `CASE_QUERY`, que
 * proyecta a un modelo de lectura (`CaseListItem`) en vez de reconstruir el
 * agregado: el recurso junta datos de cinco tablas que la entidad `Case` no
 * tiene, y resolverlos de a uno por causa sería un N+1 de unas cien consultas
 * por página. El orden por urgencia necesita SQL crudo porque el `orderBy` de
 * Prisma no sabe expresar un `COALESCE` de dos columnas; el motivo está en
 * `CaseQueryPrismaAdapter`.
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
  imports: [forwardRef(() => PeopleModule), forwardRef(() => LegalParametersModule), SharedModule],
  controllers: [CasesController],
  providers: [
    RegisterCase,
    ListCases,
    GetCase,
    ListCustomStates,
    RegisterProceduralAct,
    ProceduralActHttpMapper,
    { provide: CASE_REPOSITORY, useClass: CasePrismaRepository },
    { provide: CASE_QUERY, useClass: CaseQueryPrismaAdapter },
    { provide: PROCEDURAL_ACT_REPOSITORY, useClass: ProceduralActPrismaRepository },
    { provide: DEADLINE_CALCULATOR, useClass: BusinessDaysDeadlineCalculatorAdapter },
    // Adapters of the ports that other subsystems define to ask `cases` for
    // the number of active cases. The two tokens happen to share a name in
    // their own subsystems, which is why one is imported aliased here.
    { provide: ActiveCasesCounterPort, useClass: LegalParametersActiveCasesCounterAdapter },
    { provide: PeopleActiveCasesCounterPort, useClass: PeopleActiveCasesCounterAdapter },
  ],
  exports: [ActiveCasesCounterPort, PeopleActiveCasesCounterPort],
})
export class CasesModule {}
