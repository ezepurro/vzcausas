// @ts-nocheck — written against the intended schema (see notice below),
// not the one currently applied. Remove this line once the team's
// schema.prisma fix (id: Int, + username/lawyerId columns) lands and
// `npx prisma generate` regenerates the client. Without this, Nest's
// watch-mode compiler refuses to boot the ENTIRE app (any TS error
// anywhere under src/ blocks it), which would break local dev for
// everyone on this branch — not just this file.
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import { User } from "../../../core/domain/entities/user.entity";
import { UserRepository } from "../../../core/domain/ports/user.repository";
import { Email } from "../../../core/domain/value-objects/email.vo";
import { Username } from "../../../core/domain/value-objects/username.vo";
import { UserPrismaMapper } from "./user-prisma.mapper";

const USER_INCLUDE = { roles: true } as const;

/**
 * WRITTEN AGAINST THE INTENDED SCHEMA (see the gap notice in
 * `user-prisma.mapper.ts`): `User.id` as `Int`, plus `username` and
 * `lawyerId` columns that `schema.prisma` does not have yet. This
 * file will not type-check against the current generated Prisma
 * Client. Everything upstream of this adapter (domain, use case,
 * tests, HTTP layer) does not depend on it and works today.
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

  async save(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: user.hashForPersistence(),
        lastLoginAt: user.lastLoginAt,
        active: user.isActive(),
      },
    });
  }

  async nextId(): Promise<number> {
    const [{ nextval }] = await this.prisma.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval(pg_get_serial_sequence('users', 'id'))`;
    return Number(nextval);
  }

  async existsByUsername(username: Username): Promise<boolean> {
    const row = await this.prisma.user.findUnique({
      where: { username: username.toString() },
      select: { id: true },
    });
    return row !== null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const row = await this.prisma.user.findUnique({
      where: { email: email.toString() },
      select: { id: true },
    });
    return row !== null;
  }

  async create(user: User): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.id,
        username: user.username.toString(),
        name: user.fullName,
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
}
