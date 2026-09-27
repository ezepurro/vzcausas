const REQUIRED_VARS = [
  "NODE_ENV",
  "PORT",
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
        `See backend/.env.example and IMPLEMENTACION_AUTH.md.`,
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

  const port = Number(raw.PORT);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(
      `PORT must be an integer between 1 and 65535; got ${JSON.stringify(raw.PORT)}.`,
    );
  }

  return raw;
}
