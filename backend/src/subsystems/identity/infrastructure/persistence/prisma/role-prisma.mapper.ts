import { Role } from "../../../core/domain/entities/role.entity";
import { Permission } from "../../../core/domain/value-objects/permission.vo";

/**
 * Same gap notice as `user-prisma.mapper.ts`: `Role.id` is `String
 * @db.Uuid` in the current `schema.prisma`; the domain requires
 * `number`. Written against the intended (fixed) schema.
 */
type RoleRow = {
  id: number;
  name: string;
  permissions: { permission: { name: string } }[];
};

export class RolePrismaMapper {
  static toDomain(row: RoleRow): Role {
    return Role.hydrate({
      id: row.id,
      name: row.name,
      permissions: row.permissions.map((rp) =>
        Permission.create(rp.permission.name),
      ),
    });
  }
}
