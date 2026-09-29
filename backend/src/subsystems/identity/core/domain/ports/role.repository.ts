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
 * Loaded during login by `AuthenticateUser` so the roles' names and
 * combined permissions can be embedded in the access token (D-06).
 * API v2 permits multiple roles per user (D-22), so this port loads
 * them in batch.
 */
export interface RoleRepository {
  /**
   * Loads all roles whose ids appear in the input list, each with
   * its permissions eagerly resolved. Roles not found are silently
   * omitted from the result — the caller compares the returned
   * length against the input length to detect missing roles.
   */
  findByIds(ids: readonly number[]): Promise<Role[]>;

  /**
   * Loads all roles whose name appears in the input list (HU4:
   * `RegisterUser` receives role codes like `"LAWYER"`, not ids).
   * Same omit-on-miss contract as {@link RoleRepository.findByIds}.
   */
  findByNames(names: readonly string[]): Promise<Role[]>;
}
