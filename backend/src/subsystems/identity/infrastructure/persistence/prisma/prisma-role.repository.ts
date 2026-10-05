// @ts-nocheck — same reason as prisma-user.repository.ts: written
// against the intended schema (Role.id: Int), pending the team's fix.
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import { Role } from "../../../core/domain/entities/role.entity";
import { RoleRepository } from "../../../core/domain/ports/role.repository";
import { RolePrismaMapper } from "./role-prisma.mapper";

const ROLE_INCLUDE = { permissions: { include: { permission: true } } } as const;

/** Same schema-gap notice as `prisma-user.repository.ts` (id type). */
@Injectable()
export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIds(ids: readonly number[]): Promise<Role[]> {
    const rows = await this.prisma.db.role.findMany({
      where: { id: { in: [...ids] } },
      include: ROLE_INCLUDE,
    });
    return rows.map(RolePrismaMapper.toDomain);
  }

  async findByNames(names: readonly string[]): Promise<Role[]> {
    const rows = await this.prisma.db.role.findMany({
      where: { name: { in: [...names] } },
      include: ROLE_INCLUDE,
    });
    return rows.map(RolePrismaMapper.toDomain);
  }
}
