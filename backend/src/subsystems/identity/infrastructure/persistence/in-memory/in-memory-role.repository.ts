import { Injectable } from "@nestjs/common";
import { Role } from "@subsystems/identity/core/domain/entities/role.entity";
import { RoleRepository } from "@subsystems/identity/core/domain/ports/role.repository";
import { Permission } from "@subsystems/identity/core/domain/value-objects/permission.vo";
import { permission } from "process";

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

@Injectable()
export class InMemoryRoleRepository implements RoleRepository {
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
    return ids
      .map((id) => this.byId.get(id))
      .filter((role): role is Role => role !== undefined);
  }
}
