import { Inject, Injectable } from "@nestjs/common";
import { Role } from "../../domain/entities/role.entity";
import { User } from "../../domain/entities/user.entity";
import {
  EmailAlreadyExistsError,
  InvalidRoleError,
  LawyerLinkNotAllowedError,
  LawyerLinkRequiredError,
  LawyerNotFoundError,
  UsernameAlreadyExistsError,
} from "../../domain/errors/identity.errors";
import {
  LAWYER_LOOKUP,
  LawyerLookupPort,
} from "../../domain/ports/lawyer-lookup.port";
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from "../../domain/ports/password-hasher.port";
import { ROLE_REPOSITORY, RoleRepository } from "../../domain/ports/role.repository";
import { USER_REPOSITORY, UserRepository } from "../../domain/ports/user.repository";
import { Email } from "../../domain/value-objects/email.vo";
import { Username } from "../../domain/value-objects/username.vo";

const LAWYER_ROLE_NAME = "LAWYER";

export type RegisterUserCommand = {
  username: string;
  fullName: string;
  email: string;
  plainPassword: string;
  roles: readonly string[];
  lawyerId?: number | null;
};

export type RegisterUserResult = {
  user: User;
  roles: Role[];
};

/**
 * HU4 — registers a new user. Orchestrates: uniqueness checks, role
 * resolution, the LAWYER↔lawyerId cross-invariant (deliberately left
 * out of {@link User.create}, see its docstring), and persistence.
 *
 * The lawyer↔user link only supports an existing `lawyerId` for now.
 * `people` (owner of `Lawyer`, HU-12) does not exist yet, so
 * {@link LawyerLookupPort} is bound to a stub adapter that always
 * resolves "not found" — see `infrastructure/acl/lawyer-lookup.adapter.ts`.
 */
@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    @Inject(LAWYER_LOOKUP) private readonly lawyerLookup: LawyerLookupPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const username = Username.create(command.username);
    const email = Email.create(command.email);

    if (await this.users.existsByUsername(username)) {
      throw new UsernameAlreadyExistsError();
    }
    if (await this.users.existsByEmail(email)) {
      throw new EmailAlreadyExistsError();
    }

    const resolvedRoles = await this.roleRepository.findByNames(
      command.roles,
    );
    if (resolvedRoles.length !== command.roles.length) {
      throw new InvalidRoleError(command.roles);
    }

    const includesLawyer = resolvedRoles.some(
      (role) => role.getName() === LAWYER_ROLE_NAME,
    );
    const lawyerId = command.lawyerId ?? null;

    if (includesLawyer && lawyerId === null) {
      throw new LawyerLinkRequiredError();
    }
    if (!includesLawyer && lawyerId !== null) {
      throw new LawyerLinkNotAllowedError();
    }
    if (lawyerId !== null && !(await this.lawyerLookup.existsById(lawyerId))) {
      throw new LawyerNotFoundError(lawyerId);
    }

    const id = await this.users.nextId();
    const user = await User.create(
      {
        id,
        username,
        plainPassword: command.plainPassword,
        fullName: command.fullName,
        email,
        roleIds: resolvedRoles.map((role) => role.getId()),
        lawyerId,
      },
      this.hasher,
    );

    await this.users.create(user);

    return { user, roles: resolvedRoles };
  }
}
