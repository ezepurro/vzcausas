/**
 * `throttle-policy.ts` caches its parsed result in a module-level
 * variable (deliberately — see the file's own doc comment on why a
 * decorator closure cannot hold a constructor-validated value). That
 * means each scenario below needs a *fresh* module instance, or the
 * cache from an earlier test would mask what this one is checking.
 * `jest.resetModules()` plus a fresh `require()` per test is the
 * standard way to defeat that.
 */
describe("throttle-policy", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  function load(): typeof import("./throttle-policy") {
    return require("./throttle-policy");
  }

  it("parses a valid limit and window", () => {
    process.env.THROTTLE_AUTH_LIMIT = "10";
    process.env.THROTTLE_AUTH_WINDOW = "1m";

    const { authThrottleLimit, authThrottleTtlMs } = load();

    expect(authThrottleLimit()).toBe(10);
    expect(authThrottleTtlMs()).toBe(60_000);
  });

  it("throws naming the variable when the limit is missing", () => {
    process.env.THROTTLE_AUTH_WINDOW = "1m";
    delete process.env.THROTTLE_AUTH_LIMIT;

    const { authThrottleLimit } = load();

    expect(() => authThrottleLimit()).toThrow(/THROTTLE_AUTH_LIMIT/);
  });

  it("throws when the limit is not a positive integer", () => {
    process.env.THROTTLE_AUTH_LIMIT = "not-a-number";
    process.env.THROTTLE_AUTH_WINDOW = "1m";

    const { authThrottleLimit } = load();

    expect(() => authThrottleLimit()).toThrow(/THROTTLE_AUTH_LIMIT/);
  });

  it("throws when the limit is zero", () => {
    // A limit of zero would block every request silently rather than
    // rate-limit them, which is not what this variable is for.
    process.env.THROTTLE_AUTH_LIMIT = "0";
    process.env.THROTTLE_AUTH_WINDOW = "1m";

    const { authThrottleLimit } = load();

    expect(() => authThrottleLimit()).toThrow(/THROTTLE_AUTH_LIMIT/);
  });

  it("throws naming the variable when the window is missing", () => {
    process.env.THROTTLE_AUTH_LIMIT = "10";
    delete process.env.THROTTLE_AUTH_WINDOW;

    const { authThrottleTtlMs } = load();

    expect(() => authThrottleTtlMs()).toThrow(/THROTTLE_AUTH_WINDOW/);
  });

  it("throws on a malformed window, via the shared TTL parser", () => {
    process.env.THROTTLE_AUTH_LIMIT = "10";
    process.env.THROTTLE_AUTH_WINDOW = "soon";

    const { authThrottleTtlMs } = load();

    expect(() => authThrottleTtlMs()).toThrow(/TTL/);
  });

  it("caches after the first successful parse: a later env change is not picked up", () => {
    process.env.THROTTLE_AUTH_LIMIT = "10";
    process.env.THROTTLE_AUTH_WINDOW = "1m";
    const { authThrottleLimit } = load();

    expect(authThrottleLimit()).toBe(10);

    process.env.THROTTLE_AUTH_LIMIT = "20";
    expect(authThrottleLimit()).toBe(10);
  });

  it("does not cache a failed parse: a later fix is picked up", () => {
    delete process.env.THROTTLE_AUTH_LIMIT;
    process.env.THROTTLE_AUTH_WINDOW = "1m";
    const { authThrottleLimit } = load();

    expect(() => authThrottleLimit()).toThrow();

    process.env.THROTTLE_AUTH_LIMIT = "5";
    expect(authThrottleLimit()).toBe(5);
  });
});
