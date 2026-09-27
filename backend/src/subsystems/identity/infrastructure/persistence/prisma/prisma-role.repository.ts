import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import { Role } from "@subsystems/identity/core/domain/entities/role.entity";
import { RoleRepository } from "@subsystems/identity/core/domain/ports/role.repository";
import { Permission } from "@subsystems/identity/core/domain/value-objects/permission.vo";

/**
 * {@link RoleRepository} backed by PostgreSQL through Prisma.
 *
 * Replaces the in-memory adapter that held the role catalog as a
 * constant. The catalog now lives in the database, populated by the
 * seed script — which means a database without that seed produces
 * users whose roles resolve to nothing, and the use cases degrade to a
 * 500 rather than issuing a token with no permissions.
 */
@Injectable()
export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIds(ids: readonly number[]): Promise<Role[]> {
    // An empty `in` clause is a query that can only return nothing;
    // skip the round trip.
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.prisma.role.findMany({
      where: { id: { in: [...ids] } },
      include: { permissions: { include: { permission: true } } },
    });

    // Unknown ids are simply absent from the result, as the port
    // specifies: the caller compares lengths to detect a dangling
    // reference. Substituting a placeholder would mint a token with
    // fewer permissions than the user actually holds.
    return rows.map((row) =>
      Role.hydrate({
        id: row.id,
        name: row.name,
        permissions: row.permissions.map((link) =>
          Permission.create(link.permission.name),
        ),
      }),
    );
  }
}
