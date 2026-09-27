import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import { User } from "@subsystems/identity/core/domain/entities/user.entity";
import { UserRepository } from "@subsystems/identity/core/domain/ports/user.repository";
import { Username } from "@subsystems/identity/core/domain/value-objects/username.vo";
import { toDomainUser } from "./user.mapper";

/** Every read needs the role ids, which live in the join table. */
const WITH_ROLES = { roles: { select: { roleId: true } } } as const;

/**
 * {@link UserRepository} backed by PostgreSQL through Prisma.
 *
 * Replaces the in-memory adapter that carried the subsystem until the
 * schema existed. The behavioural difference that matters: state now
 * survives a restart, and two processes see the same data.
 *
 * Soft deletion is respected on read. `deletedAt` is the column that
 * marks a user as gone, and a deleted user must not be able to
 * authenticate, so both lookups filter on it. The `active` flag is a
 * separate concept — a user can be inactive without being deleted —
 * and is left for the use cases to interpret, which is why it is
 * mapped rather than filtered here.
 */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: Username): Promise<User | null> {
    // The value object already normalized the string (trimmed and
    // lowercased), and the column stores it in that same form, so an
    // exact match is correct here and uses the unique index.
    const row = await this.prisma.user.findFirst({
      where: { username: username.toString(), deletedAt: null },
      include: WITH_ROLES,
    });

    return row ? toDomainUser(row) : null;
  }

  async findById(id: number): Promise<User | null> {
    const row = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: WITH_ROLES,
    });

    return row ? toDomainUser(row) : null;
  }

  /**
   * Writes back the fields the auth use cases can change: the password
   * hash and the last-login timestamp.
   *
   * Roles, username, email and the lawyer link are deliberately not
   * synced. No use case in this scope modifies them, and blindly
   * writing them on every save would turn a stale aggregate into
   * silent data loss — for roles especially, where the join table
   * would have to be diffed rather than overwritten. User
   * administration owns those fields and will extend the port with
   * methods that say so explicitly.
   */
  async save(user: User): Promise<void> {
    const state = user.toPersistence();

    await this.prisma.user.update({
      where: { id: state.id },
      data: {
        passwordHash: state.passwordHash,
        lastLoginAt: state.lastLoginAt,
      },
    });
  }
}
