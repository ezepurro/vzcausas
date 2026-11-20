import { AssistantUnavailableError } from '../../../src/subsystems/assistant/core/domain/errors/assistant.errors';
import {
  LlmCompletion,
  LlmPort,
  LlmRequest,
  LlmStreamEvent,
} from '../../../src/subsystems/assistant/core/domain/ports/llm.port';

const DEFAULT_TEXT = 'Desde **Nueva causa**, en el menú lateral.\nFUENTES: causas-registrar';
const USAGE = { inputTokens: 1, outputTokens: 1, cachedInputTokens: null };

/**
 * Language model for the integration suite: no test ever calls Gemini.
 * Records every request and answers with whatever the spec queued, or with a
 * plain answer that cites `causas-registrar` when nothing is queued. The
 * stream sends that same answer word by word.
 */
export class FakeLlm implements LlmPort {
  readonly requests: LlmRequest[] = [];
  private readonly queue: (Partial<LlmCompletion> | Error)[] = [];
  /** For the stream: throw this error after that many deltas. */
  private failMidway: { deltas: number; error: Error } | null = null;

  async complete(request: LlmRequest): Promise<LlmCompletion> {
    this.requests.push(request);
    const next = this.queue.shift();
    if (next instanceof Error) throw next;
    return { text: DEFAULT_TEXT, outcome: 'COMPLETED', usage: USAGE, ...next };
  }

  async *stream(request: LlmRequest): AsyncGenerator<LlmStreamEvent> {
    this.requests.push(request);
    const next = this.queue.shift();
    if (next instanceof Error) throw next;
    const completion = { text: DEFAULT_TEXT, outcome: 'COMPLETED' as const, ...next };

    for (const [index, text] of completion.text.split(/(?<= )/).entries()) {
      if (this.failMidway && index === this.failMidway.deltas) throw this.failMidway.error;
      yield { type: 'delta', text };
    }
    yield { type: 'end', outcome: completion.outcome, usage: USAGE };
  }

  answerNext(completion: Partial<LlmCompletion>): void {
    this.queue.push(completion);
  }

  failNext(error: Error = new AssistantUnavailableError('PROVIDER_ERROR')): void {
    this.queue.push(error);
  }

  failStreamAfter(deltas: number, error: Error = new AssistantUnavailableError('NETWORK')): void {
    this.failMidway = { deltas, error };
  }

  reset(): void {
    this.requests.length = 0;
    this.queue.length = 0;
    this.failMidway = null;
  }
}
