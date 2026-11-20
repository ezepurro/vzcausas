import { ConfigService } from '@nestjs/config';
import { LlmPort } from '../../core/domain/ports/llm.port';
import { GeminiLlmAdapter } from './gemini/gemini-llm.adapter';

/** Providers the assistant knows. `anthropic` joins when the demo moves to it (plan §8). */
export const LLM_PROVIDERS = ['gemini'] as const;

/**
 * Chooses the adapter behind `LLM_PORT` from `ASSISTANT_LLM_PROVIDER`, the
 * same way `document-storage.factory.ts` chooses the storage. Each adapter
 * reads its own variables. An unknown provider stops the app: a typo there
 * would otherwise surface as a `502` on every question.
 */
export function createLlmProvider(config: ConfigService): LlmPort {
  const provider = (config.get<string>('ASSISTANT_LLM_PROVIDER') ?? '').trim().toLowerCase();

  switch (provider) {
    case 'gemini':
      return GeminiLlmAdapter.fromConfig(config);
    default:
      throw new Error(
        `ASSISTANT_LLM_PROVIDER="${provider}" no es un proveedor conocido (${LLM_PROVIDERS.join(', ')}).`,
      );
  }
}
