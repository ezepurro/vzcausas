import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { AccessTokenVerifier } from "@shared/domain/access-token-verifier.port";
import { AuthenticatedUser } from "@shared/domain/authenticated-user";
import { UnauthorizedError } from "@shared/domain/domain-error";
import { Public } from "../public.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";

const ACTOR: AuthenticatedUser = {
  userId: 1,
  roleNames: ["ADMINISTRATOR"],
  lawyerId: null,
  permissions: ["user:manage"],
};

/**
 * Dummy controller carrying real decorator metadata, read back by a
 * real {@link Reflector} (D-60). A fake reflector would only prove the
 * guard can read an object the test handed it.
 */
class DummyController {
  @Public()
  publicRoute(): void {}

  protectedRoute(): void {}
}

const contextFor = (
  handler: () => void,
  headers: Record<string, string> = {},
): { context: ExecutionContext; request: Partial<Request> } => {
  const request: Partial<Request> = { headers } as Partial<Request>;
  const context = {
    getHandler: () => handler,
    getClass: () => DummyController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
};

const build = (verify = jest.fn().mockResolvedValue(ACTOR)) => {
  const verifier: AccessTokenVerifier = { verify };
  return { verify, guard: new JwtAuthGuard(new Reflector(), verifier) };
};

describe("JwtAuthGuard", () => {
  it("lets a @Public() route through without touching the verifier", async () => {
    const { guard, verify } = build();
    const { context } = contextFor(DummyController.prototype.publicRoute);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });

  it("attaches the actor to the request on a valid token", async () => {
    const { guard, verify } = build();
    const { context, request } = contextFor(
      DummyController.prototype.protectedRoute,
      { authorization: "Bearer good-token" },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith("good-token");
    expect(request.user).toEqual(ACTOR);
  });

  it("accepts the scheme case-insensitively, per RFC 7235", async () => {
    const { guard, verify } = build();
    const { context } = contextFor(DummyController.prototype.protectedRoute, {
      authorization: "bearer good-token",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith("good-token");
  });

  it("rejects a request with no Authorization header", async () => {
    const { guard } = build();
    const { context } = contextFor(DummyController.prototype.protectedRoute);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("rejects a non-Bearer scheme", async () => {
    const { guard, verify } = build();
    const { context } = contextFor(DummyController.prototype.protectedRoute, {
      authorization: "Basic dXNlcjpwYXNz",
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(verify).not.toHaveBeenCalled();
  });

  it("rejects a Bearer header with no value or with extra segments", async () => {
    const { guard } = build();

    const empty = contextFor(DummyController.prototype.protectedRoute, {
      authorization: "Bearer",
    });
    const extra = contextFor(DummyController.prototype.protectedRoute, {
      authorization: "Bearer token and-more",
    });

    await expect(guard.canActivate(empty.context)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    await expect(guard.canActivate(extra.context)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("propagates the verifier's rejection unchanged", async () => {
    const failure = new UnauthorizedError(
      "UNAUTHENTICATED",
      "La autenticación es requerida o el token proporcionado no es válido.",
    );
    const { guard } = build(jest.fn().mockRejectedValue(failure));
    const { context } = contextFor(DummyController.prototype.protectedRoute, {
      authorization: "Bearer expired-token",
    });

    await expect(guard.canActivate(context)).rejects.toBe(failure);
  });
});