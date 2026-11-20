import { ConversationTurn } from '../value-objects/conversation.vo';

export const LLM_PORT = Symbol('LLM_PORT');

/** How the model's turn ended, in the assistant's own words (not a provider's). */
export type CompletionOutcome = 'COMPLETED' | 'REFUSED' | 'TRUNCATED';

/**
 * What the assistant asks of a language model, in its own vocabulary: no
 * type of any provider's SDK crosses into the core. Swapping Gemini for
 * Anthropic is writing another adapter of this port, nothing else
 * (plan §3).
 *
 * `tools` are left out until a profile needs them (the drafting assistant):
 * an option nobody uses is an option nobody tests.
 */
export interface LlmRequest {
  /** Provider model id, chosen by configuration per profile. */
  readonly model: string;
  /** Fixed instructions, with the manual. Stable text: providers cache it. */
  readonly system: string;
  readonly turns: readonly ConversationTurn[];
  readonly maxOutputTokens: number;
  /** Cancels the call, for instance when the client closes a stream. */
  readonly signal?: AbortSignal;
}

export interface LlmUsage {
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly cachedInputTokens: number | null;
}

export interface LlmCompletion {
  readonly text: string;
  readonly outcome: CompletionOutcome;
  readonly usage: LlmUsage;
}

/**
 * One event of a streamed answer: pieces of text as they are generated, then
 * one `end` with how the turn ended.
 */
export type LlmStreamEvent =
  | { readonly type: 'delta'; readonly text: string }
  | { readonly type: 'end'; readonly outcome: CompletionOutcome; readonly usage: LlmUsage };

export interface LlmPort {
  /**
   * @throws AssistantUnavailableError when the provider does not answer, takes
   *   too long, runs out of quota or rejects the request.
   */
  complete(request: LlmRequest): Promise<LlmCompletion>;

  /**
   * The same answer, piece by piece (proposal §2, "Respuesta en streaming").
   * Always ends with one `end` event when it finishes normally.
   *
   * @throws AssistantUnavailableError while iterating, before the first event
   *   or in the middle, with the same meaning as in `complete`.
   */
  stream(request: LlmRequest): AsyncIterable<LlmStreamEvent>;
}
