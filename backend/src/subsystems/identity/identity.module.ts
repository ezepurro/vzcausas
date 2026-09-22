import { Module } from "@nestjs/common";
import { GetUserUseCase } from "./core/application/use-cases/get-user.use-case";
import { RegisterUserUseCase } from "./core/application/use-cases/register-user.use-case";
import { UpdateUserUseCase } from "./core/application/use-cases/update-user.use-case";
import { LAWYER_LOOKUP } from "./core/domain/ports/lawyer-lookup.port";
import { PASSWORD_HASHER } from "./core/domain/ports/password-hasher.port";
import { ROLE_REPOSITORY } from "./core/domain/ports/role.repository";
import { USER_REPOSITORY } from "./core/domain/ports/user.repository";
import { StubLawyerLookupAdapter } from "./infrastructure/acl/lawyer-lookup.adapter";
import { BcryptPasswordHasher } from "./infrastructure/external/bcrypt-password-hasher.adapter";
import { UserController } from "./infrastructure/http/controllers/user.controller";
import { PrismaRoleRepository } from "./infrastructure/persistence/prisma/prisma-role.repository";
import { PrismaUserRepository } from "./infrastructure/persistence/prisma/prisma-user.repository";

/**
 * Composition root of `identity` (§7.3 of the architecture doc): the
 * only place where a port meets its concrete implementation.
 * `PrismaModule` is `@Global()`, so `PrismaService` is available here
 * without an explicit import.
 */
@Module({
  controllers: [UserController],
  providers: [
    RegisterUserUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
    { provide: LAWYER_LOOKUP, useClass: StubLawyerLookupAdapter },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
  ],
})
export class IdentityModule {}
