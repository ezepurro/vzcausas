import { Module } from "@nestjs/common";
import { FindLawyerUseCase } from "./core/application/use-cases/find-lawyer.use-case";
import { FindLawyersUseCase } from "./core/application/use-cases/find-lawyers.use-case";
import { ListLawyersUseCase } from "./core/application/use-cases/list-lawyers.use-case";
import { RegisterLawyerUseCase } from "./core/application/use-cases/register-lawyer.use-case";
import { LAWYER_REPOSITORY } from "./core/domain/ports/lawyer.repository";
import { LawyerController } from "./infrastructure/http/controllers/lawyer.controller";
import { PrismaLawyerRepository } from "./infrastructure/persistence/prisma/prisma-lawyer.repository";

/**
 * Composition root of `people`. `exports` is the subsystem's public
 * surface: only {@link FindLawyerUseCase} leaves this module, so
 * `identity` can resolve a `lawyerId` through its anti-corruption
 * adapter. Everything else — the repository, the entity, the
 * registration use case — stays private (§6.3).
 */
@Module({
  controllers: [LawyerController],
  providers: [
    RegisterLawyerUseCase,
    ListLawyersUseCase,
    FindLawyerUseCase,
    FindLawyersUseCase,
    { provide: LAWYER_REPOSITORY, useClass: PrismaLawyerRepository },
  ],
  exports: [FindLawyerUseCase, FindLawyersUseCase],
})
export class PeopleModule {}
