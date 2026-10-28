import { Injectable } from '@nestjs/common';
import { DeadlineCalculatorPort } from '../../core/domain/ports/procedural-act/deadline-calculator.port';
import { DayType } from '../../core/domain/value-objects/deadline/day-type';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Provisional {@link DeadlineCalculatorPort}: a business day is any day from
 * Monday to Friday. It knows no holidays nor the judicial recess (P-02, API
 * contract §4); when `deadlines` has the judicial calendar it replaces this adapter.
 *
 * The dates are civil dates read at midnight UTC, so the week day is the UTC one.
 */
@Injectable()
export class BusinessDaysDeadlineCalculatorAdapter implements DeadlineCalculatorPort {
  async computeDueDate(countsFrom: Date, days: number, dayType: DayType): Promise<Date> {
    if (days < 1 || dayType === DayType.NONE) {
      throw new Error('Only a term of at least one day has a due date to compute.');
    }

    if (dayType === DayType.CONSECUTIVE) {
      return new Date(countsFrom.getTime() + days * ONE_DAY_MS);
    }

    // Business days count from the day after, skipping Saturdays and Sundays.
    let current = countsFrom;
    let remaining = days;
    while (remaining > 0) {
      current = new Date(current.getTime() + ONE_DAY_MS);
      const weekDay = current.getUTCDay();
      if (weekDay !== 0 && weekDay !== 6) {
        remaining--;
      }
    }
    return current;
  }

  async businessDaysUntil(from: Date, to: Date): Promise<number> {
    if (to.getTime() === from.getTime()) {
      return 0;
    }

    // Counting backwards is the same count, with the sign changed.
    const isForward = to > from;
    const [start, end] = isForward ? [from, to] : [to, from];

    let count = 0;
    let current = start;
    while (current < end) {
      current = new Date(current.getTime() + ONE_DAY_MS);
      const weekDay = current.getUTCDay();
      if (weekDay !== 0 && weekDay !== 6) {
        count++;
      }
    }
    return isForward ? count : -count;
  }
}
