import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { LegalParametersModule } from '@subsystems/legal-parameters/legal-parameters.module';
import { PeopleModule } from '@subsystems/people/people.module';
import { RegisterCase } from './core/application/use-cases/register-case.use-case';
import { RegisterProceduralAct } from './core/application/use-cases/register-procedural-act.use-case';
import { CASE_REPOSITORY } from './core/domain/ports/case.repository';
import { DEADLINE_CALCULATOR } from './core/domain/ports/deadline-calculator.port';
import { BusinessDaysDeadlineCalculatorAdapter } from './infrastructure/acl/business-days-deadline-calculator.adapter';
import { CasesController } from './infrastructure/http/controllers/cases.controller';
import { ProceduralActHttpMapper } from './infrastructure/http/mappers/procedural-act-http.mapper';
import { CasePrismaRepository } from './infrastructure/persistence/case-prisma.repository';

/**
 * Composition root of `cases`.
 *
 * **Escritura** (HU-18): `cases` only receives adapters for its ports.
 * `people` provides `PEOPLE_LOOKUP` (lawyers and clients) and
 * `legal-parameters` provides `LEGAL_PARAMETERS_LOOKUP` (initial procedural
 * state and legal qualifications): their modules are imported just to get
 * those exported tokens.
 *
 * **Actos procesales** (HU-26): `POST /cases/:caseId/procedural-acts`. El
 * cómputo de plazos va por `DEADLINE_CALCULATOR`, hoy un adaptador
 * provisorio de lunes a viernes (P-02); `deadlines` lo reemplazará.
 */
@Module({
  imports: [PeopleModule, LegalParametersModule, SharedModule],
  controllers: [CasesController],
  providers: [
    RegisterCase,
    RegisterProceduralAct,
    ProceduralActHttpMapper,
    { provide: DEADLINE_CALCULATOR, useClass: BusinessDaysDeadlineCalculatorAdapter },
    { provide: CASE_REPOSITORY, useClass: CasePrismaRepository },
  ],
})
export class CasesModule {}
