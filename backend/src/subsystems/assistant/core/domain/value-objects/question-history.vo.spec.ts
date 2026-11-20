import { TooManyAssistantRequestsError } from '../errors/assistant.errors';
import { QuestionHistory } from './question-history.vo';
import { UsageLimits } from './usage-limits.vo';

const START = Date.parse('2026-11-20T12:00:00.000Z');
const at = (seconds: number) => new Date(START + seconds * 1000);

function retryAfter(act: () => unknown): number {
  try {
    act();
  } catch (error) {
    expect(error).toBeInstanceOf(TooManyAssistantRequestsError);
    expect(error).toMatchObject({
      code: 'TOO_MANY_REQUESTS',
      message: 'Hiciste muchas preguntas seguidas. Esperá un momento antes de volver a preguntar.',
    });
    return (error as TooManyAssistantRequestsError).details!.retryAfterSeconds as number;
  }
  throw new Error('expected the history to reject the question');
}

describe('QuestionHistory (C13)', () => {
  it('lets 6 questions through in a minute and rejects the 7th with the exact wait', () => {
    const limits = UsageLimits.create({ perMinute: 6, perDay: 60 });
    let history = QuestionHistory.empty();
    for (let i = 0; i < 6; i++) history = history.record(at(i * 5), limits);

    // The first question was at 0 s; at 30 s it leaves the window in 30 s.
    expect(retryAfter(() => history.record(at(30), limits))).toBe(30);
    expect(() => history.record(at(60), limits)).not.toThrow();
  });

  it('a rejected question changes nothing', () => {
    const limits = UsageLimits.create({ perMinute: 1, perDay: 60 });
    const history = QuestionHistory.empty().record(at(0), limits);

    for (let i = 1; i <= 5; i++) expect(() => history.record(at(i), limits)).toThrow();

    // If the rejected ones had counted, the last of them (5 s) would still block at 60 s.
    expect(() => history.record(at(60), limits)).not.toThrow();
  });

  it('applies the 24-hour window, waiting until the oldest question leaves it', () => {
    const limits = UsageLimits.create({ perMinute: 100, perDay: 3 });
    const history = QuestionHistory.empty()
      .record(at(0), limits)
      .record(at(3600), limits)
      .record(at(3600), limits);

    // The first one was an hour before: 23 hours to go.
    expect(retryAfter(() => history.record(at(3600), limits))).toBe(23 * 3600);
    expect(() => history.record(at(24 * 3600), limits)).not.toThrow();
  });

  it('forgets what is older than 24 hours', () => {
    const limits = UsageLimits.create({ perMinute: 100, perDay: 1 });
    const history = QuestionHistory.empty().record(at(0), limits).record(at(25 * 3600), limits);

    // Only the question at 25 h is left: one more inside its day is rejected.
    expect(() => history.record(at(26 * 3600), limits)).toThrow(TooManyAssistantRequestsError);
  });
});

describe('UsageLimits', () => {
  it('rejects limits that are not positive integers, all at once', () => {
    expect(() => UsageLimits.create({ perMinute: 0, perDay: 1.5 })).toThrow(/perMinute.*perDay/);
  });
});
