import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ACCESS_TOKEN_VERIFIER } from "@shared/domain/access-token-verifier.port";
import { SharedModule } from "@shared/shared.module";
import { AuthenticateUserUseCase } from "./core/application/use-cases/authenticate-user.use-case";
import { ChangePasswordUseCase } from "./core/application/use-cases/change-password.use-case";
import { LogoutUseCase } from "./core/application/use-cases/logout.use-case";
import { RefreshSessionUseCase } from "./core/application/use-cases/refresh-session.use-case";
import { PASSWORD_HASHER } from "./core/domain/ports/password-hasher.port";
import { REFRESH_TOKEN_STORE } from "./core/domain/ports/refresh-token-store.port";
import { ROLE_REPOSITORY } from "./core/domain/ports/role.repository";
import { TOKEN_ISSUER } from "./core/domain/ports/token-issuer.port";
import { USER_REPOSITORY } from "./core/domain/ports/user.repository";
import { AccessTokenVerifierAdapter } from "./infrastructure/acl/access-token-verifier.adapter";
import { DevSeedService } from "./infrastructure/bootstrap/dev-seed.service";
import { BcryptPasswordHasherAdapter } from "./infrastructure/external/bcrypt-password-hasher.adapter";
import { JwtTokenIssuerAdapter } from "./infrastructure/external/jwt-token-issuer.adapter";
import { AuthController } from "./infrastructure/http/controllers/auth.controller";
import { AuthHttpMapper } from "./infrastructure/http/mappers/auth-http.mapper";
import { RefreshCookieOptions } from "./infrastructure/http/refresh-cookie.options";
import { PrismaRefreshTokenStore } from "./infrastructure/persistence/prisma/prisma-refresh-token-store.adapter";
import { PrismaRoleRepository } from "./infrastructure/persistence/prisma/prisma-role.repository";
import { PrismaUserRepository } from "./infrastructure/persistence/prisma/prisma-user.repository";

/**
 * Composition point of the identity subsystem: it binds each port to
 * the implementation that satisfies it, declares the subsystem's
 * controller, and exports what the rest of the application consumes.
 * No behaviour lives here.
 *
 * Ports are bound with `useClass`. That is safe now that persistence
 * is a database: the adapters hold no state of their own, so a second
 * instance would read and write exactly the same rows. It was not safe
 * while the adapters kept their data in a `Map` — back then two
 * instances meant two disjoint stores and writes that silently went
 * nowhere, which is why those bindings had to alias a single provider.
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
  ],

  controllers: [AuthController],

  providers: [
    // --- Port bindings ---
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasherAdapter },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuerAdapter },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
    { provide: REFRESH_TOKEN_STORE, useClass: PrismaRefreshTokenStore },

    // The kernel declares this port in its own vocabulary; this
    // subsystem supplies the adapter that translates its token format
    // into the actor the kernel expects. Nothing needs the concrete
    // class, so binding it directly is fine here.
    { provide: ACCESS_TOKEN_VERIFIER, useClass: AccessTokenVerifierAdapter },

    // --- Use cases ---
    AuthenticateUserUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    ChangePasswordUseCase,

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
