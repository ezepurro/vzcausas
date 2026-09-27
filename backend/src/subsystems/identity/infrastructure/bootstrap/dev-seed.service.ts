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

/** Administrator, matching the catalog held by the role repository. */
const SEED_ROLE_IDS = [1] as const;

/**
 * Placeholder. A user holding the administrator or lawyer role is
 * required to reference a professional record, and that resource does
 * not exist yet. The entity itself does not enforce the rule — it only
 * receives numeric ids — so seeding `null` would compile and quietly
 * plant a record that breaks an invariant, right where the user
 * management endpoints will later start reading data.
 */
const SEED_LAWYER_ID = 1;

/**
 * Creates one usable account at startup, in development only.
 *
 * It exists because the in-memory repositories start empty and no
 * endpoint creates users yet: without it, a fresh checkout holds no
 * credential the login endpoint would accept, so the authentication
 * flow cannot be exercised at all.
 *
 * The environment gate is the entire security argument. A known account
 * with a known password is precisely what must never exist in
 * production, so the check is the first statement of the method and no
 * variable can override it.
 *
 * It injects the concrete repository rather than the port because the
 * seeding hook deliberately sits outside the port's contract: no use
 * case seeds data, so the port does not describe it. The coupling is
 * intentional and disappears along with the class once persistence is
 * real. It is also why the module aliases the port to this very
 * instance instead of letting the container build a second one —
 * seeding one instance while the use cases read another would fail
 * login with no error surfacing anywhere.
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

    // Optional on purpose: these are not part of the mandatory set, so
    // a developer who does not need to log in is never blocked from
    // booting. The warning is loud because the symptom otherwise is a
    // 401 on every credential, which reads like a bug in the
    // authentication code rather than a variable nobody set.
    if (!username || !password) {
      this.logger.warn(
        "DEV_SEED_USERNAME / DEV_SEED_PASSWORD are not set — no user was seeded. " +
          "POST /auth/login will reject every credential until one exists.",
      );
      return;
    }

    // A malformed username or a password that fails the policy throws
    // here and aborts startup. That is the intended behaviour: a seed
    // that failed silently would surface later as a login rejecting the
    // only credential anyone has, which is far harder to trace than an
    // error on boot.
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
