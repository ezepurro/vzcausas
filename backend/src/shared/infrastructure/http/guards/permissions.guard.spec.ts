import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { AuthenticatedUser } from "@shared/domain/authenticated-user";
import {
  ForbiddenActionError,
  UnauthorizedError,
} from "@shared/domain/domain-error";
import { RequirePermissions } from "../require-permissions.decorator";
import { PermissionsGuard } from "./permissions.guard";

class DummyController {
  @RequirePermissions("user:manage")
  singlePermission(): void {}

  @RequirePermissions("user:manage", "case:read")
  twoPermissions(): void {}

  unrestricted(): void {}
}

const actorWith = (permissions: string[]): AuthenticatedUser => ({
  userId: 1,
  roleNames: ["ADMINISTRATOR"],
  lawyerId: null,
  permissions,
});

const contextFor = (
  handler: () => void,
  user?: AuthenticatedUser,
): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => DummyController,
    switchToHttp: () => ({ getRequest: () => ({ user }) as Partial<Request> }),
  }) as unknown as ExecutionContext;

describe("PermissionsGuard", () => {
  const guard = new PermissionsGuard(new Reflector());

  it("lets an undecorated route through", () => {
    expect(
      guard.canActivate(
        contextFor(DummyController.prototype.unrestricted, actorWith([])),
      ),
    ).toBe(true);
  });

  it("allows an actor holding the required permission, ignoring the ones beyond it", () => {
    expect(
      guard.canActivate(
        contextFor(
          DummyController.prototype.singlePermission,
          actorWith(["user:manage"]),
        ),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        contextFor(
          DummyController.prototype.singlePermission,
          actorWith(["user:manage", "case:read", "case:change-status"]),
        ),
      ),
    ).toBe(true);
  });

  it("requires every listed permission, not just one (D-58)", () => {
    expect(() =>
      guard.canActivate(
        contextFor(
          DummyController.prototype.twoPermissions,
          actorWith(["user:manage"]),
        ),
      ),
    ).toThrow(ForbiddenActionError);
    expect(
      guard.canActivate(
        contextFor(
          DummyController.prototype.twoPermissions,
          actorWith(["user:manage", "case:read"]),
        ),
      ),
    ).toBe(true);
  });

  it("rejects an actor with none of the required permissions", () => {
    expect(() =>
      guard.canActivate(
        contextFor(
          DummyController.prototype.singlePermission,
          actorWith(["case:read"]),
        ),
      ),
    ).toThrow(ForbiddenActionError);
  });

  it("rejects with 401, not 403, when no actor reached the guard", () => {
    // A wiring mistake — this guard running before JwtAuthGuard.
    // "No actor" must not be read as "no permissions required".
    expect(() =>
      guard.canActivate(contextFor(DummyController.prototype.singlePermission)),
    ).toThrow(UnauthorizedError);
  });
});