import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";
import { FindLawyerUseCase } from "./core/application/use-cases/find-lawyer.use-case";
import { FindLawyersUseCase } from "./core/application/use-cases/find-lawyers.use-case";
import { ListLawyersUseCase } from "./core/application/use-cases/list-lawyers.use-case";
import { RegisterClientUseCase } from "./core/application/use-cases/register-client.use-case";
import { RegisterLawyerUseCase } from "./core/application/use-cases/register-lawyer.use-case";
import { CLIENT_REPOSITORY } from "./core/domain/ports/client.repository";
import { LAWYER_REPOSITORY } from "./core/domain/ports/lawyer.repository";
import { ClientController } from "./infrastructure/http/controllers/client.controller";
import { LawyerController } from "./infrastructure/http/controllers/lawyer.controller";
import { PrismaClientRepository } from "./infrastructure/persistence/prisma/prisma-client.repository";
import { PrismaLawyerRepository } from "./infrastructure/persistence/prisma/prisma-lawyer.repository";

/**
 * Composition root of `people`. `exports` is the subsystem's public
 * surface: only the lawyer use cases leave this module, so `identity`
 * can resolve a `lawyerId` through its anti-corruption adapter.
 * Everything else — the repositories, the entities, the registration
 * use cases — stays private (§6.3).
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
    { provide: LAWYER_REPOSITORY, useClass: PrismaLawyerRepository },
    { provide: CLIENT_REPOSITORY, useClass: PrismaClientRepository },
  ],
  exports: [FindLawyerUseCase, FindLawyersUseCase, RegisterLawyerUseCase],
})
export class PeopleModule {}
