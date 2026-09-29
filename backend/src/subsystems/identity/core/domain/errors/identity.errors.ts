import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@shared/domain/domain-error";

/**
 * Emitted by `AuthenticateUser` when the supplied credentials cannot
 * be authenticated. Also raised when the user exists but is inactive,
 * so we do not leak account existence to callers (D-18, OWASP guidance).
 */
export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super("INVALID_CREDENTIALS", "Invalid credentials.");
  }
}

/**
 * Emitted by {@link User.changePassword} when the caller-supplied
 * current password does not match the stored hash. Mapped to HTTP 422
 * to match the API contract for `PATCH /auth/password`.
 */
export class InvalidCurrentPasswordError extends BusinessRuleError {
  constructor() {
    super("INVALID_CURRENT_PASSWORD", "Current password is incorrect.");
  }
}

/**
 * Emitted when a proposed password does not meet the policy defined
 * in D-03 (min 8 chars, max 72 bytes in UTF-8). `reason` carries the
 * specific rule that failed so the frontend can render a targeted
 * message.
 */
export class WeakPasswordError extends ValidationError {
  constructor(reason: string) {
    super("WEAK_PASSWORD", "Password does not meet the required policy.", {
      reason,
    });
  }
}

/**
 * Emitted by `RegisterUser` (HU4) when the username is already taken.
 *
 * `details.field` names the offending input so the frontend can mark
 * that control instead of showing a form-level error: CA-4.3 requires
 * the response to *"marcar el campo en conflicto con su motivo"*.
 */
export class UsernameAlreadyExistsError extends ConflictError {
  constructor() {
    super(
      "USERNAME_ALREADY_EXISTS",
      "The username is already registered.",
      { field: "username" },
    );
  }
}

/**
 * Emitted by `RegisterUser` (HU4) when the email is already taken.
 * Carries `details.field` for the same reason as
 * {@link UsernameAlreadyExistsError}.
 */
export class EmailAlreadyExistsError extends ConflictError {
  constructor() {
    super("EMAIL_ALREADY_EXISTS", "The email is already registered.", {
      field: "email",
    });
  }
}

/**
 * Emitted by `RegisterUser` (HU4) when a requested role code does not
 * match any seeded {@link Role}. Structural input problem, not a
 * business rule, hence a {@link ValidationError} (400).
 */
export class InvalidRoleError extends ValidationError {
  constructor(names: readonly string[]) {
    super("INVALID_ROLE", "One or more roles are not valid.", { names });
  }
}

/**
 * Emitted by `RegisterUser` (HU4) when the requested roles include
 * `LAWYER` but no `lawyerId` was supplied — a lawyer role always
 * needs the professional record it exercises under (API contract
 * §3.2).
 */
export class LawyerLinkRequiredError extends BusinessRuleError {
  constructor() {
    super(
      "LAWYER_LINK_REQUIRED",
      "A user with the LAWYER role must reference a lawyerId.",
    );
  }
}

/**
 * Emitted by `RegisterUser` (HU4) when `lawyerId` was supplied but
 * the requested roles do not include `LAWYER` — only someone who
 * exercises holds a professional record (API contract §3.2).
 */
export class LawyerLinkNotAllowedError extends BusinessRuleError {
  constructor() {
    super(
      "LAWYER_LINK_NOT_ALLOWED",
      "lawyerId can only be set for users with the LAWYER role.",
    );
  }
}

/**
 * Emitted by `RegisterUser` (HU4) when the referenced `lawyerId` does
 * not resolve via {@link LawyerLookupPort} — either no such lawyer
 * exists or the professional record was logically deleted (RN12),
 * which the lookup reports as "not found" all the same.
 */
export class LawyerNotFoundError extends BusinessRuleError {
  constructor(lawyerId: number) {
    super("LAWYER_NOT_FOUND", "The referenced lawyer does not exist.", {
      lawyerId,
    });
  }
}

/**
 * Emitted by `GetUser` (HU5) when no user matches the requested id —
 * including a user that exists but was logically deleted (RN12,
 * `active: false`). Per the API contract (§3.2, `DELETE
 * /users/{userId}`): *"no aparece en ningún listado y `GET
 * /users/{userId}` responde 404"* — a deactivated user must be
 * indistinguishable from a nonexistent one through this endpoint.
 */
