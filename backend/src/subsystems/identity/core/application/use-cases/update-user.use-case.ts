import { Inject, Injectable } from "@nestjs/common";
import { Role } from "../../domain/entities/role.entity";
import { User } from "../../domain/entities/user.entity";
import {
  EmailAlreadyExistsError,
  EmptyUpdateRequestError,
  InvalidRoleError,
  LawyerAlreadyLinkedError,
  LastAdministratorError,
  LawyerLinkNotAllowedError,
  LawyerLinkRequiredError,
  LawyerNotFoundError,
  UsernameAlreadyExistsError,
  UserNotFoundError,
} from "../../domain/errors/identity.errors";
import {
  LAWYER_LOOKUP,
  LawyerLookupPort,
  LawyerSummary,
} from "../../domain/ports/lawyer-lookup.port";
import { ROLE_REPOSITORY, RoleRepository } from "../../domain/ports/role.repository";
import { USER_REPOSITORY, UserRepository } from "../../domain/ports/user.repository";
import { Email } from "../../domain/value-objects/email.vo";
import { Username } from "../../domain/value-objects/username.vo";

const LAWYER_ROLE_NAME = "LAWYER";
const ADMINISTRATOR_ROLE_NAME = "ADMINISTRATOR";

export type UpdateUserCommand = {
  id: number;
  username?: string;
  lastName?: string;
  firstName?: string;
  email?: string;
  roles?: readonly string[];
  // Three-state, unlike the other fields: `undefined` = don't touch,
  // `null` = unlink, a number = link/relink. The mapper must preserve
  // this distinction — see UserHttpMapper.toUpdateCommand.
  lawyerId?: number | null;
};

export type UpdateUserResult = {
  user: User;
  roles: Role[];
  lawyer: LawyerSummary | null;
};

/**
 * HU6 — partially updates a user. Does not touch the password
 * (`PATCH /auth/password` owns that). Re-derives the LAWYER↔lawyerId
 * cross-invariant against the user's FINAL state (existing values for
 * any field the caller omitted), the same way `RegisterUser` does for
 * a fresh user — see that use case and `User.create`'s docstring.
 */
