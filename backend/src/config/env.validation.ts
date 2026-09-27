/**
 * Startup check that every mandatory environment variable is present
 * and non-empty.
 *
 * Written by hand instead of on top of a schema library: the adapters
 * already validate the *format* of whatever each one owns, inside their
 * own constructors — token lifetimes, secret length, hashing cost,
 * cookie attribute coherence. What was missing was the *presence* of
 * all of them at once, reported as a single readable failure instead of
 * one variable at a time across four constructors. That is a few dozen
 * lines, not a dependency.
 *
 * It sits next to the root module rather than in the shared kernel: the
 * list below names variables owned by individual subsystems, and the
 * kernel is what every subsystem depends on. The root module is the
 * composition point, and the only place legitimately allowed to know
 * the full inventory.
 */

/**
 * Variables the application requires in order to serve a request.
 *
 * The development seed credentials are deliberately absent: they are
 * optional by design, and the service reading them degrades to a
 * warning when they are missing rather than blocking startup.
 */
const REQUIRED_VARS = [
  "NODE_ENV",
  "PORT",
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_ACCESS_TTL",
  "JWT_REFRESH_TTL",
  "BCRYPT_COST",
  "COOKIE_REFRESH_NAME",
  "COOKIE_REFRESH_PATH",
  "COOKIE_REFRESH_SAMESITE",
  "COOKIE_SECURE",
  "CORS_ALLOWED_ORIGINS",
  "APP_TIMEZONE",
] as const;

const KNOWN_ENVIRONMENTS = ["development", "test", "production"] as const;

/**
 * Hook for the configuration module's `validate` option. It receives the
 * merged environment once at startup and returns it untouched: this
 * function validates, it never transforms.
 *
 * @throws {Error} listing *all* offending variables at once. Failing on
 *   the first one turns a fresh checkout into several consecutive
 *   restarts, each revealing one more missing value.
 */
export function validateEnv(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED_VARS.filter((name) => {
    const value = raw[name];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing or empty required environment variables: ${missing.join(", ")}. ` +
        `See backend/.env.example for the expected set.`,
    );
  }

  const nodeEnv = String(raw.NODE_ENV);
  if (
    !KNOWN_ENVIRONMENTS.includes(nodeEnv as (typeof KNOWN_ENVIRONMENTS)[number])
  ) {
    throw new Error(
      `NODE_ENV must be one of ${KNOWN_ENVIRONMENTS.join(", ")}; got ${JSON.stringify(nodeEnv)}. ` +
        `The value gates the development user seed, so a typo would ` +
        `silently skip it — or, worse, enable it outside development.`,
    );
  }

  // A non-numeric port throws nothing downstream: listening on `NaN`
  // binds a random free port instead, and the frontend then fails to
  // connect with nothing in the logs pointing at the cause.
  const port = Number(raw.PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(
      `PORT must be an integer between 1 and 65535; got ${JSON.stringify(raw.PORT)}.`,
    );
  }

  return raw;
}
