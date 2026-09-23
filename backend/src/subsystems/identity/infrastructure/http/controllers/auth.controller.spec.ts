import { CookieOptions, Request, Response } from "express";
import { AuthenticatedUser } from "@shared/domain/authenticated-user";
import { AuthenticateUserResult } from "@subsystems/identity/core/application/use-cases/authenticate-user.use-case";
import { RefreshSessionResult } from "@subsystems/identity/core/application/use-cases/refresh-session.use-case";
import { AuthHttpMapper } from "../mappers/auth-http.mapper";
import { RefreshCookieOptions } from "../refresh-cookie.options";
import { AuthController } from "./auth.controller";

const COOKIE_NAME = "refresh_token";
const TZ = "America/Argentina/Cordoba";

/**
 * Captures what the controller does to the response, so the tests can
 * assert cookie handling without an HTTP server (D-54).
 */
class FakeResponse {
  cookieCalls: Array<{
    name: string;
    value: string;
    options: CookieOptions;
  }> = [];
  clearCalls: Array<{ name: string; options: CookieOptions }> = [];

  cookie(name: string, value: string, options: CookieOptions): this {
    this.cookieCalls.push({ name, value, options });
    return this;
  }

  clearCookie(name: string, options: CookieOptions): this {
    this.clearCalls.push({ name, options });
    return this;
  }
}

const fakeRequest = (cookies: Record<string, string> = {}): Request =>
  ({ cookies }) as unknown as Request;

const configFor = (values: Record<string, unknown>) =>
  ({
    getOrThrow: <T>(key: string): T => {
      if (!(key in values)) throw new Error(`missing ${key}`);
      return values[key] as T;
    },
  }) as never;

const ACTOR: AuthenticatedUser = {
  userId: 1,
  roleNames: ["ADMINISTRATOR"],
  lawyerId: null,
  permissions: ["user:manage"],
};

const LOGIN_RESULT: AuthenticateUserResult = {
  accessToken: "access-token",
  expiresIn: 900,
  refreshToken: "refresh-value",
  refreshExpiresIn: new Date("2026-09-30T10:00:00Z"),
  user: {
    id: 1,
    username: "fvazquez",
    fullName: "Fernando Vázquez",
    email: "fvazquez@vazquezzarate.com",
    roleNames: ["ADMINISTRATOR", "LAWYER"],
    lawyerId: 10,
    previousLoginAt: new Date("2026-09-19T11:12:00Z"),
    active: true,
  },
};

const REFRESH_RESULT: RefreshSessionResult = {
  accessToken: "new-access-token",
  expiresIn: 900,
  refreshToken: "rotated-refresh",
  refreshExpiresIn: new Date("2026-09-30T10:00:00Z"),
  user: {
    id: 1,
    username: "fvazquez",
    roleNames: ["ADMINISTRATOR"],
    lawyerId: 10,
    permissions: ["user:manage", "case:read"],
  },
};

const build = () => {
  const authenticateUser = {
    execute: jest.fn().mockResolvedValue(LOGIN_RESULT),
  };
  const refreshSession = {
    execute: jest.fn().mockResolvedValue(REFRESH_RESULT),
  };
  const logoutUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
  const changePasswordUseCase = {
    execute: jest.fn().mockResolvedValue({
      refreshToken: "post-change-refresh",
      refreshExpiresIn: new Date("2026-09-30T10:00:00Z"),
    }),
  };

  const cookies = new RefreshCookieOptions(
    configFor({
      COOKIE_REFRESH_NAME: COOKIE_NAME,
      COOKIE_REFRESH_PATH: "/api/v1/auth",
      COOKIE_REFRESH_SAMESITE: "Lax",
      COOKIE_SECURE: "false",
    }),
  );
  const mapper = new AuthHttpMapper(configFor({ APP_TIMEZONE: TZ }));

  const controller = new AuthController(
    authenticateUser as never,
    refreshSession as never,
    logoutUseCase as never,
    changePasswordUseCase as never,
    mapper,
    cookies,
  );

  const res = new FakeResponse();
  return {
    controller,
    res,
    authenticateUser,
    refreshSession,
    logoutUseCase,
    changePasswordUseCase,
  };
};

