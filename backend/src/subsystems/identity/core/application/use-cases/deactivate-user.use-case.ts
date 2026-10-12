import { Inject, Injectable } from "@nestjs/common";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import {
  LastAdministratorError,
  UserNotFoundError,
} from "../../domain/errors/identity.errors";
import {
  REFRESH_TOKEN_STORE,
  RefreshTokenStore,
} from "../../domain/ports/refresh-token-store.port";
import { ROLE_REPOSITORY, RoleRepository } from "../../domain/ports/role.repository";
import { USER_REPOSITORY, UserRepository } from "../../domain/ports/user.repository";

const ADMINISTRATOR_ROLE_NAME = "ADMINISTRATOR";

export type DeactivateUserCommand = { id: number };

/**
 * HU7 — logically deletes a user (RN12). The record survives with
 * `active: false`; for the client the user simply ceases to exist.
 *
 * Deactivating an already-deactivated user is rejected as "not
 * found", not as a no-op: per the API contract that user is already
 * invisible, so the caller must not be able to tell the difference
 * between "I just deleted it" and "it was already gone".
 *
 * Revoking the refresh tokens is part of the contract, not an extra:
 * *"No puede iniciar sesión, sus sesiones abiertas se cierran"*. It is
 * also what closes the gap `AccessTokenVerifierAdapter` cannot: that
 * adapter rejects this user's access token on their *next request*
 * because it re-reads `active` from the database every time (CA-7.3,
 * CA-6.2), but the refresh token is what would otherwise let them mint
 * a fresh access token and walk right back in. Revoking the family
 * here is what makes the rejection permanent instead of a 15-minute
 * delay.
 */
@Injectable()
export class DeactivateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    @Inject(REFRESH_TOKEN_STORE)
    private readonly refreshTokens: RefreshTokenStore,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(command: DeactivateUserCommand): Promise<void> {
    const user = await this.users.findById(command.id);
    if (!user || !user.isActive()) {
      throw new UserNotFoundError(command.id);
    }

    await this.assertNotLastAdministrator(user.roleIds);

    user.deactivate(this.clock.now());
    await this.users.save(user);
    await this.refreshTokens.revokeAllForUser(user.id);
  }

  /**
   * CA-7.4 — the system may never be left without an administrator,
   * so the last active one cannot be deactivated. The criterion
   * spells out *"incluso a sí mismo"*: there is no self-exception,
   * which falls out naturally here because the rule looks at the
   * target's roles and never at the caller's identity.
   *
   * Only pays for the count when the target actually is an
   * administrator — the common case is deactivating someone who is
   * not, and that must not cost an extra query.
   */
  private async assertNotLastAdministrator(
    roleIds: readonly number[],
  ): Promise<void> {
    const [administrator] = await this.roleRepository.findByNames([
      ADMINISTRATOR_ROLE_NAME,
    ]);
    if (!administrator || !roleIds.includes(administrator.getId())) {
      return;
    }

    const activeAdministrators = await this.users.countActiveByRoleName(
      ADMINISTRATOR_ROLE_NAME,
    );
    if (activeAdministrators <= 1) {
      throw new LastAdministratorError("deactivate");
    }
  }
}
