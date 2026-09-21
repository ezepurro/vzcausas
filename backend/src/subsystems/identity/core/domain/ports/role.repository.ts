import { Role } from "../entities/role.entity";

/**
 * DI token for {@link RoleRepository}. See glossary §7.1 in
 * IMPLEMENTACION_AUTH.md for the Symbol-as-token convention.
 */
export const ROLE_REPOSITORY = Symbol("ROLE_REPOSITORY");

/**
 * Persistence port for {@link Role}. Only read access is exposed;
 * role administration (create/update/delete) belongs to HU4 and is
 * out of the auth scope.
 *
 * Loaded during login by `AuthenticateUser` so the role's permissions
 * can be embedded in the access token's `permissions[]` claim (D-06).
 */
export interface RoleRepository {
  /**
   * Loads a role with its permissions eagerly by primary key.
   * Returns `null` if no role matches.
   */
  findById(id: number): Promise<Role | null>;
}
