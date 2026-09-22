import {
  BusinessRuleError,
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