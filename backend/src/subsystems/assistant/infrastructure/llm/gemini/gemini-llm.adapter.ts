import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerateContentParameters, GenerateContentResponse, GoogleGenAI } from '@google/genai';
import { AssistantUnavailableError } from '../../../core/domain/errors/assistant.errors';
import { LlmCompletion, LlmPort, LlmRequest } from '../../../core/domain/ports/llm.port';
import { positiveIntFromConfig } from '../../config/positive-int';
import { GeminiMapper } from './gemini.mapper';

/** The one call of the SDK the adapter uses: what a test replaces. */
export interface GeminiModels {
  generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse>;
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
 * Makes the call and logs it; what each answer and each error means is
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
      response = await this.models.generateContent({
        model: request.model,
        contents: GeminiMapper.toContents(request),
        config: {
          systemInstruction: request.system,
          maxOutputTokens: request.maxOutputTokens,
          abortSignal: AbortSignal.timeout(this.timeoutMs),
        },
      });
    } catch (error) {
      const failure = GeminiMapper.toFailure(error);
      this.logger[failure.reason === 'MISCONFIGURED' ? 'error' : 'warn'](
        `model=${request.model} failed reason=${failure.reason}${failure.status ? ` status=${failure.status}` : ''} ms=${Date.now() - startedAt}`,
      );
      throw new AssistantUnavailableError(failure.reason, failure.status ? `HTTP ${failure.status}` : undefined);
    }

    const completion = GeminiMapper.toCompletion(response);
    this.logger.log(
      `model=${request.model} outcome=${completion.outcome} ms=${Date.now() - startedAt} ` +
        `inputTokens=${completion.usage.inputTokens ?? '-'} cachedTokens=${completion.usage.cachedInputTokens ?? '-'} ` +
        `outputTokens=${completion.usage.outputTokens ?? '-'}`,
    );
    return completion;
  }
}
