import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CookieOptions } from "express";

type SameSite = "lax" | "strict" | "none";

/**
 * Single source of truth for the attributes of the refresh cookie
 * (D-08, D-50). Login, refresh, logout and change-password all go
 * through here.
 *
 * Centralizing matters more than it looks: a browser only replaces or
 * deletes a cookie when `Name`, `Path` and `Domain` match exactly. If
 * the handler that sets the cookie and the one that clears it
 * disagreed on `Path`, the clear would silently no-op and leave a
 * live refresh token in the browser after logout.
 *
 * Values come from the environment (bitácora §6) so the same build
 * can run behind HTTPS in production (`Secure`, possibly
 * `SameSite=None`) and over plain HTTP in local development.
 */
@Injectable()
export class RefreshCookieOptions {
  /** Cookie name, also used by the controller to read the request. */
  readonly name: string;

  private readonly path: string;
  private readonly sameSite: SameSite;
  private readonly secure: boolean;

  constructor(config: ConfigService) {
    this.name = config.getOrThrow<string>("COOKIE_REFRESH_NAME");
    this.path = config.getOrThrow<string>("COOKIE_REFRESH_PATH");
    this.sameSite = normalizeSameSite(
      config.getOrThrow<string>("COOKIE_REFRESH_SAMESITE"),
    );
    // Env vars arrive as strings even when they read like booleans.
    this.secure = String(config.getOrThrow("COOKIE_SECURE")) === "true";

    // Browsers reject `SameSite=None` cookies that are not `Secure`,
    // and do it silently — the response looks fine and the cookie
    // never lands. Fail at bootstrap instead (Q-05).
    if (this.sameSite === "none" && !this.secure) {
      throw new Error(
        "COOKIE_REFRESH_SAMESITE=None requires COOKIE_SECURE=true; browsers discard the cookie otherwise.",
      );
    }
  }

  /**
   * Attributes for issuing or rotating the cookie. `expires` mirrors
   * the store's `expiresAt`, so the browser drops the cookie at the
   * same moment the server stops honoring the token.
   */
  forSet(expiresAt: Date): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: this.path,
      expires: expiresAt,
    };
  }

  /**
   * Attributes for deleting the cookie. Must match {@link forSet} on
   * `path` (and `domain`, unset in both) or the browser ignores the
   * deletion.
   */
  forClear(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: this.path,
      maxAge: 0,
    };
  }
}

/**
 * Accepts the `SameSite` spelling used in the environment file
 * (`Lax`, `Strict`, `None` — bitácora §6) and narrows it to the
 * lowercase union Express expects. An unrecognized value fails the
 * bootstrap instead of silently defaulting: a cookie sent with the
 * wrong `SameSite` either leaks cross-site or never reaches the
 * frontend, and both failures are hard to diagnose from the browser.
 */
function normalizeSameSite(raw: string): SameSite {
  const value = raw.trim().toLowerCase();
  if (value === "lax" || value === "strict" || value === "none") {
    return value;
  }
  throw new Error(
    `COOKIE_REFRESH_SAMESITE must be one of Lax, Strict or None; got ${JSON.stringify(raw)}.`,
  );
}
