import { AssistantUnavailableError } from '../../../src/subsystems/assistant/core/domain/errors/assistant.errors';
import {
  LlmCompletion,
  LlmPort,
  LlmRequest,
} from '../../../src/subsystems/assistant/core/domain/ports/llm.port';

/**
 * Language model for the integration suite: no test ever calls Gemini.
 * Records every request and answers with whatever the spec queued, or with a
 * plain answer that cites `causas-registrar` when nothing is queued.
 */
export class FakeLlm implements LlmPort {
  readonly requests: LlmRequest[] = [];
  private readonly queue: (Partial<LlmCompletion> | Error)[] = [];

  async complete(request: LlmRequest): Promise<LlmCompletion> {
    this.requests.push(request);
    const next = this.queue.shift();
    if (next instanceof Error) throw next;
    return {
      text: 'Desde **Nueva causa**, en el menú lateral.\nFUENTES: causas-registrar',
      outcome: 'COMPLETED',
      usage: { inputTokens: 1, outputTokens: 1, cachedInputTokens: null },
      ...next,
    };
  }

  answerNext(completion: Partial<LlmCompletion>): void {
    this.queue.push(completion);
  }

  failNext(error: Error = new AssistantUnavailableError('PROVIDER_ERROR')): void {
    this.queue.push(error);
  }

  reset(): void {
    this.requests.length = 0;
    this.queue.length = 0;
  }
}
