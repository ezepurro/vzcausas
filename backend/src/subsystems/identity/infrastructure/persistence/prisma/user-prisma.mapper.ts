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
 * One step is still outstanding: the migration for that schema has
 * not been generated yet, so the Prisma Client on disk was produced
 * from the old schema and this file (plus
 * `prisma-user.repository.ts`) still will not type-check against it.
 * Run `npx prisma migrate dev` and regenerate, then drop the
 * `@ts-nocheck` at the top of the repository adapter.
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
    });
  }
}
