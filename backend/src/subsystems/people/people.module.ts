import { Module, forwardRef } from '@nestjs/common';
import { ClockModule } from '@shared/infrastructure/clock/clock.module';
import { CasesModule } from '@subsystems/cases/case.module';
import { PEOPLE_LOOKUP } from '@subsystems/cases/core/domain/ports/case/people-lookup.port';
import { FindClientUseCase } from './core/application/use-cases/find-client.use-case';
import { FindLawyerUseCase } from './core/application/use-cases/find-lawyer.use-case';
import { FindLawyersUseCase } from './core/application/use-cases/find-lawyers.use-case';
import { ListClientsUseCase } from './core/application/use-cases/list-clients.use-case';
import { ListLawyersUseCase } from './core/application/use-cases/list-lawyers.use-case';
import { RegisterClientUseCase } from './core/application/use-cases/register-client.use-case';
import { RegisterLawyerUseCase } from './core/application/use-cases/register-lawyer.use-case';
import { CLIENT_REPOSITORY } from './core/domain/ports/client.repository';
import { LAWYER_REPOSITORY } from './core/domain/ports/lawyer.repository';
import { CasesPeopleLookupAdapter } from './infrastructure/acl/cases-people-lookup.adapter';
import { ClientController } from './infrastructure/http/controllers/client.controller';
import { LawyerController } from './infrastructure/http/controllers/lawyer.controller';
import { PrismaClientRepository } from './infrastructure/persistence/prisma/prisma-client.repository';
import { PrismaLawyerRepository } from './infrastructure/persistence/prisma/prisma-lawyer.repository';

/**
 * Composition root of `people`. `exports` is the subsystem's public
 * surface: the lawyer use cases, so `identity` can resolve a `lawyerId`
 * through its anti-corruption adapter, and the `PEOPLE_LOOKUP` adapter
 * that `cases` uses to find lawyers and clients.
 * Everything else — the repositories, the entities, the registration
 * use cases — stays private (§6.3).
 *
 * `ClockModule` is imported for the {@link CLOCK} token:
 * `RegisterClient` needs today's civil date for `clientSince`.
 */
@Module({
  imports: [ClockModule, forwardRef(() => CasesModule)],
  controllers: [LawyerController, ClientController],
  providers: [
    RegisterLawyerUseCase,
    ListLawyersUseCase,
    FindLawyerUseCase,
    FindLawyersUseCase,
    RegisterClientUseCase,
    ListClientsUseCase,
    FindClientUseCase,
    { provide: LAWYER_REPOSITORY, useClass: PrismaLawyerRepository },
    { provide: CLIENT_REPOSITORY, useClass: PrismaClientRepository },
    // Adapter of the port that `cases` defines to ask for lawyers and clients.
    { provide: PEOPLE_LOOKUP, useClass: CasesPeopleLookupAdapter },
  ],
  exports: [FindLawyerUseCase, FindLawyersUseCase, RegisterLawyerUseCase, PEOPLE_LOOKUP],
})
export class PeopleModule {}
