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
import { CASE_QUERY } from './core/domain/ports/case-query.port';
import { CASE_REPOSITORY } from './core/domain/ports/case.repository';
import { LegalParametersActiveCasesCounterAdapter } from './infrastructure/acl/legal-parameters-active-cases-counter.adapter';
import { PeopleActiveCasesCounterAdapter } from './infrastructure/acl/people-active-cases-counter.adapter';
import { CasesController } from './infrastructure/http/controllers/cases.controller';
import { CasePrismaRepository } from './infrastructure/persistence/case-prisma.repository';
import { CaseQueryPrismaAdapter } from './infrastructure/persistence/case-query-prisma.adapter';

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
 * se evalúa como `undefined` y Nest no puede resolver el grafo.
 */
@Module({
  imports: [forwardRef(() => PeopleModule), forwardRef(() => LegalParametersModule), SharedModule],
  controllers: [CasesController],
  providers: [
    RegisterCase,
    ListCases,
    GetCase,
    ListCustomStates,
    { provide: CASE_REPOSITORY, useClass: CasePrismaRepository },
    { provide: CASE_QUERY, useClass: CaseQueryPrismaAdapter },
    // Adapters of the ports that other subsystems define to ask `cases` for
    // the number of active cases. The two tokens happen to share a name in
    // their own subsystems, which is why one is imported aliased here.
    { provide: ActiveCasesCounterPort, useClass: LegalParametersActiveCasesCounterAdapter },
    { provide: PeopleActiveCasesCounterPort, useClass: PeopleActiveCasesCounterAdapter },
  ],
  exports: [ActiveCasesCounterPort, PeopleActiveCasesCounterPort],
})
export class CasesModule {}
