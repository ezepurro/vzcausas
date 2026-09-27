import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User } from "@subsystems/identity/core/domain/entities/user.entity";
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from "@subsystems/identity/core/domain/ports/password-hasher.port";
import { Email } from "@subsystems/identity/core/domain/value-objects/email.vo";
import { Username } from "@subsystems/identity/core/domain/value-objects/username.vo";
import { InMemoryUserRepository } from "../persistence/in-memory/in-memory-user.repository";

const SEED_USER_ID = 1;

/** ADMINISTRATOR, per the catalog in `InMemoryRoleRepository` (D-62). */
const SEED_ROLE_IDS = [1] as const;

/**
 * Placeholder. D-25 requires a `lawyerId` for any user holding
 * ADMINISTRATOR or LAWYER, and `/lawyers` does not exist yet (HU4+).
 * The entity does not enforce the cross-invariant (D-19), so seeding
 * `null` would compile — and would plant a record that violates a
 * documented rule right where HU4 will start reading data.
 */
const SEED_LAWYER_ID = 1;

/**
 * Creates one usable account at startup, in development only (D-63).
 *
 * It exists because the in-memory repositories start empty (D-44) and
 * `POST /users` belongs to HU4: without this, a fresh checkout has no
 * credential that `POST /auth/login` would accept, and the endpoint
 * cannot be exercised at all.
 *
 * The `NODE_ENV` gate is the whole security argument. A known account
 * with a known password is exactly the thing that must not exist in
 * production, so the check is the first statement and there is no
 * environment variable that can override it.
 *
 * It injects the concrete {@link InMemoryUserRepository} rather than
 * the `USER_REPOSITORY` port because `seed()` deliberately lives
 * outside the port's contract (D-44). The coupling is intentional and
 * disappears with the class in P-15. It is also why the module binds
 * the port with `useExisting` (D-66): with `useClass` this service
 * would seed a different instance from the one the use cases read,
 * and login would fail with no error anywhere.
 */
@Injectable()
export class DevSeedService implements OnModuleInit {
  private readonly logger = new Logger(DevSeedService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly users: InMemoryUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>("NODE_ENV") !== "development") {
      return;
    }

    const username = this.config.get<string>("DEV_SEED_USERNAME");
    const password = this.config.get<string>("DEV_SEED_PASSWORD");

    // Optional on purpose: these are not in the mandatory set of §6,
    // so a developer who does not need to log in is not blocked from
    // booting. The warning is loud because the symptom otherwise is a
    // 401 on every credential, which looks like a bug in the auth code.
    if (!username || !password) {
      this.logger.warn(
        "DEV_SEED_USERNAME / DEV_SEED_PASSWORD are not set — no user was seeded. " +
          "POST /auth/login will reject every credential until one exists.",
      );
      return;
    }

    // Any violation here (malformed username, password below the D-24
    // policy) throws and aborts the bootstrap. That is the intended
    // behaviour: a seed that silently failed would present as a broken
    // login, which is far harder to trace than a startup error.
    const user = await User.create(
      {
        id: SEED_USER_ID,
        username: Username.create(username),
        plainPassword: password,
        fullName: "Development Administrator",
        email: Email.create(`${username}@vzcausas.local`),
        roleIds: [...SEED_ROLE_IDS],
        lawyerId: SEED_LAWYER_ID,
      },
      this.hasher,
    );

    this.users.seed(user);

    this.logger.log(
      `Seeded development user "${username}" (id ${SEED_USER_ID}, role ADMINISTRATOR).`,
    );
  }
}
