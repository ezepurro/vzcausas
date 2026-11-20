import { ConfigService } from '@nestjs/config';
import { ClockPort } from '@shared/domain/clock.port';
import { TooManyAssistantRequestsError } from '../../../core/domain/errors/assistant.errors';
import { UsageLimits } from '../../../core/domain/value-objects/usage-limits.vo';
import { InMemoryAssistantQuota } from './in-memory-assistant-quota';

const clock: ClockPort = {
  now: () => new Date('2026-11-20T12:00:00.000Z'),
  today: () => new Date('2026-11-20T00:00:00.000Z'),
};

/*
 * The windows themselves are tested in `question-history.vo.spec.ts`. Here,
 * only what the adapter adds: one history per user, kept between calls, and
 * the limits read from configuration.
 */
describe('InMemoryAssistantQuota (C13)', () => {
  it('keeps one history per user', () => {
    const quota = new InMemoryAssistantQuota(clock, UsageLimits.create({ perMinute: 1, perDay: 60 }));

    quota.consume(1);

    expect(() => quota.consume(2)).not.toThrow();
    expect(() => quota.consume(1)).toThrow(TooManyAssistantRequestsError);
  });

  it('reads the limits from configuration, with 6 and 60 by default', () => {
    const config = new ConfigService({ ASSISTANT_LIMIT_PER_MINUTE: '2' });
    const quota = InMemoryAssistantQuota.fromConfig(clock, config);

    quota.consume(1);
    quota.consume(1);

    expect(() => quota.consume(1)).toThrow(TooManyAssistantRequestsError);
  });

  it('refuses a limit that is not a positive integer', () => {
    expect(() =>
      InMemoryAssistantQuota.fromConfig(clock, new ConfigService({ ASSISTANT_LIMIT_PER_DAY: 'muchos' })),
    ).toThrow(/ASSISTANT_LIMIT_PER_DAY/);
  });
});
