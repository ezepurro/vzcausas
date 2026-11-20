import { ApiError, Content, FinishReason, GenerateContentResponse } from '@google/genai';
import { AssistantFailureReason } from '../../../core/domain/errors/assistant.errors';
import { CompletionOutcome, LlmCompletion, LlmRequest } from '../../../core/domain/ports/llm.port';

export interface GeminiFailure {
  readonly reason: AssistantFailureReason;
  readonly status?: number;
}

/**
 * Translates between the assistant's vocabulary (`LlmPort`) and Gemini's
 * (`@google/genai` 2.32.0): the request on the way out, the response and the
 * errors on the way back. Same role as `drive-error.mapper.ts` for Drive:
 * the adapter makes the call, this class knows what each answer means.
 */
export class GeminiMapper {
  /**
   * Finish reasons that mean "the model would not answer this", as opposed to
   * "it answered" (STOP) or "it ran out of room" (MAX_TOKENS). Verified against
   * the `FinishReason` enum of `@google/genai` 2.32.0.
   */
  private static readonly REFUSAL_REASONS: ReadonlySet<string> = new Set([
    FinishReason.SAFETY,
    FinishReason.RECITATION,
    FinishReason.BLOCKLIST,
    FinishReason.PROHIBITED_CONTENT,
    FinishReason.LANGUAGE,
    FinishReason.OTHER,
  ]);

  /** The conversation as Gemini wants it: the assistant's turns are called "model". */
  static toContents(request: LlmRequest): Content[] {
    return request.turns.map((turn) => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    }));
  }

  static toCompletion(response: GenerateContentResponse): LlmCompletion {
    const usage = {
      inputTokens: response.usageMetadata?.promptTokenCount ?? null,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
      cachedInputTokens: response.usageMetadata?.cachedContentTokenCount ?? null,
    };

    if (response.promptFeedback?.blockReason) {
      return { text: '', outcome: 'REFUSED', usage };
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    let outcome: CompletionOutcome = 'COMPLETED';
    if (finishReason === FinishReason.MAX_TOKENS) outcome = 'TRUNCATED';
    else if (finishReason && GeminiMapper.REFUSAL_REASONS.has(finishReason)) outcome = 'REFUSED';

    return { text: GeminiMapper.readText(response), outcome, usage };
  }

  static toFailure(error: unknown): GeminiFailure {
    if (error instanceof ApiError) {
      const status = error.status;
      if (status === 429) return { reason: 'RATE_LIMITED', status };
      if (status === 408 || status === 504) return { reason: 'TIMEOUT', status };
      if (status >= 500) return { reason: 'PROVIDER_ERROR', status };
      // 400, 401, 403, 404: a wrong key, a model id that does not exist, a
      // request the API rejects. Nothing the user can fix by retrying.
      return { reason: 'MISCONFIGURED', status };
    }
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      return { reason: 'TIMEOUT' };
    }
    return { reason: 'NETWORK' };
  }

  /** `response.text` joins the text parts of the first candidate; it can be undefined. */
  private static readText(response: GenerateContentResponse): string {
    try {
      return response.text ?? '';
    } catch {
      return '';
    }
  }
}
