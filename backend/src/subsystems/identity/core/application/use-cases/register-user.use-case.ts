import { Inject, Injectable } from "@nestjs/common";
import {
  TRANSACTION_MANAGER,
  TransactionManagerPort,
} from "@shared/domain/transaction-manager.port";
import { Role } from "../../domain/entities/role.entity";
import { User } from "../../domain/entities/user.entity";
import {
  EmailAlreadyExistsError,
  InvalidRoleError,
  LawyerAlreadyLinkedError,
  LawyerLinkNotAllowedError,
  LawyerLinkRequiredError,
  LawyerNotFoundError,
  UsernameAlreadyExistsError,
} from "../../domain/errors/identity.errors";
import {
  LAWYER_LOOKUP,
  LawyerLookupPort,
  LawyerSummary,
} from "../../domain/ports/lawyer-lookup.port";
import {
  LAWYER_REGISTRAR,
  LawyerRegistrarPort,
  NewLawyer,
} from "../../domain/ports/lawyer-registrar.port";
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
  lastName: string;
  firstName: string;
  email: string;
  plainPassword: string;
  roles: readonly string[];
  /** Links to an existing lawyer. Never sent together with `lawyer`. */
  lawyerId?: number | null;
  /** Registers the lawyer along with the user. Never sent with `lawyerId`. */
  lawyer?: NewLawyer;
};

export type RegisterUserResult = {
  user: User;
  roles: Role[];
  lawyer: LawyerSummary | null;
};

/**
 * HU4 — registers a new user (contract §3.2).
 *
 * The professional record arrives in one of two shapes: `lawyerId`
 * for one that already exists, or `lawyer` to create it here. The
 * request carries one or the other — the DTO rejects both together —
 * and whether either is required follows from the roles.
 *
 * When `lawyer` is sent, the two inserts are **atomic**: the contract
 * is explicit that a failure registering the user must not leave a
 * lawyer behind, because the client has no way to delete it and the
 * matrícula would then block the retry.
 *
 * Everything that only reads happens **before** the transaction opens
 * (§7.5, rule 2), so it stays as short as the two writes.
 */
@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    @Inject(LAWYER_LOOKUP) private readonly lawyerLookup: LawyerLookupPort,
    @Inject(LAWYER_REGISTRAR)
    private readonly lawyerRegistrar: LawyerRegistrarPort,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManagerPort,
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

    const resolvedRoles = await this.roleRepository.findByNames(command.roles);
    if (resolvedRoles.length !== command.roles.length) {
      throw new InvalidRoleError(command.roles);
    }

    const includesLawyer = resolvedRoles.some(
      (role) => role.getName() === LAWYER_ROLE_NAME,
    );
    const existingLawyerId = command.lawyerId ?? null;
    const newLawyer = command.lawyer;
    const hasLink = existingLawyerId !== null || newLawyer !== undefined;

    if (includesLawyer && !hasLink) {
      throw new LawyerLinkRequiredError();
    }
    if (!includesLawyer && hasLink) {
      throw new LawyerLinkNotAllowedError();
    }

    // Reading the existing lawyer is a validation, so it happens out
    // here rather than inside the transaction (§7.5, rule 2).
    let linkedLawyer: LawyerSummary | null = null;
    if (existingLawyerId !== null) {
      const summaries = await this.lawyerLookup.findSummaries([
        existingLawyerId,
      ]);
      linkedLawyer = summaries.get(existingLawyerId) ?? null;
      if (linkedLawyer === null) {
        throw new LawyerNotFoundError(existingLawyerId);
      }

      // A lawyer holds at most one live account. Checked here so the
      // caller gets the contract's 409 rather than the raw violation
      // of the partial unique index, which is what actually enforces
      // this under concurrency.
      if (await this.users.existsActiveByLawyerId(existingLawyerId)) {
        throw new LawyerAlreadyLinkedError(existingLawyerId);
      }
    }

    return this.transactions.runInTransaction(async () => {
      // Inside the transaction because it writes: if creating the user
      // fails below, this insert is rolled back with it.
      const lawyer =
        newLawyer !== undefined
          ? await this.lawyerRegistrar.register(newLawyer)
          : linkedLawyer;

      const id = await this.users.nextId();
      const user = await User.create(
        {
          id,
          username,
          plainPassword: command.plainPassword,
          lastName: command.lastName,
          firstName: command.firstName,
          email,
          roleIds: resolvedRoles.map((role) => role.getId()),
          lawyerId: lawyer?.id ?? null,
        },
        this.hasher,
      );

      await this.users.create(user);

      return { user, roles: resolvedRoles, lawyer };
    });
  }
}
