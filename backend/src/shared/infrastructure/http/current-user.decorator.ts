import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedUser } from "@shared/domain/authenticated-user";
import { UnauthorizedError } from "@shared/domain/domain-error";

/**
 * Augment Express's `Request` with the authenticated actor attached
 * by `JwtAuthGuard` (P-12). Declared as an ambient module
 * augmentation, mirroring the `correlationId` one in
 * `CorrelationMiddleware`, so it is visible project-wide without
 * extra imports.
 */
declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

/**
 * Injects the authenticated {@link AuthenticatedUser} into a
 * controller handler. Lives in `shared` because every subsystem's
 * controllers will read the current actor; only `identity` produces
 * it.
 *
 * Throws {@link UnauthorizedError} — which the global filter renders
 * as an opaque 401 `UNAUTHENTICATED` — when no actor is present. That
 * matters during the P-11/P-12 window (D-49): the decorator ships
 * before the guard that populates `req.user`, and a handler reached
 * without authentication must be rejected rather than crash on an
 * undefined read. Once the guard is in place the branch becomes
 * unreachable in practice, and stays as a cheap defense against a
 * route being wired without it.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request>();

    if (!request.user) {
      throw new UnauthorizedError(
        "UNAUTHENTICATED",
        "La autenticación es requerida.",
      );
    }

    return request.user;
  },
);
