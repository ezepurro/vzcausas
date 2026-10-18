import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { parseTtlToSeconds } from '@shared/config/parse-ttl';
import { AppThrottlerGuard } from '@shared/infrastructure/http/guards/throttler.guard';
import { JwtAuthGuard } from '@shared/infrastructure/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@shared/infrastructure/http/guards/permissions.guard';
import { SharedModule } from '@shared/shared.module';
import { HealthModule } from '@subsystems/health/health.module';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { IdentityModule } from './subsystems/identity/identity.module';
import { PeopleModule } from './subsystems/people/people.module';
import { LegalParametersModule } from './subsystems/legal-parameters/legal-parameters.module';
import { CasesModule } from './subsystems/cases/case.module';
import { ReportingModule } from './subsystems/reporting/reporting.module';

/**
 * Root composition module: it imports the configuration module, Prisma,
 * the shared kernel and the subsystems, and holds nothing of its own.
 *
 * The three global guards are the exception to that rule. They live in
 * the shared kernel but cannot be registered there: the authentication
 * guard depends on a token provided by the identity subsystem, and
 * that subsystem already imports the kernel, so binding the guards
 * inside the kernel would close a cycle between the two modules. This
 * is the only place where both sides are visible at once.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      // Reports every missing variable at once, before any provider is
      // constructed. Without this hook the adapters' `getOrThrow` calls
      // surface them one at a time, in provider instantiation order.
      validate: validateEnv,
    }),
    // The API-wide, generous per-IP ceiling (Q-03's "mitigación
    // mínima"). The stricter limit on `/auth/login` and `/auth/refresh`
    // is applied per-route via `@Throttle()` on `AuthController` — see
    // `throttle-policy.ts` for why that one is read differently.
    ThrottlerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: parseTtlToSeconds(config.getOrThrow<string>('THROTTLE_DEFAULT_WINDOW')) * 1000,
            limit: Number(config.getOrThrow<string>('THROTTLE_DEFAULT_LIMIT')),
          },
        ],
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    SharedModule,
    HealthModule,
    PeopleModule,
    IdentityModule,
    LegalParametersModule,
    CasesModule,
    ReportingModule,
  ],
  controllers: [],
  providers: [
    // Registration order is load bearing: Nest runs global guards in
    // the order they are declared.
    //
    // `AppThrottlerGuard` goes first and for a reason distinct from the
    // other two: it protects the *server*, not an account, so it has
    // to run before any work is done on the request's behalf —
    // including the JWT signature check `JwtAuthGuard` performs and,
    // further downstream, the bcrypt comparison a login attempt pays
    // for. A flood of garbage tokens or login guesses gets a 429
    // before the server spends CPU finding out each one is bad.
    //
    // `PermissionsGuard` reads the actor `JwtAuthGuard` puts on the
    // request, so inverting those two would surface every 403 as a
    // 401 instead.
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
