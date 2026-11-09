const TTL_PATTERN = /^(\d+)(s|m|h|d)$/;
const TTL_MULTIPLIERS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3_600,
  d: 86_400,
};

/**
 * Parses a compact TTL string like `"15m"` or `"7d"` into a positive
 * integer number of seconds.
 *
 * Only the `<digits>(s|m|h|d)` form is accepted (D-41). That covers
 * every TTL the project configures — `JWT_ACCESS_TTL` (D-04, 15m) and
 * `JWT_REFRESH_TTL` (D-04, 7d) — without pulling in a dependency such
 * as `ms` just to read two environment variables.
 *
 * Lives in `config/` rather than inside a single adapter: the
 * access-token issuer and the refresh-token store both need it, and
 * exporting it from one adapter so the other could import it would
 * leak that adapter's internals.
 *
 * Callers invoke this during construction, so a malformed value fails
 * the application bootstrap instead of surfacing on the first request.
 *
 * @throws {Error} if the value does not match the accepted format or
 *   does not resolve to a positive number of seconds.
 */
export function parseTtlToSeconds(value: string): number {
  const match = TTL_PATTERN.exec(value);
  if (!match) {
    throw new Error(
      `Invalid TTL value ${JSON.stringify(value)}: expected <digits>(s|m|h|d) (e.g. "15m", "7d").`,
    );
  }

  const seconds = Number.parseInt(match[1], 10) * TTL_MULTIPLIERS[match[2]];
  if (seconds <= 0) {
    throw new Error(
      `Invalid TTL value ${JSON.stringify(value)}: must resolve to a positive number of seconds.`,
    );
  }

  return seconds;
}
