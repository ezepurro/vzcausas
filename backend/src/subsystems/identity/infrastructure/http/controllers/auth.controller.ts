import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import {
  authThrottleLimit,
  authThrottleTtlMs,
} from "@shared/infrastructure/http/throttle-policy";
import { AuthenticatedUser } from "@shared/domain/authenticated-user";
import { CurrentUser } from "@shared/infrastructure/http/current-user.decorator";
import { AuthenticateUserUseCase } from "@subsystems/identity/core/application/use-cases/authenticate-user.use-case";
import { ChangePasswordUseCase } from "@subsystems/identity/core/application/use-cases/change-password.use-case";
import { LogoutUseCase } from "@subsystems/identity/core/application/use-cases/logout.use-case";
import { RefreshSessionUseCase } from "@subsystems/identity/core/application/use-cases/refresh-session.use-case";
import { ChangePasswordRequestDto } from "../dtos/change-password.request.dto";
import {
  LoginResponseDto,
  RefreshResponseDto,
} from "../dtos/auth.response.dto";
import { LoginRequestDto } from "../dtos/login.request.dto";
import { AuthHttpMapper } from "../mappers/auth-http.mapper";
import { RefreshCookieOptions } from "../refresh-cookie.options";
import { Public } from "@shared/infrastructure/http/public.decorator";

/**
 * Overrides the `default` throttler's generous API-wide limit with a
 * stricter one, just for these two routes (Q-03). Functions, not
 * plain numbers: `@nestjs/throttler` calls them per request, which is
 * what lets `authThrottleLimit`/`authThrottleTtlMs` read the
 * environment lazily instead of at decorator-evaluation time, before
 * Nest's DI container exists — see `throttle-policy.ts`.
 *
 * Deliberately the **same** `default` bucket (not a second named
 * throttler): a second throttler would, by `@nestjs/throttler`'s own
 * default behaviour, apply to *every* route in the app unless each of
 * the other controllers opted out with `@SkipThrottle`. Overriding the
 * one bucket on just these two handlers needs no changes anywhere
 * else.
 */
const AUTH_THROTTLE = {
  default: { limit: authThrottleLimit, ttl: authThrottleTtlMs },
};

/**
 * The address the progressive lockout counts against.
 *
 * `req.ip` already honours `X-Forwarded-For`, but **only** when Express
 * is told to trust the proxy (`TRUST_PROXY`, set in `main.ts`). That
 * setting is what makes this correct, and getting it wrong fails in
 * both directions: left off behind a proxy, every user shares the
 * proxy's address and one person's failures lock out the whole firm;
 * turned on without a proxy in front, a caller spoofs the header and
 * gets a fresh counter per request.
 *
 * Falls back to a literal when the address is unavailable (a socket
 * already gone, or a unit test with a bare request object). A shared
 * bucket is the safe direction to fail: it throttles more, not less.
 */
function callerIp(req: Request): string {
  return req.ip ?? "unknown";
}

/**
 * HTTP entry point for `/auth` (API v2 §3.1). Translates requests
 * into use-case calls and results back into responses; it holds no
 * business rules.
 *
 * Beyond that usual job it owns one concern the use cases cannot:
 * **the refresh cookie**. The use cases return a refresh token value
 * and an expiry and know nothing about HTTP; setting, rotating and
 * deleting the cookie happens only here, through
 * {@link RefreshCookieOptions} (D-50).
 *
 * Errors are not caught — the global `DomainErrorFilter` renders
 * every `DomainError` into the contract's envelope. The single
 * exception is {@link AuthController.refresh}, which must clear the
 * cookie before the error propagates (D-26, D-51).
 *
 * Authentication is enforced globally (D-56), so only `login` and
 * `refresh` carry `@Public()`; `logout` and `changePassword` are
 * protected by default and read the actor via {@link CurrentUser},
 * populated by `JwtAuthGuard`. The guards are registered in
 * `AppModule` (D-57), so none of this takes effect until P-13 wires
 * the modules.
 */
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authenticateUser: AuthenticateUserUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly mapper: AuthHttpMapper,
    private readonly cookies: RefreshCookieOptions,
  ) {}

  /**
   * `POST /auth/login` — 200 with the session payload, or 401
   * `INVALID_CREDENTIALS` for every failed path (D-18).
   */
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: LoginResponseDto }> {
    const result = await this.authenticateUser.execute({
      username: dto.username,
      password: dto.password,
      ip: callerIp(req),
    });

    res.cookie(
      this.cookies.name,
      result.refreshToken,
      this.cookies.forSet(result.refreshExpiresIn),
    );

    return { data: this.mapper.toLoginResponse(result) };
  }

  /**
   * `POST /auth/refresh` — rotates the session. Takes no body and no
   * `Authorization` header: the credential is the cookie alone.
   *
   * On success the cookie carries the rotated token; on any failure
   * it is deleted, so a client holding a dead refresh is not left
   * retrying with it forever (D-26). The error is re-thrown for the
   * global filter to render (D-51).
   */
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: RefreshResponseDto }> {
    // An absent cookie yields "", which the use case resolves to the
    // same opaque 401 as any other bad token (D-28).
    const presented = this.readRefreshCookie(req) ?? "";

    try {
      const result = await this.refreshSession.execute({
        refreshToken: presented,
      });

      res.cookie(
        this.cookies.name,
        result.refreshToken,
        this.cookies.forSet(result.refreshExpiresIn),
      );

      return { data: this.mapper.toRefreshResponse(result) };
    } catch (error) {
      res.clearCookie(this.cookies.name, this.cookies.forClear());
      throw error;
    }
  }

  /**
   * `POST /auth/logout` — 204, no body. Revokes the session's refresh
   * family server-side and deletes the client's cookie.
   *
   * The cookie is cleared unconditionally: even when the use case
   * found nothing to revoke (D-33), the client should not keep a
   * token the server no longer honors.
   */
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.logoutUseCase.execute({
      userId: actor.userId,
      refreshToken: this.readRefreshCookie(req),
    });

    res.clearCookie(this.cookies.name, this.cookies.forClear());
  }

  /**
   * `PATCH /auth/password` — 204, no body.
   *
   * Changing the password wipes every session of the user (Q-01),
   * including the caller's. The use case issues a replacement refresh
   * so this client stays logged in (D-34); that is the cookie set
   * here. The contract's "la sesión permanece abierta" depends on it,
   * and so — since the access token now carries the family id as
   * `sid` (CA-2.3) — does passing the presented cookie through, so the
   * use case can continue the caller's own family instead of starting
   * a new one the current access token would not belong to.
   */
  @Patch("password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: ChangePasswordRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const result = await this.changePasswordUseCase.execute({
      userId: actor.userId,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
      refreshToken: this.readRefreshCookie(req),
    });

    res.cookie(
      this.cookies.name,
      result.refreshToken,
      this.cookies.forSet(result.refreshExpiresIn),
    );
  }

  /**
   * Reads the refresh cookie, normalizing "absent" and "empty" to
   * `null`. `req.cookies` is only populated once `cookie-parser` is
   * wired in P-13; the optional chaining keeps this safe until then.
   */
  private readRefreshCookie(req: Request): string | null {
    const raw: unknown = req.cookies?.[this.cookies.name];
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  }
}