describe("AuthController", () => {
  describe("login", () => {
    it("returns the contract envelope and sets the refresh cookie", async () => {
      const { controller, res } = build();

      const body = await controller.login(
        { username: "fvazquez", password: "password-123" },
        res as unknown as Response,
      );

      expect(body.data.accessToken).toBe("access-token");
      expect(body.data.tokenType).toBe("Bearer");
      expect(body.data.expiresIn).toBe(900);
      expect(body.data.user.username).toBe("fvazquez");
      expect(body.data.user.roles).toEqual(["ADMINISTRATOR", "LAWYER"]);
      // Plain id, not a nested lawyer object (D-52).
      expect(body.data.user.lawyerId).toBe(10);

      expect(res.cookieCalls).toHaveLength(1);
      expect(res.cookieCalls[0].name).toBe(COOKIE_NAME);
      expect(res.cookieCalls[0].value).toBe("refresh-value");
      expect(res.cookieCalls[0].options.httpOnly).toBe(true);
      expect(res.cookieCalls[0].options.path).toBe("/api/v1/auth");
    });

    it("never puts the refresh token in the response body", async () => {
      const { controller, res } = build();

      const body = await controller.login(
        { username: "fvazquez", password: "password-123" },
        res as unknown as Response,
      );

      expect(JSON.stringify(body)).not.toContain("refresh-value");
    });

    it("serializes lastLoginAt with the study's offset (D-53)", async () => {
      const { controller, res } = build();

      const body = await controller.login(
        { username: "fvazquez", password: "password-123" },
        res as unknown as Response,
      );

      expect(body.data.user.lastLoginAt).toBe("2026-09-19T08:12:00-03:00");
    });

    it("reports a null lastLoginAt on the first ever login", async () => {
      const { controller, res, authenticateUser } = build();
      authenticateUser.execute.mockResolvedValue({
        ...LOGIN_RESULT,
        user: { ...LOGIN_RESULT.user, previousLoginAt: null },
      });

      const body = await controller.login(
        { username: "fvazquez", password: "password-123" },
        res as unknown as Response,
      );

      expect(body.data.user.lastLoginAt).toBeNull();
    });
  });

  describe("refresh", () => {
    it("passes the cookie value to the use case and rotates the cookie", async () => {
      const { controller, res, refreshSession } = build();

      const body = await controller.refresh(
        fakeRequest({ [COOKIE_NAME]: "presented-token" }),
        res as unknown as Response,
      );

      expect(refreshSession.execute).toHaveBeenCalledWith({
        refreshToken: "presented-token",
      });
      expect(body.data.user.permissions).toEqual(["user:manage", "case:read"]);
      expect(res.cookieCalls[0].value).toBe("rotated-refresh");
      expect(res.clearCalls).toHaveLength(0);
    });

    it("sends an empty token when no cookie was presented (D-28)", async () => {
      const { controller, res, refreshSession } = build();

      await controller.refresh(fakeRequest(), res as unknown as Response);

      expect(refreshSession.execute).toHaveBeenCalledWith({
        refreshToken: "",
      });
    });

    it("clears the cookie and rethrows when the session is rejected (D-51)", async () => {
      const { controller, res, refreshSession } = build();
      const failure = new Error("session expired");
      refreshSession.execute.mockRejectedValue(failure);

      await expect(
        controller.refresh(
          fakeRequest({ [COOKIE_NAME]: "dead-token" }),
          res as unknown as Response,
        ),
      ).rejects.toBe(failure);

      expect(res.clearCalls).toHaveLength(1);
      expect(res.clearCalls[0].name).toBe(COOKIE_NAME);
      // Same path as on set, or the browser ignores the deletion.
      expect(res.clearCalls[0].options.path).toBe("/api/v1/auth");
      expect(res.cookieCalls).toHaveLength(0);
    });
  });

  describe("logout", () => {
    it("revokes with the presented cookie and clears it", async () => {
      const { controller, res, logoutUseCase } = build();

      await controller.logout(
        ACTOR,
        fakeRequest({ [COOKIE_NAME]: "presented-token" }),
        res as unknown as Response,
      );

      expect(logoutUseCase.execute).toHaveBeenCalledWith({
        userId: 1,
        refreshToken: "presented-token",
      });
      expect(res.clearCalls).toHaveLength(1);
    });

    it("passes null and still clears the cookie when none was presented", async () => {
      const { controller, res, logoutUseCase } = build();

      await controller.logout(ACTOR, fakeRequest(), res as unknown as Response);

      expect(logoutUseCase.execute).toHaveBeenCalledWith({
        userId: 1,
        refreshToken: null,
      });
      expect(res.clearCalls).toHaveLength(1);
    });
  });

  describe("changePassword", () => {
    it("forwards the actor's id and installs the replacement cookie (D-34)", async () => {
      const { controller, res, changePasswordUseCase } = build();

      await controller.changePassword(
        ACTOR,
        { currentPassword: "password-123", newPassword: "new-password-1" },
        res as unknown as Response,
      );

      expect(changePasswordUseCase.execute).toHaveBeenCalledWith({
        userId: 1,
        currentPassword: "password-123",
        newPassword: "new-password-1",
      });
      expect(res.cookieCalls).toHaveLength(1);
      expect(res.cookieCalls[0].value).toBe("post-change-refresh");
    });
  });
});
