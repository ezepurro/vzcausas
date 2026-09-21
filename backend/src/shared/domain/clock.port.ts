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
 * `today()` (midnight in the study's timezone) is intentionally not
 * exposed yet; it will be added when the first `deadlines` use case
 * requires it. See D-15.
 */
export interface ClockPort {
  now(): Date;
}
