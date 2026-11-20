import { ConfigService } from '@nestjs/config';
import { ClockPort } from '@shared/domain/clock.port';
import { AssistantQuotaPort } from '../../../core/domain/ports/assistant-quota.port';
import { QuestionHistory } from '../../../core/domain/value-objects/question-history.vo';
import { UsageLimits } from '../../../core/domain/value-objects/usage-limits.vo';
import { positiveIntFromConfig } from '../../config/positive-int';

/**
 * Keeps each user's `QuestionHistory` in memory. The rule of the limit lives
 * in the history (domain); this class only stores it and supplies the time.
 *
 * In memory is enough for the single instance the demo runs on. With more
 * than one instance each would count on its own and the limit would multiply
 * by the number of instances: recorded as debt in the plan, not solved here.
 */
export class InMemoryAssistantQuota implements AssistantQuotaPort {
  private readonly histories = new Map<number, QuestionHistory>();

  constructor(
    private readonly clock: ClockPort,
    private readonly limits: UsageLimits,
  ) {}

  /** Reads `ASSISTANT_LIMIT_PER_MINUTE` (6) and `ASSISTANT_LIMIT_PER_DAY` (60). */
  static fromConfig(clock: ClockPort, config: ConfigService): InMemoryAssistantQuota {
    return new InMemoryAssistantQuota(
      clock,
      UsageLimits.create({
        perMinute: positiveIntFromConfig(config, 'ASSISTANT_LIMIT_PER_MINUTE', 6),
        perDay: positiveIntFromConfig(config, 'ASSISTANT_LIMIT_PER_DAY', 60),
      }),
    );
  }

  consume(userId: number): void {
    const history = this.histories.get(userId) ?? QuestionHistory.empty();
    this.histories.set(userId, history.record(this.clock.now(), this.limits));
  }
}
