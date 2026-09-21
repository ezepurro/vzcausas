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
