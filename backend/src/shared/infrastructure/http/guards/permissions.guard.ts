import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import {
  ForbiddenActionError,
  UnauthorizedError,
} from "@shared/domain/domain-error";
import { REQUIRED_PERMISSIONS_KEY } from "../require-permissions.decorator";

/**
 * Enforces the permissions declared by `@RequirePermissions(...)`.
 *
 * Runs after {@link JwtAuthGuard} — the registration order in
 * `AppModule` is what guarantees it (D-57), since this guard reads the
 * `req.user` the other one writes.
 *
 * Routes without the decorator pass straight through, which is why
 * registering it globally is safe: it only constrains what has been
 * explicitly constrained.
 *
 * The distinction between the two failures it can raise matters, and
 * the contract (§6) spells it out: **401** means "I do not know who
 * you are", **403** means "I know who you are and you may not do
 * this". Collapsing them would leave the frontend unable to tell
 * "log in again" from "ask an administrator".
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const actor = request.user;

    if (!actor) {
      // Reachable only if this guard were registered before
      // JwtAuthGuard, or on a route marked @Public() that also
      // declares permissions — both are wiring mistakes. Refuse
      // rather than treat "no actor" as "no permissions needed".
      throw new UnauthorizedError(
        "UNAUTHENTICATED",
        "La autenticación es requerida.",
      );
    }

    const granted = new Set(actor.permissions);
    const satisfiesAll = required.every((permission) =>
      granted.has(permission),
    );

    if (!satisfiesAll) {
      // The message names no permission on purpose: telling a caller
      // which grant it lacks maps out the authorization model for
      // them. The specifics belong in the audit log (Q-04).
      throw new ForbiddenActionError(
        "FORBIDDEN",
        "No tiene permisos para realizar esta operación.",
      );
    }

    return true;
  }
}
