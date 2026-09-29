import { RefreshCookieOptions } from "./refresh-cookie.options";

const configFor = (values: Record<string, unknown>) =>
  ({
    getOrThrow: <T>(key: string): T => {
      if (!(key in values)) throw new Error(`missing ${key}`);
      return values[key] as T;
    },
  }) as never;

const base = {
  COOKIE_REFRESH_NAME: "refresh_token",
  COOKIE_REFRESH_PATH: "/api/v1/auth",
  COOKIE_REFRESH_SAMESITE: "Lax",
  COOKIE_SECURE: "false",
};

describe("RefreshCookieOptions", () => {
  it("builds set options that scope the cookie and expire with the token", () => {
    const options = new RefreshCookieOptions(configFor(base));
    const expiresAt = new Date("2026-09-30T10:00:00Z");

    expect(options.name).toBe("refresh_token");
    expect(options.forSet(expiresAt)).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/api/v1/auth",
      expires: expiresAt,
    });
  });

  it("builds clear options that match the set options on path", () => {
    const options = new RefreshCookieOptions(configFor(base));

    const set = options.forSet(new Date());
    const clear = options.forClear();

    // A mismatch here would make logout silently fail to delete.
    expect(clear.path).toBe(set.path);
    expect(clear.sameSite).toBe(set.sameSite);
    expect(clear.secure).toBe(set.secure);
    expect(clear.maxAge).toBe(0);
  });

  it("reads COOKIE_SECURE as a boolean-ish string", () => {
    const options = new RefreshCookieOptions(
      configFor({ ...base, COOKIE_SECURE: "true" }),
    );

    expect(options.forSet(new Date()).secure).toBe(true);
  });

  it("rejects SameSite=None without Secure, which browsers discard", () => {
    expect(
      () =>
        new RefreshCookieOptions(
          configFor({
            ...base,
            COOKIE_REFRESH_SAMESITE: "None",
            COOKIE_SECURE: "false",
          }),
        ),
    ).toThrow(/COOKIE_SECURE/);
  });

  it("rejects an unrecognized SameSite value", () => {
    expect(
      () =>
        new RefreshCookieOptions(
          configFor({ ...base, COOKIE_REFRESH_SAMESITE: "sometimes" }),
        ),
    ).toThrow(/COOKIE_REFRESH_SAMESITE/);
  });
});