@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    @Inject(LAWYER_LOOKUP) private readonly lawyerLookup: LawyerLookupPort,
  ) {}

  async execute(command: UpdateUserCommand): Promise<UpdateUserResult> {
    if (
      command.username === undefined &&
      command.lastName === undefined &&
      command.firstName === undefined &&
      command.email === undefined &&
      command.roles === undefined &&
      command.lawyerId === undefined
    ) {
      throw new EmptyUpdateRequestError();
    }

    const user = await this.users.findById(command.id);
    if (!user || !user.isActive()) {
      throw new UserNotFoundError(command.id);
    }

    // Captured before any mutation: `user.changeRoles` below replaces
    // the set in place, and CA-6.3 needs to know what the user held
    // when the request arrived.
    const previousRoleIds = [...user.roleIds];

    if (command.username !== undefined) {
      const newUsername = Username.create(command.username);
      if (await this.users.existsByUsername(newUsername, user.id)) {
        throw new UsernameAlreadyExistsError();
      }
      user.changeUsername(newUsername);
    }

    if (command.email !== undefined) {
      const newEmail = Email.create(command.email);
      if (await this.users.existsByEmail(newEmail, user.id)) {
        throw new EmailAlreadyExistsError();
      }
      user.changeEmail(newEmail);
    }

    if (command.lastName !== undefined || command.firstName !== undefined) {
      user.rename({ lastName: command.lastName, firstName: command.firstName });
    }

    let finalRoles: Role[];
    if (command.roles !== undefined) {
      finalRoles = await this.roleRepository.findByNames(command.roles);
      if (finalRoles.length !== command.roles.length) {
        throw new InvalidRoleError(command.roles);
      }
      await this.assertKeepsAnAdministrator(previousRoleIds, finalRoles);
      user.changeRoles(finalRoles.map((role) => role.getId()));
    } else {
      finalRoles = await this.roleRepository.findByIds(user.roleIds);
    }

    if (command.lawyerId !== undefined) {
      user.changeLawyerId(command.lawyerId);
    }

    const includesLawyer = finalRoles.some(
      (role) => role.getName() === LAWYER_ROLE_NAME,
    );
    if (includesLawyer && user.lawyerId === null) {
      throw new LawyerLinkRequiredError();
    }

    if (!includesLawyer && user.lawyerId !== null) {
      // Asking to point at a lawyer while not holding the role is a
      // contradiction the caller has to resolve, so it still fails.
      if (command.lawyerId !== undefined && command.lawyerId !== null) {
        throw new LawyerLinkNotAllowedError();
      }

      // CA-6.4 — dropping the LAWYER role unlinks the professional
      // record on its own: "si se le quita el perfil, se desvincula la
      // ficha". Requiring the caller to also send `lawyerId: null`
      // turned the documented behaviour into an error, so removing a
      // lawyer's role failed unless you knew to unlink by hand.
      //
      // Only the link is dropped. The lawyer stays exactly as it was —
      // that record belongs to `people` and the rest of the criterion
      // is explicit that it is not deactivated here.
      user.changeLawyerId(null);
    }
    // Only re-validate against `people` when this request actually
    // changes lawyerId — an unchanged link was already valid when it
    // was first set, and re-checking it on every unrelated edit would
    // turn a deactivated lawyer into a wall the user cannot get past
    // while fixing, say, a typo in their email.
    if (command.lawyerId !== undefined && command.lawyerId !== null) {
      if (!(await this.lawyerLookup.existsById(command.lawyerId))) {
        throw new LawyerNotFoundError(command.lawyerId);
      }

      // A lawyer holds at most one live account. The user's own link
      // is excluded, so re-sending the same lawyerId is a no-op
      // rather than a conflict with itself.
      if (
        await this.users.existsActiveByLawyerId(command.lawyerId, user.id)
      ) {
        throw new LawyerAlreadyLinkedError(command.lawyerId);
      }
    }

    await this.users.save(user);

    return {
      user,
      roles: finalRoles,
      lawyer: await this.resolveLawyer(user.lawyerId),
    };
  }

  /**
   * The contract embeds the linked professional record under
   * `user.lawyer` (§3.2), so a write answers with the same shape a
   * read would return.
   */
  private async resolveLawyer(
    lawyerId: number | null,
  ): Promise<LawyerSummary | null> {
    if (lawyerId === null) {
      return null;
    }

    const summaries = await this.lawyerLookup.findSummaries([lawyerId]);
    return summaries.get(lawyerId) ?? null;
  }

  /**
   * CA-6.3 — *"el sistema nunca puede quedar sin administrador"*.
   *
   * Fires only when the request would actually **strip** the
   * ADMINISTRATOR role from the last active administrator. Editing
   * that administrator in a way that keeps the role (adding
   * SECRETARY alongside it, say) is allowed: it leaves the system
   * administered, which is what the criterion protects. Reading it as
   * "the last administrator is frozen entirely" would also forbid
   * harmless edits, and the criterion states the reason plainly
   * enough to prefer the narrower rule. Worth confirming with the
   * team if they meant the stricter one.
   */
  private async assertKeepsAnAdministrator(
    previousRoleIds: readonly number[],
    finalRoles: readonly Role[],
  ): Promise<void> {
    const [administrator] = await this.roleRepository.findByNames([
      ADMINISTRATOR_ROLE_NAME,
    ]);
    if (!administrator || !previousRoleIds.includes(administrator.getId())) {
      return;
    }

    const keepsAdministrator = finalRoles.some(
      (role) => role.getName() === ADMINISTRATOR_ROLE_NAME,
    );
    if (keepsAdministrator) {
      return;
    }

    const activeAdministrators = await this.users.countActiveByRoleName(
      ADMINISTRATOR_ROLE_NAME,
    );
    if (activeAdministrators <= 1) {
      throw new LastAdministratorError("update");
    }
  }
}
