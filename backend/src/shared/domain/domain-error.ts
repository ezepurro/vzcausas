/**
 * Base class for all business-domain errors. The domain layer never
 * knows about HTTP; the DomainErrorFilter in the HTTP layer is the
 * sole place that maps subtypes to HTTP status codes and to the
 * `{ error: { code, message, details } }` envelope.
 *
 * Fields:
 * - `code` is a stable machine-readable identifier
 *   (e.g. `INVALID_CREDENTIALS`) consumed by the frontend to drive
 *   localized copy and behavior.
 * - `message` is a short human-readable string, in English per the
 *   project convention.
 * - `details` carries optional field-level context (for example, a
 *   per-field validation message map).
 *
 * Do not add a `toHttpStatus()` method here — the mapping belongs
 * outside the domain. If it lived on the class, the scheduled trigger
 * of `deadlines` (a non-HTTP entry point) would inherit HTTP semantics
 * it does not need.
 */
export abstract class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Restore the prototype chain after `super(message)`; otherwise
    // `instanceof DomainError` may return `false` on ES2015+ targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Malformed input reaching the domain layer. Mapped to HTTP 400. */
export class ValidationError extends DomainError {}

/** Missing or invalid authentication. Mapped to HTTP 401. */
export class UnauthorizedError extends DomainError {}

/** Resource not found. Mapped to HTTP 404. */
export class NotFoundError extends DomainError {}

/** Uniqueness or dependency conflict. Mapped to HTTP 409. */
export class ConflictError extends DomainError {}

/**
 * Authenticated caller is not allowed to perform this action.
 * Mapped to HTTP 403.
 */
export class ForbiddenActionError extends DomainError {}

/** Business rule violation. Mapped to HTTP 422. */
export class BusinessRuleError extends DomainError {}
