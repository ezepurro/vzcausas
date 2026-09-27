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
import { InMemoryRefreshTokenStore } from "./infrastructure/persistence/in-memory/in-memory-refresh-token-store.adapter";
import { InMemoryRoleRepository } from "./infrastructure/persistence/in-memory/in-memory-role.repository";
import { InMemoryUserRepository } from "./infrastructure/persistence/in-memory/in-memory-user.repository";

/**
 * Composition point of the identity subsystem: it binds each port to
 * the implementation that satisfies it, declares the subsystem's
 * controller, and exports what the rest of the application consumes.
 * No behaviour lives here.
 *
 * Every port is bound with `useExisting` rather than `useClass`.
 * `useClass` builds a separate instance per token, so an adapter that
 * someone also injects by its concrete type would exist twice: two
 * stores, two sets of data, and reads that never see what the other
 * instance wrote. Because the in-memory adapters keep their state in
 * the process, that duplication is completely silent — no error is
 * raised anywhere, requests simply behave as if nothing had been
 * stored. Registering each adapter once and aliasing its token avoids
 * the whole failure mode.
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
    // --- Adapters, registered once by their concrete class ---
    BcryptPasswordHasherAdapter,
    JwtTokenIssuerAdapter,
    InMemoryUserRepository,
    InMemoryRoleRepository,
    InMemoryRefreshTokenStore,

    // --- Port bindings ---
    { provide: PASSWORD_HASHER, useExisting: BcryptPasswordHasherAdapter },
    { provide: TOKEN_ISSUER, useExisting: JwtTokenIssuerAdapter },
    { provide: USER_REPOSITORY, useExisting: InMemoryUserRepository },
    { provide: ROLE_REPOSITORY, useExisting: InMemoryRoleRepository },
    { provide: REFRESH_TOKEN_STORE, useExisting: InMemoryRefreshTokenStore },

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
