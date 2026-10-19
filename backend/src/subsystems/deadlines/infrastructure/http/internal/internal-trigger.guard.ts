import { timingSafeEqual } from "node:crypto";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { UnauthorizedError } from "@shared/domain/domain-error";

const SECRET_HEADER = "x-internal-trigger-secret";

/**
 * Protects the daily-run endpoint GitHub Actions hits (N-04). Not user
 * authentication — there is no user, no session, no `Authorization`
 * header — so this is a separate guard from {@link JwtAuthGuard}, applied
 * only to this route, with the route also marked `@Public()` to skip
 * the global one.
 *
 * Compared with {@link timingSafeEqual} rather than `===`: a plain string
 * comparison on a secret leaks timing information byte by byte. Low risk
 * for this particular secret, but the correct comparison costs nothing.
 */
@Injectable()
export class InternalTriggerGuard implements CanActivate {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>("INTERNAL_TRIGGER_SECRET");
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[SECRET_HEADER];

    if (typeof provided !== "string" || !this.matches(provided)) {
      throw new UnauthorizedError(
        "UNAUTHENTICATED",
        "La autenticación es requerida.",
      );
    }

    return true;
  }

  private matches(provided: string): boolean {
    const providedBuffer = Buffer.from(provided);
    const secretBuffer = Buffer.from(this.secret);

    if (providedBuffer.length !== secretBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, secretBuffer);
  }
}
