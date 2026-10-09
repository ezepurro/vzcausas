import { forwardRef, Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { LegalParametersModule } from '@subsystems/legal-parameters/legal-parameters.module';
import { PeopleModule } from '@subsystems/people/people.module';
import { ListCasesUseCase } from './core/application/use-cases/list-cases.use-case';
import { CountActiveCasesByProceduralState } from './core/application/use-cases/count-active-cases-by-procedural-state.use-case';
import { RegisterCase } from './core/application/use-cases/register-case.use-case';
import { CASE_QUERY } from './core/domain/ports/case-query.port';
import { CASE_REPOSITORY } from './core/domain/ports/case.repository';
import { CLIENT_LOOKUP } from './core/domain/ports/client-lookup.port';
import { LEGAL_QUALIFICATION_LOOKUP } from './core/domain/ports/legal-qualification-lookup.port';
import { StubClientLookupAdapter } from './infraestructure/acl/stub-client-lookup.adapter';
import { StubLegalQualificationLookupAdapter } from './infraestructure/acl/stub-legal-qualification-lookup.adapter';
import { CasesController } from './infraestructure/http/controllers/cases.controller';
import { CasePrismaRepository } from './infraestructure/persistence/case-prisma.repository';
import { CaseController } from './infrastructure/http/controllers/case.controller';
import { PrismaCaseQueryAdapter } from './infrastructure/persistence/prisma/prisma-case-query.adapter';

/**
 * Composition root of `cases`.
 *
 * **Escritura** (HU-18): `cases` only receives adapters for its ports.
 * `people` provides the lawyer lookup and `legal-parameters` the
 * procedural state lookup: their modules are imported just to get those
 * exported tokens. The client and legal qualification lookups are stubs
 * while those subsystems have nothing to offer; swap each binding for
 * its real adapter then.
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
 *
 * **Exporta** `CountActiveCasesByProceduralState`, que `legal-parameters`
 * consume para el `activeCases` de los estados procesales.
 *
 * **Dependencia circular con `legal-parameters`:** cada uno consume al
 * otro (`cases` pide estados procesales y `legal-parameters` pide
 * conteos de causas), así que los dos módulos se importan mutuamente.
 * `forwardRef` difiere la referencia hasta que ambos archivos terminaron
 * de cargar; sin él, uno de los dos llegaría como `undefined` al
 * decorador. Va en los dos extremos. Solo los módulos forman ciclo: los
 * providers no se necesitan mutuamente.
 */
@Module({
  imports: [PeopleModule, forwardRef(() => LegalParametersModule), SharedModule],
  controllers: [CasesController, CaseController],
  providers: [
    RegisterCase,
    ListCasesUseCase,
    CountActiveCasesByProceduralState,
    { provide: CASE_REPOSITORY, useClass: CasePrismaRepository },
    { provide: CASE_QUERY, useClass: PrismaCaseQueryAdapter },
    { provide: CLIENT_LOOKUP, useClass: StubClientLookupAdapter },
    { provide: LEGAL_QUALIFICATION_LOOKUP, useClass: StubLegalQualificationLookupAdapter },
  ],
  exports: [CountActiveCasesByProceduralState],
})
export class CasesModule {}
