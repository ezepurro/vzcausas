import { Module } from "@nestjs/common";
import { PeopleModule } from "@subsystems/people/people.module";
import { DeactivateUserUseCase } from "./core/application/use-cases/deactivate-user.use-case";
import { GetUserUseCase } from "./core/application/use-cases/get-user.use-case";
import { RegisterUserUseCase } from "./core/application/use-cases/register-user.use-case";
import { UpdateUserUseCase } from "./core/application/use-cases/update-user.use-case";
import { LAWYER_LOOKUP } from "./core/domain/ports/lawyer-lookup.port";
import { PASSWORD_HASHER } from "./core/domain/ports/password-hasher.port";
import { REFRESH_TOKEN_STORE } from "./core/domain/ports/refresh-token-store.port";
import { ROLE_REPOSITORY } from "./core/domain/ports/role.repository";
import { USER_REPOSITORY } from "./core/domain/ports/user.repository";
import { PeopleLawyerLookupAdapter } from "./infrastructure/acl/lawyer-lookup.adapter";
import { BcryptPasswordHasherAdapter } from "./infrastructure/external/bcrypt-password-hasher.adapter";
import { NoopRefreshTokenStoreAdapter } from "./infrastructure/external/noop-refresh-token-store.adapter";
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
  // `people` exports only its FindLawyer use case; the ACL adapter
  // below is what consumes it.
  imports: [PeopleModule],
  controllers: [UserController],
  providers: [
    RegisterUserUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    DeactivateUserUseCase,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
    { provide: LAWYER_LOOKUP, useClass: PeopleLawyerLookupAdapter },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasherAdapter },
    // TODO(EP-01): reemplazar por el store real cuando mergee feat/auth.
    { provide: REFRESH_TOKEN_STORE, useClass: NoopRefreshTokenStoreAdapter },
  ],
})
export class IdentityModule {}
