import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import {
  ACCESS_TOKEN_VERIFIER,
  AccessTokenVerifier,
} from "@shared/domain/access-token-verifier.port";
import { UnauthorizedError } from "@shared/domain/domain-error";
import { IS_PUBLIC_KEY } from "../public.decorator";

/**
 * Authenticates every incoming request and attaches the resulting
 * {@link AuthenticatedUser} to `req.user`, where `@CurrentUser()`
 * picks it up.
 *
 * Registered globally in `AppModule` (D-56, D-57) — not in
 * `SharedModule`, which would create a module cycle since the verifier
 * is provided by `IdentityModule`. Routes decorated with `@Public()`
 * short-circuit before any token handling.
 *
 * Every rejection path raises the same opaque `UNAUTHENTICATED` 401:
 * missing header, wrong scheme, empty value, bad signature, expired
 * token, malformed claims. An unauthenticated caller learns nothing
 * about *why* it failed.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ACCESS_TOKEN_VERIFIER)
    private readonly verifier: AccessTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // `getAllAndOverride` checks the handler first and falls back to
    // the controller, so a whole controller can be marked public and
    // a single route can override the class-level setting.
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request.headers.authorization);

    if (token === null) {
      throw new UnauthorizedError(
        "UNAUTHENTICATED",
        "Authentication is required.",
      );
    }

    // Any failure inside the verifier surfaces as UnauthorizedError
    // by port contract, so it is left to propagate untouched.
    request.user = await this.verifier.verify(token);
    return true;
  }
}

/**
 * Pulls the credential out of `Authorization: Bearer <token>`.
 *
 * Returns `null` — never a partial or suspicious value — when the
 * header is absent, uses another scheme, carries no value, or has
 * extra segments. Being strict here means the verifier only ever sees
 * something that genuinely looks like a token, and the caller cannot
 * probe the parser's tolerance.
 *
 * The scheme is compared case-insensitively, as RFC 7235 requires.
 */
function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const segments = header.split(" ");
  if (segments.length !== 2) {
    return null;
  }

  const [scheme, value] = segments;
  if (scheme.toLowerCase() !== "bearer" || value.length === 0) {
    return null;
  }

  return value;
}
