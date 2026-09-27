import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import { User } from "../../../core/domain/entities/user.entity";
import { UserRepository } from "../../../core/domain/ports/user.repository";
import { Email } from "../../../core/domain/value-objects/email.vo";
import { Username } from "../../../core/domain/value-objects/username.vo";
import { UserPrismaMapper } from "./user-prisma.mapper";

const USER_INCLUDE = { roles: true } as const;

/**
 * Prisma-backed {@link UserRepository}.
 *
 * This file carried a `@ts-nocheck` while `schema.prisma` still had
 * `User.id` as a UUID and lacked the `username` and `lawyerId`
 * columns. The schema was aligned with the domain and the migration
 * generated, so the adapter now type-checks against the real
 * generated client and the suppression is gone — keep it that way.
 */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: Username): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { username: username.toString() },
      include: USER_INCLUDE,
    });
    return row ? UserPrismaMapper.toDomain(row) : null;
  }

  async findById(id: number): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });
    return row ? UserPrismaMapper.toDomain(row) : null;
  }

  /**
   * Persists every mutable field, including roles: HU6's `UpdateUser`
   * can replace the full role set, so the join table is synced by
   * deleting and recreating it — simplest correct approach for the
   * handful of rows a user has.
   */
  async save(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        username: user.username.toString(),
        fullName: user.fullName,
        email: user.email.toString(),
        passwordHash: user.hashForPersistence(),
        lawyerId: user.lawyerId,
        lastLoginAt: user.lastLoginAt,
        active: user.isActive(),
        roles: {
          deleteMany: {},
          create: user.roleIds.map((roleId) => ({ roleId })),
        },
      },
    });
  }

  async nextId(): Promise<number> {
    const [{ nextval }] = await this.prisma.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval(pg_get_serial_sequence('users', 'id'))`;
    return Number(nextval);
  }

  async existsByUsername(
    username: Username,
    excludingUserId?: number,
  ): Promise<boolean> {
    const row = await this.prisma.user.findUnique({
      where: { username: username.toString() },
      select: { id: true },
    });
    return row !== null && row.id !== excludingUserId;
  }

  async existsByEmail(
    email: Email,
    excludingUserId?: number,
  ): Promise<boolean> {
    const row = await this.prisma.user.findUnique({
      where: { email: email.toString() },
      select: { id: true },
    });
    return row !== null && row.id !== excludingUserId;
  }

  async create(user: User): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.id,
        username: user.username.toString(),
        fullName: user.fullName,
        email: user.email.toString(),
        passwordHash: user.hashForPersistence(),
        lawyerId: user.lawyerId,
        active: user.isActive(),
        roles: {
          create: user.roleIds.map((roleId) => ({ roleId })),
        },
      },
    });
  }

  /**
   * Counted in the database rather than by loading the users: the
   * rule only ever asks "is there more than one?", and materializing
   * every administrator to check `.length` would be wasteful.
   */
  async countActiveByRoleName(roleName: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        active: true,
        roles: { some: { role: { name: roleName } } },
      },
    });
  }
}
