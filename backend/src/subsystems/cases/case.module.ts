import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { LegalParametersModule } from '@subsystems/legal-parameters/legal-parameters.module';
import { PeopleModule } from '@subsystems/people/people.module';
import { RegisterCase } from './core/application/use-cases/register-case.use-case';
import { CASE_REPOSITORY } from './core/domain/ports/case.repository';
import { CLIENT_LOOKUP } from './core/domain/ports/client-lookup.port';
import { LEGAL_QUALIFICATION_LOOKUP } from './core/domain/ports/legal-qualification-lookup.port';
import { StubClientLookupAdapter } from './infrastructure/acl/stub-client-lookup.adapter';
import { StubLegalQualificationLookupAdapter } from './infrastructure/acl/stub-legal-qualification-lookup.adapter';
import { CasesController } from './infrastructure/http/controllers/cases.controller';
import { CasePrismaRepository } from './infrastructure/persistence/case-prisma.repository';

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
 */
@Module({
  imports: [PeopleModule, LegalParametersModule, SharedModule],
  controllers: [CasesController],
  providers: [
    RegisterCase,
    { provide: CASE_REPOSITORY, useClass: CasePrismaRepository },
    { provide: CLIENT_LOOKUP, useClass: StubClientLookupAdapter },
    { provide: LEGAL_QUALIFICATION_LOOKUP, useClass: StubLegalQualificationLookupAdapter },
  ],
})
export class CasesModule {}
