import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { CLIENT_LOOKUP } from '@subsystems/cases/core/domain/ports/client-lookup.port';
import { LAWYER_LOOKUP } from '@subsystems/cases/core/domain/ports/lawyer-lookup.port';
import { FindClientUseCase } from './core/application/use-cases/find-client.use-case';
import { FindLawyerUseCase } from './core/application/use-cases/find-lawyer.use-case';
import { FindLawyersUseCase } from './core/application/use-cases/find-lawyers.use-case';
import { ListClientsUseCase } from './core/application/use-cases/list-clients.use-case';
import { ListLawyersUseCase } from './core/application/use-cases/list-lawyers.use-case';
import { RegisterClientUseCase } from './core/application/use-cases/register-client.use-case';
import { RegisterLawyerUseCase } from './core/application/use-cases/register-lawyer.use-case';
import { CLIENT_REPOSITORY } from './core/domain/ports/client.repository';
import { LAWYER_REPOSITORY } from './core/domain/ports/lawyer.repository';
import { CasesClientLookupAdapter } from './infrastructure/acl/cases-client-lookup.adapter';
import { CasesLawyerLookupAdapter } from './infrastructure/acl/cases-lawyer-lookup.adapter';
import { ClientController } from './infrastructure/http/controllers/client.controller';
import { LawyerController } from './infrastructure/http/controllers/lawyer.controller';
import { PrismaClientRepository } from './infrastructure/persistence/prisma/prisma-client.repository';
import { PrismaLawyerRepository } from './infrastructure/persistence/prisma/prisma-lawyer.repository';

/**
 * Composition root of `people`. `exports` is the subsystem's public
 * surface: the lawyer use cases leave this module so `identity` can
 * resolve a `lawyerId` through its anti-corruption adapter, and the two
 * lookup tokens that `cases` defines (`LAWYER_LOOKUP`, `CLIENT_LOOKUP`)
 * leave it already implemented against the entities this subsystem owns.
 * Everything else — the repositories, the entities, the registration
 * use cases — stays private (§6.3).
 *
 * Note that the client *use cases* stay private on purpose:
 * `FindClientUseCase` throws instead of returning `null` because it
 * serves an HTTP 404, so it is the wrong shape for a cross-subsystem
 * lookup. `CasesClientLookupAdapter` goes to the repository instead.
 *
 * `SharedModule` is imported for the {@link CLOCK} token:
 * `RegisterClient` needs today's civil date for `clientSince`.
 */
@Module({
  imports: [SharedModule],
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
    // Adapters of the ports that `cases` defines to ask for people.
    { provide: LAWYER_LOOKUP, useClass: CasesLawyerLookupAdapter },
    { provide: CLIENT_LOOKUP, useClass: CasesClientLookupAdapter },
  ],
  exports: [
    FindLawyerUseCase,
    FindLawyersUseCase,
    RegisterLawyerUseCase,
    LAWYER_LOOKUP,
    CLIENT_LOOKUP,
  ],
})
export class PeopleModule {}
