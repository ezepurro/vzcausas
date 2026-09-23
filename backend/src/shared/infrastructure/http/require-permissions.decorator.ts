import { CustomDecorator, SetMetadata } from "@nestjs/common";

/** Metadata key read by `PermissionsGuard`. */
export const REQUIRED_PERMISSIONS_KEY = "auth:requiredPermissions";

/**
 * Declares the permissions a route demands. **All** listed permissions
 * must be present in the actor's effective set (D-58); the check is a
 * conjunction, not a disjunction. If an "any of these" rule is ever
 * needed it gets its own decorator rather than overloading this one,
 * because silently changing AND to OR would loosen every existing
 * route at once.
 *
 * The effective permission set is the union across the user's roles,
 * computed at login and carried inside the access token, so the check
 * costs no database round-trip.
 *
 * No endpoint in the current scope uses this: logout and change
 * password are open to any authenticated user. It ships now because
 * HU4's `/users` endpoints will need it. Note those are specified by
 * **role** in the contract, not by permission — see D-59.
 */
export const RequirePermissions = (...permissions: string[]): CustomDecorator =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
