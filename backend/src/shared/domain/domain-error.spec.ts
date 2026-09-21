import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  ForbiddenActionError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./domain-error";

describe("DomainError", () => {
  it("preserves code, message and null details by default", () => {
    const err = new ConflictError("USERNAME_ALREADY_EXISTS", "already exists");

    expect(err.code).toBe("USERNAME_ALREADY_EXISTS");
    expect(err.message).toBe("already exists");
    expect(err.details).toBeNull();
  });

  it("preserves custom details", () => {
    const details = { newPassword: "does not meet the policy" };
    const err = new ValidationError("VALIDATION_ERROR", "invalid", details);

    expect(err.details).toEqual(details);
  });

  it("reports the concrete subclass name", () => {
    expect(new ForbiddenActionError("X", "y").name).toBe(
      "ForbiddenActionError",
    );
    expect(new NotFoundError("X", "y").name).toBe("NotFoundError");
  });

  it("supports instanceof against base, subtype and Error", () => {
    const err = new UnauthorizedError("INVALID_CREDENTIALS", "no");

    expect(err instanceof UnauthorizedError).toBe(true);
    expect(err instanceof DomainError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it("is not instance of a sibling subtype", () => {
    const err = new BusinessRuleError("X", "y");

    expect(err instanceof ConflictError).toBe(false);
  });
});
