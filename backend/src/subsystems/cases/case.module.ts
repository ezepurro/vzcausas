import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { LegalParametersModule } from '@subsystems/legal-parameters/legal-parameters.module';
import { PeopleModule } from '@subsystems/people/people.module';
import { ListCases } from './core/application/use-cases/list-cases.use-case';
import { RegisterCase } from './core/application/use-cases/register-case.use-case';
import { CASE_QUERY } from './core/domain/ports/case-query.port';
import { CASE_REPOSITORY } from './core/domain/ports/case.repository';
import { LEGAL_QUALIFICATION_LOOKUP } from './core/domain/ports/legal-qualification-lookup.port';
import { StubLegalQualificationLookupAdapter } from './infrastructure/acl/stub-legal-qualification-lookup.adapter';
import { CasesController } from './infrastructure/http/controllers/cases.controller';
import { CasePrismaRepository } from './infrastructure/persistence/case-prisma.repository';
import { CaseQueryPrismaAdapter } from './infrastructure/persistence/case-query-prisma.adapter';

/**
 * Composition root of `cases`.
 *
 * **Escritura** (HU-18): `cases` only receives adapters for its ports.
 * `people` provides the lawyer **and client** lookups and
 * `legal-parameters` the procedural state lookup: their modules are
 * imported just to get those exported tokens.
 *
 * `LEGAL_QUALIFICATION_LOOKUP` is still a stub, and it is the last one:
 * the `legal_qualifications` table exists (`schema.prisma:268`) but no
 * subsystem owns it — `legal-parameters` has no repository, use case or
 * controller for it, even though the contract defines five endpoints
 * under `/legal-qualifications` (§1). Until someone builds that module,
 * a case's qualifications render from `stub-data.ts:33`: two hardcoded
 * rows, ids 1 and 2. That makes CA-22.3 (the prescription card) show
 * wrong names for any real qualification, and it is why
 * `register-case.int.spec.ts` stays red on the qualification name.
 * Swap this binding for the real adapter as soon as the module lands.
 *
 * **Lectura** (HU-9, CA-9.4): `GET /cases` filtrado por cliente, con su
 * estado procesal y su vencimiento. Va por un puerto aparte
 * (`CASE_QUERY`) y proyecta a un modelo de lectura en vez de
 * reconstruir el agregado — ver `case-list-item.ts`.
 *
 * Nota: los dos controladores conviven sobre `/cases` (uno el `POST`,
 * otro el `GET`). Las carpetas `infraestructure` e `infrastructure`
 * coexisten por una diferencia de grafía entre ramas; conviene
 * unificarlas en una sola.
 */
@Module({
  imports: [PeopleModule, LegalParametersModule, SharedModule],
  controllers: [CasesController],
  providers: [
    RegisterCase,
    ListCases,
    { provide: CASE_REPOSITORY, useClass: CasePrismaRepository },
    // Read side (HU20, HU22): projects to a read model instead of rebuilding
    // the aggregate. See the class for why the ordering needs raw SQL.
    { provide: CASE_QUERY, useClass: CaseQueryPrismaAdapter },
    // CLIENT_LOOKUP and LAWYER_LOOKUP arrive implemented from `PeopleModule`.
    { provide: LEGAL_QUALIFICATION_LOOKUP, useClass: StubLegalQualificationLookupAdapter },
  ],
})
export class CasesModule {}
