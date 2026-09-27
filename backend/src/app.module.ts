import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "@shared/infrastructure/http/guards/jwt-auth.guard";
import { PermissionsGuard } from "@shared/infrastructure/http/guards/permissions.guard";
import { SharedModule } from "@shared/shared.module";
import { HealthModule } from "@subsystems/health/health.module";
import { IdentityModule } from "@subsystems/identity/identity.module";
import { validateEnv } from "./config/env.validation";
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module";

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
      envFilePath: ".env",
      // Aborts startup listing every missing variable at once, rather
      // than failing on whichever one happens to be read first.
      validate: validateEnv,
    }),
    PrismaModule,
    SharedModule,
    HealthModule,
    IdentityModule,
  ],

  providers: [
    /**
     * Registration order is load-bearing. Global guards run in the
     * order they are declared, and the permissions guard reads the
     * actor that the authentication guard attaches to the request.
     * Reversed, every route requiring a permission would answer 401
     * instead of evaluating what the caller may do — and the symptom
     * would look like a token problem rather than a wiring mistake.
     */
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