export class UserNotFoundError extends NotFoundError {
  constructor(userId: number) {
    super("USER_NOT_FOUND", "The requested user was not found.", { userId });
  }
}

/**
 * Emitted when the `userId` path parameter is not a positive integer.
 * Syntactic, not semantic, but modeled as a domain error (not a bare
 * Nest exception) so the response carries the exact `code` the
 * contract requires (`INVALID_PATH_PARAMETER`), matching how DTOs are
 * validated everywhere else in this subsystem.
 */
export class InvalidUserIdError extends ValidationError {
  constructor() {
    super("INVALID_PATH_PARAMETER", "The user identifier is not valid.", {
      userId: "Debe ser un número entero válido.",
    });
  }
}

/**
 * Emitted by `UpdateUser` (HU6) when the request body has none of
 * `username`/`fullName`/`email`/`roles`/`lawyerId` set — the contract
 * requires at least one (§3.2, `PATCH /users/{userId}`).
 */
export class EmptyUpdateRequestError extends ValidationError {
  constructor() {
    super("VALIDATION_ERROR", "At least one field must be provided.", {
      body: "Debe enviarse al menos un campo para modificar.",
    });
  }
}

/**
 * Emitted by `UpdateUser` (HU6) and `DeactivateUser` (HU7) when an
 * operation would leave the system with no active administrator.
 *
 * Covers CA-6.3 (*"se intenta cambiarle el perfil […] el sistema
 * nunca puede quedar sin administrador"*) and CA-7.4 (*"cuando se
 * intenta darlo de baja —incluso a sí mismo—, el sistema lo
 * impide"*). There is no self-exception: the rule protects the
 * system, not the account, so it applies regardless of who asks.
 *
 * Modeled as a {@link BusinessRuleError} (422) rather than a
 * validation error: the request is perfectly well-formed, it is the
 * resulting state that the domain refuses.
 */
export class LastAdministratorError extends BusinessRuleError {
  constructor(operation: "update" | "deactivate") {
    super(
      "LAST_ADMINISTRATOR",
      "The last active administrator cannot be modified or deactivated.",
      { operation },
    );
  }
}

/**
 * Emitted by `RefreshSession` for every failure path (D-26): missing
 * or unknown refresh token, revoked token (reuse — the use case also
 * revokes the whole family before throwing, D-05/D-29), expired token,
 * user deleted after the last login, or user marked inactive. The
 * shared `UNAUTHENTICATED` code is used deliberately so the client
 * cannot distinguish the paths — the reaction is always the same
 * (redirect to login). Message aligned to API v2 §3.1.
 */
export class SessionExpiredError extends UnauthorizedError {
  constructor() {
    super("UNAUTHENTICATED", "Session expired or invalid.");
  }
}

/**
 * Emitted by `ListUsers` when the `role` query parameter names a
 * role that does not exist.
 *
 * The contract answers this with `INVALID_REQUEST` and the offending
 * parameter in `details` (§3.2), not with an empty page: a caller
 * that mistyped "LAWER" deserves to be told, and an empty list would
 * read as "there are no lawyers".
 */
export class UnknownRoleFilterError extends ValidationError {
  constructor(roleName: string) {
    super("INVALID_REQUEST", "Parámetros de query inválidos.", {
      role: "No existe un rol con ese nombre.",
      received: roleName,
    });
  }
}

/**
 * Emitted when a lawyer already has an active account and someone
 * tries to link a second one.
 *
 * A professional record stands for one person, and two live accounts
 * under the same matrícula would let the same lawyer act as two
 * actors in the audit trail. Deactivating the first account frees the
 * lawyer, so this is never a dead end.
 *
 * A {@link ConflictError} (409) rather than a business rule: it is
 * the same shape as a duplicate username, and `details.field` lets
 * the frontend mark the lawyer selector.
 */
export class LawyerAlreadyLinkedError extends ConflictError {
  constructor(lawyerId: number) {
    super(
      "LAWYER_ALREADY_LINKED",
      "El abogado ya tiene una cuenta de usuario activa.",
      { field: "lawyerId", lawyerId },
    );
  }
}
