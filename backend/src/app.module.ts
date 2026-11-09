import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { parseTtlToSeconds } from './config/parse-ttl';
import { AppThrottlerGuard } from '@shared/infrastructure/http/guards/throttler.guard';
import { JwtAuthGuard } from '@shared/infrastructure/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@shared/infrastructure/http/guards/permissions.guard';
import { EventsModule } from '@shared/infrastructure/events/events.module';
import { HttpKernelModule } from '@shared/infrastructure/http/http-kernel.module';
import { LoggingModule } from '@shared/infrastructure/logging/logging.module';
import { HealthModule } from '@subsystems/health/health.module';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { IdentityModule } from './subsystems/identity/identity.module';
import { PeopleModule } from './subsystems/people/people.module';
import { LegalParametersModule } from './subsystems/legal-parameters/legal-parameters.module';
import { CasesModule } from './subsystems/cases/case.module';
import { ReportingModule } from './subsystems/reporting/reporting.module';
import { DeadlinesModule } from './subsystems/deadlines/deadlines.module';
import { DocumentsModule } from './subsystems/documents/documents.module';

/**
 * `deadlines` (HU30/HU32) needs a Google OAuth client and two secrets
 * — `GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN`, `MANAGEMENT_MAILBOX`,
 * `INTERNAL_TRIGGER_SECRET` — that most `.env` files do not have yet
 * (`IMPLEMENTACION_NOTIFICACIONES.md`, paso 11). `env.validation.ts`
 * cannot require them unconditionally: that would stop the whole app
 * from booting for anyone without that setup, even when their work has
 * nothing to do with HU30/HU32.
 *
 * So `DeadlinesModule` is imported only when its own configuration is
 * present, checked directly against `process.env` because this runs
 * at module-definition time, before `ConfigModule` exists. Without it:
 * the app boots exactly as it did before this subsystem existed,
 * `/internal/deadlines/*` is simply not there. With it: the subsystem
 * is live. Nothing to flip by hand — it just follows whatever is
 * already in `.env`.
 */
const DEADLINES_REQUIRED_VARS = [
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_OAUTH_REFRESH_TOKEN',
  'MANAGEMENT_MAILBOX',
  'INTERNAL_TRIGGER_SECRET',
] as const;

const missingDeadlinesVars = DEADLINES_REQUIRED_VARS.filter(
  (name) => !process.env[name] || process.env[name]!.trim().length === 0,
);

if (missingDeadlinesVars.length > 0) {
  Logger.warn(
    `DeadlinesModule no se carga: faltan ${missingDeadlinesVars.join(', ')} en el entorno. ` +
      'Normal fuera de un entorno configurado para HU30/HU32 — ver IMPLEMENTACION_NOTIFICACIONES.md, paso 11.',
    'AppModule',
  );
}

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
    // Integration events between subsystems (in-memory for now).
    EventEmitterModule.forRoot(),
    EventsModule,
    PrismaModule,
    LoggingModule,
    HttpKernelModule,
    HealthModule,
    PeopleModule,
    IdentityModule,
    LegalParametersModule,
    CasesModule,
    ReportingModule,
    DocumentsModule,
    ...(missingDeadlinesVars.length === 0 ? [DeadlinesModule] : []),
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
