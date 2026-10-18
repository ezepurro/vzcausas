import { User } from "../../../core/domain/entities/user.entity";
import { Email } from "../../../core/domain/value-objects/email.vo";
import { Username } from "../../../core/domain/value-objects/username.vo";

/**
 * Prisma row shape this mapper expects for `users`.
 *
 * The three gaps this file used to document — `id` as `String
 * @db.Uuid`, no `username` column, no `lawyerId` — were closed on
 * `develop` when `schema.prisma` was aligned with the domain.
 *
 * The migration for that schema has since been generated too, so both
 * this mapper and `prisma-user.repository.ts` type-check against the
 * real generated client — the adapter's `@ts-nocheck` is gone.
 */
type UserRow = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  passwordHash: string;
  lawyerId: number | null;
  lastLoginAt: Date | null;
  active: boolean;
  deletedAt: Date | null;
  roles: { roleId: number }[];
};

export class UserPrismaMapper {
  static toDomain(row: UserRow): User {
    return User.hydrate({
      id: row.id,
      username: Username.create(row.username),
      passwordHash: row.passwordHash,
      fullName: row.fullName,
      email: Email.create(row.email),
      roleIds: row.roles.map((r) => r.roleId),
      lawyerId: row.lawyerId,
      lastLoginAt: row.lastLoginAt,
      active: row.active,
      deletedAt: row.deletedAt,
    });
  }
}
