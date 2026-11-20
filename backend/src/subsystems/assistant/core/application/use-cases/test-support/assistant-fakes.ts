import { AssistantQuotaPort } from '../../../domain/ports/assistant-quota.port';
import { HelpManualPort } from '../../../domain/ports/help-manual.port';
import { LlmCompletion, LlmPort, LlmRequest, LlmStreamEvent } from '../../../domain/ports/llm.port';
import { AssistantProfile } from '../../../domain/profiles/assistant-profile';
import { HelpManual } from '../../../domain/value-objects/help-manual.vo';

/** A one-section manual, enough for the use case. */
export const testManual = HelpManual.create([
  { id: 'causas-registrar', title: 'Registrar una causa', body: 'Con Nueva causa.' },
]);

export class StaticManual implements HelpManualPort {
  constructor(private readonly manual: HelpManual = testManual) {}

  async load(): Promise<HelpManual> {
    return this.manual;
  }
}

/** A profile with recognisable values, so a spec can tell them apart in the request. */
export const testProfile: AssistantProfile = {
  model: 'modelo-de-prueba',
  maxOutputTokens: 700,
  instructions: (manual) => `REGLAS\n${manual.render()}`,
};

/** Records every request; answers with `next` (or a plain cited answer), or throws it. */
export class FakeLlmPort implements LlmPort {
  readonly requests: LlmRequest[] = [];

  constructor(public next: Partial<LlmCompletion> | Error = {}) {}

  async complete(request: LlmRequest): Promise<LlmCompletion> {
    this.requests.push(request);
    if (this.next instanceof Error) throw this.next;
    return {
      text: 'Respuesta.\nFUENTES: causas-registrar',
      outcome: 'COMPLETED',
      usage: { inputTokens: 10, outputTokens: 5, cachedInputTokens: null },
      ...this.next,
    };
  }

  /**
   * Streams `next` as `chunks` (or the same default answer split by words).
   * With `failAfter`, throws that error after that many deltas.
   */
  chunks: string[] | null = null;
  failAfter: { deltas: number; error: Error } | null = null;

  async *stream(request: LlmRequest): AsyncGenerator<LlmStreamEvent> {
    this.requests.push(request);
    if (this.next instanceof Error) throw this.next;
    const completion = { text: 'Respuesta.\nFUENTES: causas-registrar', outcome: 'COMPLETED' as const, ...this.next };
    const chunks = this.chunks ?? completion.text.split(/(?<= )/);
    for (const [index, text] of chunks.entries()) {
      if (this.failAfter && index === this.failAfter.deltas) throw this.failAfter.error;
      yield { type: 'delta', text };
    }
    yield { type: 'end', outcome: completion.outcome, usage: { inputTokens: 10, outputTokens: 5, cachedInputTokens: null } };
  }
}

/** Records who consumed quota; throws `rejectWith` instead when set. */
export class RecordingQuota implements AssistantQuotaPort {
  readonly consumedBy: number[] = [];
  rejectWith: Error | null = null;

  consume(userId: number): void {
    if (this.rejectWith) throw this.rejectWith;
    this.consumedBy.push(userId);
  }
}
