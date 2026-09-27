import { Injectable } from "@nestjs/common";
import { Role } from "@subsystems/identity/core/domain/entities/role.entity";
import { RoleRepository } from "@subsystems/identity/core/domain/ports/role.repository";
import { Permission } from "@subsystems/identity/core/domain/value-objects/permission.vo";

/**
 * The roles the application recognizes, with the permissions each one
 * grants.
 *
 * This is currently the only place where the permission matrix is
 * written down, which makes it the de facto specification until a
 * database seed takes over. Keep it aligned with the permission strings
 * the endpoints actually require: a permission that no role grants makes
 * an endpoint unreachable for everybody, and the failure surfaces as a
 * bare 403 with nothing explaining why.
 */
const ROLE_CATALOG: ReadonlyArray<{
  id: number;
  name: string;
  permissions: readonly string[];
}> = [
  {
    id: 1,
    name: "ADMINISTRATOR",
    permissions: [
      "user:manage",
      "lawyer:manage",
      "procedural-state:manage",
      "case:read",
    ],
  },
  { id: 2, name: "LAWYER", permissions: ["case:read", "case:change-status"] },
  { id: 3, name: "SECRETARY", permissions: ["case:read"] },
];

/**
 * Transitional role repository backed by a constant catalog. It ships as
 * production code rather than a test double, and gets replaced once
 * persistence is real.
 *
 * Unlike the user repository it exposes no seeding hook: roles are a
 * catalog, not user data, and nothing in this scope creates or edits
 * them. Shipping them preloaded means there is no bootstrap step anyone
 * can forget.
 */
@Injectable()
export class InMemoryRoleRepository implements RoleRepository {
  /**
   * Built through the creating factory rather than the rehydrating one:
   * this adapter authors the catalog instead of restoring it from a
   * store, so the creation invariants are the right ones to run. A typo
   * in the constant above then fails startup, instead of shipping a role
   * with, say, an empty name.
   */
  private readonly byId = new Map<number, Role>(
    ROLE_CATALOG.map((entry) => [
      entry.id,
      Role.create({
        id: entry.id,
        name: entry.name,
        permissions: entry.permissions.map((p) => Permission.create(p)),
      }),
    ]),
  );

  async findByIds(ids: readonly number[]): Promise<Role[]> {
    // Unknown ids are omitted rather than substituted, as the port
    // specifies: callers compare the returned length against the input
    // to spot a dangling reference and fail loudly. Filling the gap with
    // a placeholder role would instead mint a token carrying fewer
    // permissions than the user actually holds, and nobody would notice.
    return ids
      .map((id) => this.byId.get(id))
      .filter((role): role is Role => role !== undefined);
  }
}
