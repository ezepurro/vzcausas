import { User } from "@subsystems/identity/core/domain/entities/user.entity";
import { Email } from "@subsystems/identity/core/domain/value-objects/email.vo";
import { Username } from "@subsystems/identity/core/domain/value-objects/username.vo";

/**
 * The shape this mapper needs out of a `users` row: the scalar columns
 * plus the join rows that carry the role ids.
 *
 * Declared structurally instead of importing Prisma's generated type.
 * The generated type names a specific `include` combination, so every
 * query would have to reproduce it exactly; this way the repository
 * only has to hand over something that has the fields, and a change to
 * an unrelated column does not ripple into the mapper's signature.
 */
export type UserRow = {
  id: number;
  username: string;
  passwordHash: string;
  fullName: string;
  email: string;
  lawyerId: number | null;
  lastLoginAt: Date | null;
  active: boolean;
  deletedAt: Date | null;
  roles: { roleId: number }[];
};

/**
 * Rebuilds the {@link User} aggregate from a database row.
 *
 * Uses `hydrate` and not `create`: the row was already validated when
 * it was written, and `create` would re-run the password policy
 * against a value that is a hash rather than a password — which would
 * fail, and rightly so. Rehydration trusts the store.
 *
 * The value objects are still constructed through their factories, so
 * a row that somehow holds a malformed username or email fails loudly
 * here instead of travelling further into the domain.
 */
export function toDomainUser(row: UserRow): User {
  return User.hydrate({
    id: row.id,
    username: Username.create(row.username),
    passwordHash: row.passwordHash,
    fullName: row.fullName,
    email: Email.create(row.email),
    roleIds: row.roles.map((link) => link.roleId),
    lawyerId: row.lawyerId,
    lastLoginAt: row.lastLoginAt,
    active: row.active,
    deletedAt: row.deletedAt,
  });
}
