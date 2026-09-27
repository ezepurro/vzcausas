import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ACCESS_TOKEN_VERIFIER } from "@shared/domain/access-token-verifier.port";
import { SharedModule } from "@shared/shared.module";
import { PeopleModule } from "@subsystems/people/people.module";
import { AuthenticateUserUseCase } from "./core/application/use-cases/authenticate-user.use-case";
import { ChangePasswordUseCase } from "./core/application/use-cases/change-password.use-case";
import { DeactivateUserUseCase } from "./core/application/use-cases/deactivate-user.use-case";
import { GetUserUseCase } from "./core/application/use-cases/get-user.use-case";
import { ListUsersUseCase } from "./core/application/use-cases/list-users.use-case";
import { LogoutUseCase } from "./core/application/use-cases/logout.use-case";
import { RefreshSessionUseCase } from "./core/application/use-cases/refresh-session.use-case";
import { RegisterUserUseCase } from "./core/application/use-cases/register-user.use-case";
import { UpdateUserUseCase } from "./core/application/use-cases/update-user.use-case";
import { LAWYER_LOOKUP } from "./core/domain/ports/lawyer-lookup.port";
import { PASSWORD_HASHER } from "./core/domain/ports/password-hasher.port";
import { REFRESH_TOKEN_STORE } from "./core/domain/ports/refresh-token-store.port";
import { ROLE_REPOSITORY } from "./core/domain/ports/role.repository";
import { TOKEN_ISSUER } from "./core/domain/ports/token-issuer.port";
import { USER_REPOSITORY } from "./core/domain/ports/user.repository";
import { AccessTokenVerifierAdapter } from "./infrastructure/acl/access-token-verifier.adapter";
import { PeopleLawyerLookupAdapter } from "./infrastructure/acl/lawyer-lookup.adapter";
import { DevSeedService } from "./infrastructure/bootstrap/dev-seed.service";
import { BcryptPasswordHasherAdapter } from "./infrastructure/external/bcrypt-password-hasher.adapter";
import { JwtTokenIssuerAdapter } from "./infrastructure/external/jwt-token-issuer.adapter";
import { AuthController } from "./infrastructure/http/controllers/auth.controller";
import { UserController } from "./infrastructure/http/controllers/user.controller";
import { AuthHttpMapper } from "./infrastructure/http/mappers/auth-http.mapper";
import { RefreshCookieOptions } from "./infrastructure/http/refresh-cookie.options";
import { PrismaRefreshTokenStore } from "./infrastructure/persistence/prisma/prisma-refresh-token-store.adapter";
import { PrismaRoleRepository } from "./infrastructure/persistence/prisma/prisma-role.repository";
import { PrismaUserRepository } from "./infrastructure/persistence/prisma/prisma-user.repository";

/**
 * Composition point of the identity subsystem: it binds each port to
 * the implementation that satisfies it, declares the subsystem's
 * controllers, and exports what the rest of the application consumes.
 * No behaviour lives here.
 *
 * The subsystem covers two groups of stories that were built in
 * parallel and meet in this file: session handling (login, refresh,
 * logout, password change) and user administration. They share the
 * user and role repositories, the password hasher and the entity, so
 * the bindings below are deliberately a single set rather than two.
 *
 * `PrismaModule` is `@Global()`, so `PrismaService` reaches the
 * adapters without an explicit import here.
 *
 * The empty `JwtModule.register({})` is intentional: the token adapter
 * passes secret, algorithm and expiry explicitly on every call, so a
 * module-level configuration would be dead weight and a second place
 * where the signing options could silently drift out of sync.
 */
@Module({
  imports: [
    // Provides the clock injected by the use cases and by the refresh
    // token store.
    SharedModule,
    JwtModule.register({}),
    // `people` exports only its FindLawyer use case; the ACL adapter
    // below is what consumes it.
    PeopleModule,
  ],

  controllers: [AuthController, UserController],

  providers: [
    // --- Port bindings ---
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasherAdapter },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuerAdapter },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
    { provide: REFRESH_TOKEN_STORE, useClass: PrismaRefreshTokenStore },
    { provide: LAWYER_LOOKUP, useClass: PeopleLawyerLookupAdapter },

    // The kernel declares this port in its own vocabulary; this
    // subsystem supplies the adapter that translates its token format
    // into the actor the kernel expects. Nothing needs the concrete
    // class, so binding it directly is fine here.
    { provide: ACCESS_TOKEN_VERIFIER, useClass: AccessTokenVerifierAdapter },

    // --- Use cases: sesión ---
    AuthenticateUserUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    ChangePasswordUseCase,

    // --- Use cases: administración de usuarios ---
    RegisterUserUseCase,
    GetUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    DeactivateUserUseCase,

    // --- HTTP support ---
    AuthHttpMapper,
    RefreshCookieOptions,

    // --- Development bootstrap (no-op outside development) ---
    DevSeedService,
  ],

  /**
   * The authentication guard is registered globally at the root module
   * and resolves its dependencies from that injector, so this token has
   * to cross the module boundary. Exporting it is what makes
   * authentication effective for every route in the application, not
   * just for the ones this subsystem declares.
   */
  exports: [ACCESS_TOKEN_VERIFIER],
})
export class IdentityModule {}
