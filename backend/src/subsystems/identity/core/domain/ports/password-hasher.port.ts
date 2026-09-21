/**
 * DI token for the {@link PasswordHasher} port. See D-09 for the
 * Symbol-as-token convention.
 */
export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");

/**
 * Hashing service consumed by {@link User.verifyPassword} and
 * {@link User.changePassword}. The default implementation is bcrypt
 * (D-07) via bcryptjs (D-13); other adapters can be plugged in
 * without touching the domain.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
