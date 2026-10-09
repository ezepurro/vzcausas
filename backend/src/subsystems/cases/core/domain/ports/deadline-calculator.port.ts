import { DayType } from '../value-objects/day-type';

/** DI token for {@link DeadlineCalculatorPort}. */
export const DEADLINE_CALCULATOR = Symbol('DEADLINE_CALCULATOR');

/**
 * Port towards the calculation of due dates (RN5). It will be provided by
 * `deadlines`, which will know the judicial calendar; until then an adapter
 * of `cases` counts only the working days from Monday to Friday (P-02).
 */
export interface DeadlineCalculatorPort {
  /**
   * The due date of a term of `days` days that starts counting from `countsFrom`:
   * business days are counted from the day after, consecutive days one by one.
   * Only called for terms of at least one day.
   */
  computeDueDate(countsFrom: Date, days: number, dayType: DayType): Promise<Date>;

  /**
   * The business days between `from` (excluded) and `to` (included): `0` when
   * they are the same day, negative when `to` is before `from` (a term that has
   * already run out). API contract §4, `businessDaysRemaining`.
   */
  businessDaysUntil(from: Date, to: Date): Promise<number>;
}
