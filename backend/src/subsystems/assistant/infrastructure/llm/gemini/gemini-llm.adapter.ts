import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerateContentParameters, GenerateContentResponse, GoogleGenAI } from '@google/genai';
import { AssistantUnavailableError } from '../../../core/domain/errors/assistant.errors';
import {
  CompletionOutcome,
  LlmCompletion,
  LlmPort,
  LlmRequest,
  LlmStreamEvent,
  LlmUsage,
} from '../../../core/domain/ports/llm.port';
import { positiveIntFromConfig } from '../../config/positive-int';
import { GeminiMapper } from './gemini.mapper';

/** The two calls of the SDK the adapter uses: what a test replaces. */
export interface GeminiModels {
  generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse>;
  generateContentStream(params: GenerateContentParameters): Promise<AsyncGenerator<GenerateContentResponse>>;
}

export interface GeminiOptions {
  readonly apiKey: string;
  /** Whole request, retries included. */
  readonly timeoutMs: number;
}

/**
 * `LlmPort` over the Gemini API (`@google/genai`, pinned at exactly 2.32.0:
 * a release with some weeks behind it, and the one whose type definitions
 * every identifier used here was checked against; 3.x is not adopted blind).
 *
 * Makes the calls and logs them; what each answer and each error means is
 * `GeminiMapper`'s job. The demo runs on the free tier: Google uses what it
 * receives to improve its products, which is why the assistant sends nothing
 * but the manual and the conversation (proposal §4). Moving to Anthropic is
 * writing the sibling of this class.
 *
 * Logs model, outcome, duration and tokens. **Never** the content of the
 * questions or the answers (`ARQUITECTURA_BACKEND_V1.md:694`).
 */
export class GeminiLlmAdapter implements LlmPort {
  static readonly DEFAULT_TIMEOUT_MS = 30_000;

  private readonly logger = new Logger('GeminiLlm');

  constructor(
    private readonly models: GeminiModels,
    private readonly timeoutMs: number,
  ) {}

  static create(options: GeminiOptions): GeminiLlmAdapter {
    if (!options.apiKey.trim()) {
      throw new Error('Falta GEMINI_API_KEY: el asistente está configurado con Gemini y no tiene clave.');
    }
    if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1000) {
      throw new Error(`ASSISTANT_TIMEOUT_MS debe ser un entero de al menos 1000, llegó ${options.timeoutMs}.`);
    }
    const client = new GoogleGenAI({
      apiKey: options.apiKey,
      // One retry at most: the user is waiting in front of the panel, and the
      // SDK's default (5 attempts with backoff) could keep them a minute.
      httpOptions: { timeout: options.timeoutMs, retryOptions: { attempts: 2 } },
    });
    return new GeminiLlmAdapter(client.models, options.timeoutMs);
  }

  /** Reads its own variables: `GEMINI_API_KEY` and `ASSISTANT_TIMEOUT_MS` (30 000 ms). */
  static fromConfig(config: ConfigService): GeminiLlmAdapter {
    return GeminiLlmAdapter.create({
      apiKey: config.get<string>('GEMINI_API_KEY') ?? '',
      timeoutMs: positiveIntFromConfig(config, 'ASSISTANT_TIMEOUT_MS', GeminiLlmAdapter.DEFAULT_TIMEOUT_MS),
    });
  }

  async complete(request: LlmRequest): Promise<LlmCompletion> {
    const startedAt = Date.now();
    let response: GenerateContentResponse;

    try {
      response = await this.models.generateContent(this.toParams(request));
    } catch (error) {
      throw this.unavailable(error, request, startedAt);
    }

    const completion = GeminiMapper.toCompletion(response);
    this.logDone(request, completion.outcome, completion.usage, startedAt);
    return completion;
  }

  async *stream(request: LlmRequest): AsyncGenerator<LlmStreamEvent> {
    const startedAt = Date.now();
    // Gemini reports a blocked prompt in the first chunk, and the finish
    // reason and the usage in the last ones.
    let blocked = false;
    let last: GenerateContentResponse | null = null;

    try {
      const chunks = await this.models.generateContentStream(this.toParams(request));
      for await (const chunk of chunks) {
        if (chunk.promptFeedback?.blockReason) blocked = true;
        last = chunk;
        const text = GeminiMapper.toText(chunk);
        if (text && !blocked) yield { type: 'delta', text };
      }
    } catch (error) {
      throw this.unavailable(error, request, startedAt);
    }

    const outcome: CompletionOutcome = blocked ? 'REFUSED' : last ? GeminiMapper.toOutcome(last) : 'COMPLETED';
    const usage = last ? GeminiMapper.toUsage(last) : { inputTokens: null, outputTokens: null, cachedInputTokens: null };
    this.logDone(request, outcome, usage, startedAt, 'stream');
    yield { type: 'end', outcome, usage };
  }

  private toParams(request: LlmRequest): GenerateContentParameters {
    const timeout = AbortSignal.timeout(this.timeoutMs);
    return {
      model: request.model,
      contents: GeminiMapper.toContents(request),
      config: {
        systemInstruction: request.system,
        maxOutputTokens: request.maxOutputTokens,
        // Whichever comes first: the timeout or the caller cancelling.
        abortSignal: request.signal ? AbortSignal.any([timeout, request.signal]) : timeout,
      },
    };
  }

  private unavailable(error: unknown, request: LlmRequest, startedAt: number): AssistantUnavailableError {
    const failure = GeminiMapper.toFailure(error);
    this.logger[failure.reason === 'MISCONFIGURED' ? 'error' : 'warn'](
      `model=${request.model} failed reason=${failure.reason}${failure.status ? ` status=${failure.status}` : ''} ms=${Date.now() - startedAt}`,
    );
    return new AssistantUnavailableError(failure.reason, failure.status ? `HTTP ${failure.status}` : undefined);
  }

  private logDone(
    request: LlmRequest,
    outcome: CompletionOutcome,
    usage: LlmUsage,
    startedAt: number,
    mode: 'json' | 'stream' = 'json',
  ): void {
    this.logger.log(
      `model=${request.model} mode=${mode} outcome=${outcome} ms=${Date.now() - startedAt} ` +
        `inputTokens=${usage.inputTokens ?? '-'} cachedTokens=${usage.cachedInputTokens ?? '-'} ` +
        `outputTokens=${usage.outputTokens ?? '-'}`,
    );
  }
}
