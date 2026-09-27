import { Inject, Injectable } from "@nestjs/common";
import { Role } from "../../domain/entities/role.entity";
import { User } from "../../domain/entities/user.entity";
import { UnknownRoleFilterError } from "../../domain/errors/identity.errors";
import {
  LAWYER_LOOKUP,
  LawyerLookupPort,
  LawyerSummary,
} from "../../domain/ports/lawyer-lookup.port";
import { ROLE_REPOSITORY, RoleRepository } from "../../domain/ports/role.repository";
import { USER_REPOSITORY, UserRepository } from "../../domain/ports/user.repository";

export type ListUsersQuery = {
  page: number;
  limit: number;
  search?: string;
  role?: string;
};

/** A user with everything the contract renders alongside it. */
export type ListedUser = {
  user: User;
  roles: Role[];
  lawyer: LawyerSummary | null;
};

export type ListUsersResult = {
  users: ListedUser[];
  totalItems: number;
};

/**
 * `GET /users` (§3.2) — one page of users with their roles and
 * linked professional record.
 *
 * The work here is assembling the page: the repository returns bare
 * aggregates, and each row still needs its role names and its
 * `lawyer` block. Both are resolved **in batch** — one call for every
 * role on the page, one for every lawyer — rather than per row, which
 * is what keeps a 20-user page at three queries instead of forty-one.
 */
@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    @Inject(LAWYER_LOOKUP) private readonly lawyerLookup: LawyerLookupPort,
  ) {}

  async execute(query: ListUsersQuery): Promise<ListUsersResult> {
    const roleId = await this.resolveRoleFilter(query.role);
    const search = query.search?.trim();

    const page = await this.users.search({
      page: query.page,
      limit: query.limit,
      search: search && search.length > 0 ? search : undefined,
      roleId,
    });

    const rolesById = await this.loadRoles(page.items);
    const lawyersById = await this.loadLawyers(page.items);

    return {
      users: page.items.map((user) => ({
        user,
        // Roles missing from the catalogue are skipped rather than
        // rendered as a gap: the list must not break because a role
        // row was removed out from under a user.
        roles: user.roleIds
          .map((id) => rolesById.get(id))
          .filter((role): role is Role => role !== undefined),
        lawyer:
          user.lawyerId === null
            ? null
            : lawyersById.get(user.lawyerId) ?? null,
      })),
      totalItems: page.totalItems,
    };
  }

  /**
   * Turns the contract's role *name* into the id the repository
   * filters on. An unknown name is rejected instead of quietly
   * returning an empty page — "no such role" and "no users with that
   * role" are different answers and the caller cannot tell them
   * apart from an empty list.
   */
  private async resolveRoleFilter(
    roleName: string | undefined,
  ): Promise<number | undefined> {
    if (roleName === undefined) {
      return undefined;
    }

    const [role] = await this.roleRepository.findByNames([roleName]);
    if (role === undefined) {
      throw new UnknownRoleFilterError(roleName);
    }

    return role.getId();
  }

  private async loadRoles(users: readonly User[]): Promise<Map<number, Role>> {
    const ids = [...new Set(users.flatMap((user) => [...user.roleIds]))];
    if (ids.length === 0) {
      return new Map();
    }

    const roles = await this.roleRepository.findByIds(ids);
    return new Map(roles.map((role) => [role.getId(), role]));
  }

  private async loadLawyers(
    users: readonly User[],
  ): Promise<Map<number, LawyerSummary>> {
    const ids = [
      ...new Set(
        users
          .map((user) => user.lawyerId)
          .filter((id): id is number => id !== null),
      ),
    ];

    return this.lawyerLookup.findSummaries(ids);
  }
}
