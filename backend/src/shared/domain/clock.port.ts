/**
 * DI token for the {@link ClockPort}. TypeScript interfaces are erased
 * at runtime, so NestJS needs a concrete identifier to resolve the
 * dependency. See D-09 in IMPLEMENTACION_AUTH.md for the
 * Symbol-as-token convention adopted across the project.
 */
export const CLOCK = Symbol("CLOCK");

/**
 * Injectable clock abstraction. The domain never calls `new Date()`
 * directly; it depends on this port so tests can substitute a fake
 * clock and verify time-sensitive behavior (token expiry, deadline
 * calculations) without waiting real time.
 *
 * `today()` was deferred under D-15 until a use case needed it.
 * HU-8 is that use case: a client's `clientSince` is a civil date in
 * the study's calendar, not an instant.
 */
export interface ClockPort {
  now(): Date;

  /**
   * Today's civil date in the study's timezone, at midnight UTC.
   *
   * The distinction from {@link ClockPort.now} matters around the
   * edges of the day: at 22:00 in Córdoba it is already tomorrow in
   * UTC, so a date derived from `now()` would file the client under
   * the wrong day. The same reason the `Client` model forbids
   * `CURRENT_DATE`, which runs in the database server's timezone.
   *
   * Returned at midnight UTC so it round-trips through Postgres'
   * `date` column unchanged, whatever the driver's timezone.
   */
  today(): Date;
}
