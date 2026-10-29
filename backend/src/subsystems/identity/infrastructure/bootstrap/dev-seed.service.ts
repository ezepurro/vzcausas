import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from "@subsystems/identity/core/domain/ports/password-hasher.port";
import { Username } from "@subsystems/identity/core/domain/value-objects/username.vo";

/** Administrator, matching the role catalog written by the seed script. */
const SEED_ROLE_NAME = "ADMINISTRATOR";

/**
 * Professional record for the seeded account.
 *
 * It exists because a user holding the administrator or lawyer role is
 * required to reference one. The entity does not enforce that rule — it
 * only receives a numeric id — so seeding a null link would succeed and
 * quietly produce a development fixture that breaks a documented
 * invariant, right where later work will start reading data.
 *
 * Creating it here means this service writes a row belonging to another
 * subsystem, which the data-ownership rule otherwise forbids. The
 * exception is deliberate and confined to development bootstrap: the
 * invariant being satisfied spans two subsystems, so a fixture that
 * honours it cannot be built from inside one. Nothing at runtime takes
 * this path.
 */
const SEED_LAWYER = {
  lastName: "Administrator",
  firstName: "Development",
  registrationNumber: "0-00000",
};

/**
 * Creates one usable account at startup, in development only.
 *
 * It exists because no endpoint creates users yet: without it, a fresh
 * database holds no credential the login endpoint would accept, so the
 * authentication flow cannot be exercised at all.
 *
 * The environment gate is the entire security argument. A known
 * account with a known password is precisely what must never exist in
 * production, so the check is the first statement of the method and no
 * variable can override it.
 *
 * Writes through Prisma rather than through the repository port: the
 * port describes what the use cases need, and no use case creates
 * users. Reaching for the client directly keeps that boundary honest
 * instead of widening the port for a development convenience.
 */
@Injectable()
export class DevSeedService implements OnModuleInit {
  private readonly logger = new Logger(DevSeedService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>("NODE_ENV") !== "development") {
      return;
    }

    const rawUsername = this.config.get<string>("DEV_SEED_USERNAME");
    const password = this.config.get<string>("DEV_SEED_PASSWORD");

    // Optional on purpose: a developer who does not need to log in is
    // never blocked from booting. The warning is loud because the
    // symptom otherwise is a 401 on every credential, which reads like
    // a bug in the authentication code rather than a variable nobody
    // set.
    if (!rawUsername || !password) {
      this.logger.warn(
        "DEV_SEED_USERNAME / DEV_SEED_PASSWORD are not set — no user was seeded. " +
          "POST /auth/login will reject every credential until one exists.",
      );
      return;
    }

    // Seeding a user whose role does not exist would produce an
    // account that authenticates and then fails resolving its roles —
    // a 500 on login, which looks like a defect rather than a missing
    // setup step.
    const role = await this.prisma.role.findUnique({
      where: { name: SEED_ROLE_NAME },
    });

    if (!role) {
      this.logger.warn(
        `Role ${SEED_ROLE_NAME} is not in the database — skipping the development user. ` +
          "Run `npm run prisma:seed` to load the role catalog first.",
      );
      return;
    }

    // Normalizing through the value object rather than trusting the
    // variable: the column stores the normalized form, so seeding a
    // raw value would create a row that no login lookup can match.
    const username = Username.create(rawUsername).toString();
    const passwordHash = await this.hasher.hash(password);

    const lawyer = await this.prisma.lawyer.upsert({
      where: { registrationNumber: SEED_LAWYER.registrationNumber },
      update: {},
      create: SEED_LAWYER,
    });

    const user = await this.prisma.user.upsert({
      where: { username },
      // Idempotent across restarts, and the password is refreshed so
      // that editing the variable takes effect without a manual wipe.
      update: { passwordHash, active: true, deletedAt: null, lawyerId: lawyer.id },
      create: {
        username,
        passwordHash,
        lastName: SEED_LAWYER.lastName,
        firstName: SEED_LAWYER.firstName,
        email: `${username}@estudio.local`,
        lawyerId: lawyer.id,
      },
    });

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    this.logger.log(
      `Seeded development user "${username}" (id ${user.id}, role ${SEED_ROLE_NAME}).`,
    );
  }
}
