import { TooManyAssistantRequestsError } from '../errors/assistant.errors';
import { UsageLimits } from './usage-limits.vo';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * The questions one user asked in the last 24 hours, and the rule of the
 * per-user limit (proposal §3): two **sliding** windows, the last minute and
 * the last 24 hours. Sliding and not per calendar day so it needs no time
 * zone and nobody gets a fresh quota just by waiting for midnight.
 *
 * Immutable: `record` returns the new history and leaves this one as it was,
 * so a rejected question changes nothing (it is not counted). Takes the time
 * as an argument and knows no clock or storage: where the histories are kept
 * is the adapter's business.
 */
export class QuestionHistory {
  /** Times (ms) of the questions, oldest first. */
  private constructor(private readonly askedAt: readonly number[]) {}

  static empty(): QuestionHistory {
    return new QuestionHistory([]);
  }

  /**
   * Counts a question asked at `now`.
   *
   * @throws TooManyAssistantRequestsError when it goes over a window, with the
   *   seconds until the question that blocks it leaves that window.
   */
  record(now: Date, limits: UsageLimits): QuestionHistory {
    const at = now.getTime();
    const lastDay = this.askedAt.filter((time) => time > at - DAY_MS);
    const lastMinute = lastDay.filter((time) => time > at - MINUTE_MS);

    const waitsMs: number[] = [];
    if (lastMinute.length >= limits.perMinute) {
      waitsMs.push(lastMinute[lastMinute.length - limits.perMinute] + MINUTE_MS - at);
    }
    if (lastDay.length >= limits.perDay) {
      waitsMs.push(lastDay[lastDay.length - limits.perDay] + DAY_MS - at);
    }

    if (waitsMs.length > 0) {
      throw new TooManyAssistantRequestsError(Math.max(1, Math.ceil(Math.max(...waitsMs) / 1000)));
    }

    return new QuestionHistory([...lastDay, at]);
  }
}
