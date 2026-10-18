/**
 * DI token for the session inactivity window, in seconds (CA-1.6).
 *
 * Not a port in the usual sense — there is no interface, just a
 * number — but it earns a Symbol token for the same reason `CLOCK`
 * does: two independent consumers need the exact same value and
 * neither should read `SESSION_INACTIVITY_TTL` from `ConfigService`
 * on its own.
 *
 * `AccessTokenVerifierAdapter` uses it to decide whether an access
 * token's session has gone idle; `RefreshSessionUseCase` uses it to
 * refuse rotating a refresh token that has sat unused past the same
 * window — without that second check, the frontend's automatic silent
 * renewal (triggered the instant the access-token check above starts
 * failing) would resurrect an idle session on its very next request,
 * and the criterion would never actually fire. Centralizing the parsed
 * value is what keeps the two checks from drifting to two different
 * numbers if the format of `SESSION_INACTIVITY_TTL` ever changes.
 *
 * Every use case in this codebase is built from typed ports and plain
 * values so it stays testable without Nest (`MODULO_AUTH.md` §5); a
 * raw `ConfigService` injected into `RefreshSessionUseCase` would
 * break that. Parsing happens once, in `IdentityModule`'s provider
 * factory — consistent with `JWT_ACCESS_TTL` and `JWT_REFRESH_TTL`,
 * which fail the bootstrap rather than the first request if malformed.
 */
export const SESSION_INACTIVITY_SECONDS = Symbol("SESSION_INACTIVITY_SECONDS");
