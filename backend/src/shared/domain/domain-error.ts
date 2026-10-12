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

/**
 * Caller is being rate limited and must wait. Mapped to HTTP 429.
 *
 * A domain error and not a bare Nest exception because the wait is a
 * *policy* decision — the progressive lockout of `POST /auth/login`
 * (Q-03) — and the response has to carry the contract's envelope with
 * its own `code`, which an `HttpException` cannot express without the
 * filter guessing.
 *
 * `details.retryAfterSeconds` is the one place the API puts something
 * other than field-level messages in `details` (contract §5.2). It is
 * duplicated there on purpose: the authoritative signal is the
 * `Retry-After` header, but a browser cannot read a header that CORS
 * does not expose, so the body is what the frontend actually consumes.
 */
export class TooManyRequestsError extends DomainError {}
