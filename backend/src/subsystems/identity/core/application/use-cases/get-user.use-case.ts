import { Inject, Injectable } from "@nestjs/common";
import { Role } from "../../domain/entities/role.entity";
import { User } from "../../domain/entities/user.entity";
import { UserNotFoundError } from "../../domain/errors/identity.errors";
import {
  LAWYER_LOOKUP,
  LawyerLookupPort,
  LawyerSummary,
} from "../../domain/ports/lawyer-lookup.port";
import { ROLE_REPOSITORY, RoleRepository } from "../../domain/ports/role.repository";
import { USER_REPOSITORY, UserRepository } from "../../domain/ports/user.repository";

export type GetUserQuery = { id: number };

export type GetUserResult = {
  user: User;
  roles: Role[];
  lawyer: LawyerSummary | null;
};

/**
 * HU5 — fetches a single user by id.
 *
 * A logically deleted user (RN12, `active: false`) must be
 * indistinguishable from a nonexistent one through this endpoint —
 * API contract §3.2 (`DELETE /users/{userId}`): *"no aparece en
 * ningún listado y `GET /users/{userId}` responde 404"*. Hence the
 * `isActive()` check below, not just a null check.
 */
@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    @Inject(LAWYER_LOOKUP) private readonly lawyerLookup: LawyerLookupPort,
  ) {}

  async execute(query: GetUserQuery): Promise<GetUserResult> {
    const user = await this.users.findById(query.id);
    if (!user || !user.isActive()) {
      throw new UserNotFoundError(query.id);
    }

    const roles = await this.roleRepository.findByIds(user.roleIds);
    return { user, roles, lawyer: await this.resolveLawyer(user.lawyerId) };
  }

  /**
   * The contract embeds the linked professional record under
   * `user.lawyer` (§3.2). A user without a link, or one whose lawyer
   * was deactivated, renders `null` — the lookup reports a logically
   * deleted record as absent.
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
}
