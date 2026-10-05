import { DayType } from './day-type';

/**
 * Deadline opened by a procedural act. A copy of the state's time limit
 * at registration time: changing the state later does not alter it.
 * The current due date is `manualDueDate ?? computedDueDate`.
 */
export interface Deadline {
  timeLimitDays: number;
  dayType: DayType;
  countsFrom: Date;
  computedDueDate: Date | null;
  manualDueDate: Date | null;
}
