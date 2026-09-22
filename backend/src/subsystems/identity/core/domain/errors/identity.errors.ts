import {
  BusinessRuleError,
  ConflictError,
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

/** Emitted by `RegisterUser` (HU4) when the username is already taken. */
export class UsernameAlreadyExistsError extends ConflictError {
  constructor() {
    super(
      "USERNAME_ALREADY_EXISTS",
      "The username is already registered.",
    );
  }
}

/** Emitted by `RegisterUser` (HU4) when the email is already taken. */
export class EmailAlreadyExistsError extends ConflictError {
  constructor() {
    super("EMAIL_ALREADY_EXISTS", "The email is already registered.");
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
 * not resolve via {@link LawyerLookupPort}. Until the `people`
 * subsystem (HU-12) exists, the stub adapter always resolves to
 * "not found", so this error always fires for LAWYER registrations.
 */
export class LawyerNotFoundError extends BusinessRuleError {
  constructor(lawyerId: number) {
    super("LAWYER_NOT_FOUND", "The referenced lawyer does not exist.", {
      lawyerId,
    });
  }
}
