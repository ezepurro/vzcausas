import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "@shared/infrastructure/http/guards/jwt-auth.guard";
import { PermissionsGuard } from "@shared/infrastructure/http/guards/permissions.guard";
import { SharedModule } from "@shared/shared.module";
import { HealthModule } from "@subsystems/health/health.module";
import { PrismaModule } from "./shared/infrastructure/prisma/prisma.module";
import { IdentityModule } from "./subsystems/identity/identity.module";
import { PeopleModule } from "./subsystems/people/people.module";

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
    }),
    PrismaModule,
    SharedModule,
    HealthModule,
    PeopleModule,
    IdentityModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
