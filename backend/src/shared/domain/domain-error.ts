export abstract class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
 
export class ValidationError extends DomainError {}
export class UnauthorizedError extends DomainError {}
export class NotFoundError extends DomainError {}
export class ConflictError extends DomainError {}
export class ForbiddenActionError extends DomainError {}
export class BusinessRuleError extends DomainError {}
