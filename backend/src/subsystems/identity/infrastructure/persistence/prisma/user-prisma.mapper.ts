import { User } from "../../../core/domain/entities/user.entity";
import { Email } from "../../../core/domain/value-objects/email.vo";
import { Username } from "../../../core/domain/value-objects/username.vo";

/**
 * Prisma row shape this mapper expects for `users`, WRITTEN AGAINST
 * THE INTENDED SCHEMA — not the one currently in `schema.prisma`.
 *
 * Known gaps in the current `schema.prisma` (agreed with the team to
 * fix together, out of scope for this branch — see plan notes):
 *  1. `User.id` is `String @db.Uuid`; the domain requires `number`.
 *  2. There is no `username` column (only `name`); the domain needs a
 *     login identifier distinct from `fullName`.
 *  3. There is no `lawyerId` column at all.
 *
 * Until the schema is fixed, this file (and `prisma-user.repository.ts`)
 * will not type-check against the generated Prisma Client. Everything
 * else in this branch (domain, use case, tests, HTTP layer) is
 * independent of this gap and works today.
 */
type UserRow = {
  id: number;
  username: string;
  name: string;
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
      fullName: row.name,
      email: Email.create(row.email),
      roleIds: row.roles.map((r) => r.roleId),
      lawyerId: row.lawyerId,
      lastLoginAt: row.lastLoginAt,
      active: row.active,
    });
  }
}
