import { Inject, Injectable } from "@nestjs/common";
import { Role } from "../../domain/entities/role.entity";
import { User } from "../../domain/entities/user.entity";
import {
  EmailAlreadyExistsError,
  EmptyUpdateRequestError,
  InvalidRoleError,
  LawyerLinkNotAllowedError,
  LawyerLinkRequiredError,
  LawyerNotFoundError,
  UsernameAlreadyExistsError,
  UserNotFoundError,
} from "../../domain/errors/identity.errors";
import {
  LAWYER_LOOKUP,
  LawyerLookupPort,
} from "../../domain/ports/lawyer-lookup.port";
import { ROLE_REPOSITORY, RoleRepository } from "../../domain/ports/role.repository";
import { USER_REPOSITORY, UserRepository } from "../../domain/ports/user.repository";
import { Email } from "../../domain/value-objects/email.vo";
import { Username } from "../../domain/value-objects/username.vo";

const LAWYER_ROLE_NAME = "LAWYER";

export type UpdateUserCommand = {
  id: number;
  username?: string;
  fullName?: string;
  email?: string;
  roles?: readonly string[];
  // Three-state, unlike the other fields: `undefined` = don't touch,
  // `null` = unlink, a number = link/relink. The mapper must preserve
  // this distinction — see UserHttpMapper.toUpdateCommand.
  lawyerId?: number | null;
};

export type UpdateUserResult = { user: User; roles: Role[] };

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
      command.fullName === undefined &&
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

    if (command.fullName !== undefined) {
      user.changeFullName(command.fullName);
    }

    let finalRoles: Role[];
    if (command.roles !== undefined) {
      finalRoles = await this.roleRepository.findByNames(command.roles);
      if (finalRoles.length !== command.roles.length) {
        throw new InvalidRoleError(command.roles);
      }
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
      throw new LawyerLinkNotAllowedError();
    }
    // Only re-validate against `people` when this request actually
    // changes lawyerId — an unchanged link was already valid when it
    // was first set, and re-checking it here would always fail today
    // (the lookup is a stub) even for updates that never touch it.
    if (
      command.lawyerId !== undefined &&
      command.lawyerId !== null &&
      !(await this.lawyerLookup.existsById(command.lawyerId))
    ) {
      throw new LawyerNotFoundError(command.lawyerId);
    }

    await this.users.save(user);

    return { user, roles: finalRoles };
  }
}
