/**
 * DI token for the management mailbox address (RNF 5, D-79) — "la
 * casilla", always copied on every digest (CA-30.4).
 *
 * Not a port in the usual sense — there is no interface, just a string
 * — same criterion as `SESSION_INACTIVITY_SECONDS`
 * (`identity/core/domain/ports/session-inactivity.port.ts`): Symbol-tokened
 * so `SendDailyNotificationDigestUseCase` stays built from typed ports
 * and plain values, never a raw `ConfigService` (testable without Nest).
 *
 * Where this value actually comes from (env var, a settings table) is
 * still open — QN-03, `IMPLEMENTACION_NOTIFICACIONES.md`. The use case
 * only consumes it already resolved.
 */
export const MANAGEMENT_MAILBOX = Symbol('MANAGEMENT_MAILBOX');

/**
 * DI token for whether the digest also copies each responsible lawyer
 * (D-79, CA-30.5) — "config del servidor, no de pantalla". Same QN-03
 * caveat as {@link MANAGEMENT_MAILBOX}.
 */
export const COPY_TO_RESPONSIBLE_LAWYER = Symbol('COPY_TO_RESPONSIBLE_LAWYER');
