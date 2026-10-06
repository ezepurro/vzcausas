import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { PeopleModule } from '@subsystems/people/people.module';
import { RegisterCase } from './core/application/use-cases/register-case.use-case';
import { CASE_REPOSITORY } from './core/domain/ports/case.repository';
import { CLIENT_LOOKUP } from './core/domain/ports/client-lookup.port';
import { CURRENT_DATE } from './core/domain/ports/current-date.port';
import { JURISDICTION_LOOKUP } from './core/domain/ports/jurisdiction-lookup.port';
import { LAWYER_LOOKUP } from './core/domain/ports/lawyer-lookup.port';
import { LEGAL_QUALIFICATION_LOOKUP } from './core/domain/ports/legal-qualification-lookup.port';
import { PeopleLawyerLookupAdapter } from './infraestructure/acl/people-lawyer-lookup.adapter';
import { StubClientLookupAdapter } from './infraestructure/acl/stub-client-lookup.adapter';
import { StubJurisdictionLookupAdapter } from './infraestructure/acl/stub-jurisdiction-lookup.adapter';
import { StubLegalQualificationLookupAdapter } from './infraestructure/acl/stub-legal-qualification-lookup.adapter';
import { SystemCurrentDateAdapter } from './infraestructure/acl/system-current-date.adapter';
import { CasesController } from './infraestructure/http/controllers/cases.controller';
import { CasePrismaRepository } from './infraestructure/persistence/case-prisma.repository';

/**
 * Composition root of `cases`.
 *
 * The client, jurisdiction and legal qualification lookups are stubs while
 * `people` (clients), `legal-parameters` and the qualifications catalog do not
 * expose use cases for them. Swap each binding for its real adapter then.
 */
@Module({
  imports: [PeopleModule, SharedModule],
  controllers: [CasesController],
  providers: [
    RegisterCase,
    { provide: CASE_REPOSITORY, useClass: CasePrismaRepository },
    { provide: LAWYER_LOOKUP, useClass: PeopleLawyerLookupAdapter },
    { provide: CLIENT_LOOKUP, useClass: StubClientLookupAdapter },
    { provide: JURISDICTION_LOOKUP, useClass: StubJurisdictionLookupAdapter },
    { provide: LEGAL_QUALIFICATION_LOOKUP, useClass: StubLegalQualificationLookupAdapter },
    { provide: CURRENT_DATE, useClass: SystemCurrentDateAdapter },
  ],
})
export class CasesModule {}
