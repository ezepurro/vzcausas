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
 */
export interface ClockPort {
  /** The current instant. */
  now(): Date;

  /**
   * Today's civil date in the study's time zone (Córdoba), at midnight UTC,
   * the way a `date` column is read and written. See D-15.
   */
  today(): Date;
}
