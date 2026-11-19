import { Inject, Injectable } from "@nestjs/common";
import { CLOCK, ClockPort } from "@shared/domain/clock.port";
import {
  REFRESH_TOKEN_STORE,
  RefreshTokenStore,
} from "../../domain/ports/refresh-token-store.port";
import { ROLE_REPOSITORY, RoleRepository } from "../../domain/ports/role.repository";
import { USER_REPOSITORY, UserRepository } from "../../domain/ports/user.repository";

const LAWYER_ROLE_NAME = "LAWYER";

export type UnlinkLawyerUserCommand = { lawyerId: number };

/**
 * HU15, D-133 — the user linked to a lawyer given de baja stops being a lawyer: the link goes
 * and so does the `LAWYER` role, or the user is given de baja if it was their only role
 * (contract V6, `DELETE /lawyers/{lawyerId}`, "El usuario vinculado").
 *
 * Coordinates and decides nothing: what losing the profile means for the user belongs to
 * {@link User.loseLawyerProfile}. It is called by `people` **inside the transaction of the
 * lawyer's baja**, through `LawyerUserPort`, so the user and the lawyer are written all together
 * or not at all. A lawyer holds at most one live account, so there is at most one user to find;
 * with none there is nothing to do. The sessions of a user who was given de baja are closed, as
 * `DeactivateUser` does (HU7). One who stays in force gets their new roles on the next refresh.
 *
 * Whether the `LAWYER` role exists is the seed's guarantee, not a user error: if it were
 * missing there would be no user holding it.
 */
@Injectable()
export class UnlinkLawyerUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(REFRESH_TOKEN_STORE) private readonly refreshTokens: RefreshTokenStore,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(command: UnlinkLawyerUserCommand): Promise<void> {
    const user = await this.users.findActiveByLawyerId(command.lawyerId);
    if (!user) {
      return;
    }

    const [lawyerRole] = await this.roles.findByNames([LAWYER_ROLE_NAME]);
    if (!lawyerRole) {
      throw new Error(`The role ${LAWYER_ROLE_NAME} does not exist: the roles are not seeded.`);
    }

    const outcome = user.loseLawyerProfile(lawyerRole.getId(), this.clock.now());
    await this.users.save(user);
    if (outcome === "DEACTIVATED") {
      await this.refreshTokens.revokeAllForUser(user.id);
    }
  }
}
