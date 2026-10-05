import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
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

/**
 * Root composition module: it imports the configuration module, Prisma,
 * the shared kernel and the subsystems, and holds nothing of its own.
 *
 * The two global guards are the single exception to that rule. They
 * live in the shared kernel but cannot be registered there: the
 * authentication guard depends on a token provided by the identity
 * subsystem, and that subsystem already imports the kernel, so binding
 * the guards inside the kernel would close a cycle between the two
 * modules. This is the only place where both sides are visible at once.
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
    PrismaModule,
    SharedModule,
    HealthModule,
    PeopleModule,
    IdentityModule,
    LegalParametersModule,
    CasesModule,
  ],
  controllers: [],
  providers: [
    // Registration order is load bearing: Nest runs global guards in the
    // order they are declared, and `PermissionsGuard` reads the actor
    // that `JwtAuthGuard` puts on the request. Inverted, every 403 would
    // surface as a 401 instead.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
