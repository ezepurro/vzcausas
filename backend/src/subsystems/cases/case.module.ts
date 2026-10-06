import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { LegalParametersModule } from '@subsystems/legal-parameters/legal-parameters.module';
import { PeopleModule } from '@subsystems/people/people.module';
import { RegisterCase } from './core/application/use-cases/register-case.use-case';
import { CASE_REPOSITORY } from './core/domain/ports/case.repository';
import { CLIENT_LOOKUP } from './core/domain/ports/client-lookup.port';
import { CURRENT_DATE } from './core/domain/ports/current-date.port';
import { LEGAL_QUALIFICATION_LOOKUP } from './core/domain/ports/legal-qualification-lookup.port';
import { StubClientLookupAdapter } from './infraestructure/acl/stub-client-lookup.adapter';
import { StubLegalQualificationLookupAdapter } from './infraestructure/acl/stub-legal-qualification-lookup.adapter';
import { SystemCurrentDateAdapter } from './infraestructure/acl/system-current-date.adapter';
import { CasesController } from './infraestructure/http/controllers/cases.controller';
import { CasePrismaRepository } from './infraestructure/persistence/case-prisma.repository';

/**
 * Composition root of `cases`.
 *
 * `cases` only receives adapters for its ports. `people` provides the lawyer
 * lookup and `legal-parameters` the procedural state lookup: their modules are
 * imported just to get those exported tokens. The client and legal qualification
 * lookups are stubs while those subsystems have nothing to offer; swap each
 * binding for its real adapter then.
 */
@Module({
  imports: [PeopleModule, LegalParametersModule, SharedModule],
  controllers: [CasesController],
  providers: [
    RegisterCase,
    { provide: CASE_REPOSITORY, useClass: CasePrismaRepository },
    { provide: CLIENT_LOOKUP, useClass: StubClientLookupAdapter },
    { provide: LEGAL_QUALIFICATION_LOOKUP, useClass: StubLegalQualificationLookupAdapter },
    { provide: CURRENT_DATE, useClass: SystemCurrentDateAdapter },
  ],
})
export class CasesModule {}
