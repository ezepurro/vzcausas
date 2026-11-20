import { ApiError, FinishReason, GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import { AssistantUnavailableError } from '../../../core/domain/errors/assistant.errors';
import { LlmRequest } from '../../../core/domain/ports/llm.port';
import { GeminiLlmAdapter, GeminiModels } from './gemini-llm.adapter';

const request: LlmRequest = {
  model: 'gemini-de-prueba',
  system: 'REGLAS',
  turns: [
    { role: 'user', content: 'Hola' },
    { role: 'assistant', content: '¿En qué te ayudo?' },
    { role: 'user', content: '¿Dónde registro una causa?' },
  ],
  maxOutputTokens: 900,
};

/** Builds what the SDK returns, with `text` derived from the parts like the real getter. */
function response(fields: {
  text?: string;
  finishReason?: FinishReason;
  blockReason?: string;
}): GenerateContentResponse {
  return {
    candidates:
      fields.text === undefined && !fields.finishReason
        ? []
        : [{ content: { role: 'model', parts: [{ text: fields.text ?? '' }] }, finishReason: fields.finishReason }],
    promptFeedback: fields.blockReason ? { blockReason: fields.blockReason } : undefined,
    usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 40, cachedContentTokenCount: 1000 },
    get text() {
      return fields.text;
    },
  } as unknown as GenerateContentResponse;
}

function adapterAnswering(result: GenerateContentResponse | Error, chunks: (GenerateContentResponse | Error)[] = []) {
  const calls: GenerateContentParameters[] = [];
  const models: GeminiModels = {
    generateContent: async (params) => {
      calls.push(params);
      if (result instanceof Error) throw result;
      return result;
    },
    generateContentStream: async (params) => {
      calls.push(params);
      if (result instanceof Error) throw result;
      return (async function* () {
        for (const chunk of chunks) {
          if (chunk instanceof Error) throw chunk;
          yield chunk;
        }
      })();
    },
  };
  return { adapter: new GeminiLlmAdapter(models, 30_000), calls };
}

async function collect(stream: AsyncIterable<unknown>) {
  const events: unknown[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

describe('GeminiLlmAdapter (C12)', () => {
  it('sends the instructions, the turns with Gemini roles and the output cap', async () => {
    const { adapter, calls } = adapterAnswering(response({ text: 'ok', finishReason: FinishReason.STOP }));

    await adapter.complete(request);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      model: 'gemini-de-prueba',
      contents: [
        { role: 'user', parts: [{ text: 'Hola' }] },
        { role: 'model', parts: [{ text: '¿En qué te ayudo?' }] },
        { role: 'user', parts: [{ text: '¿Dónde registro una causa?' }] },
      ],
      config: { systemInstruction: 'REGLAS', maxOutputTokens: 900 },
    });
    expect(calls[0].config?.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('a normal answer is COMPLETED, with its text and usage', async () => {
    const { adapter } = adapterAnswering(response({ text: 'Respuesta', finishReason: FinishReason.STOP }));

    await expect(adapter.complete(request)).resolves.toEqual({
      text: 'Respuesta',
      outcome: 'COMPLETED',
      usage: { inputTokens: 1200, outputTokens: 40, cachedInputTokens: 1000 },
    });
  });

  it('MAX_TOKENS is TRUNCATED and keeps the partial text', async () => {
    const { adapter } = adapterAnswering(response({ text: 'Primero', finishReason: FinishReason.MAX_TOKENS }));

    await expect(adapter.complete(request)).resolves.toMatchObject({ text: 'Primero', outcome: 'TRUNCATED' });
  });

  it.each([FinishReason.SAFETY, FinishReason.PROHIBITED_CONTENT, FinishReason.RECITATION])(
    '%s is REFUSED',
    async (finishReason) => {
      const { adapter } = adapterAnswering(response({ text: '', finishReason }));

      await expect(adapter.complete(request)).resolves.toMatchObject({ outcome: 'REFUSED' });
    },
  );

  it('a blocked prompt is REFUSED', async () => {
    const { adapter } = adapterAnswering(response({ blockReason: 'SAFETY' }));

    await expect(adapter.complete(request)).resolves.toMatchObject({ text: '', outcome: 'REFUSED' });
  });

  it.each([
    [429, 'RATE_LIMITED'],
    [503, 'PROVIDER_ERROR'],
    [504, 'TIMEOUT'],
    [400, 'MISCONFIGURED'],
    [403, 'MISCONFIGURED'],
  ])('ApiError %i becomes AssistantUnavailableError (%s)', async (status, reason) => {
    const { adapter } = adapterAnswering(new ApiError({ message: 'x', status }));

    const error = await adapter.complete(request).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AssistantUnavailableError);
    expect(error).toMatchObject({ code: 'ASSISTANT_UNAVAILABLE', reason });
  });

  it('a timeout and a network failure are AssistantUnavailableError too', async () => {
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });

    await expect(adapterAnswering(timeout).adapter.complete(request)).rejects.toMatchObject({ reason: 'TIMEOUT' });
    await expect(adapterAnswering(new TypeError('fetch failed')).adapter.complete(request)).rejects.toMatchObject({
      reason: 'NETWORK',
    });
  });

  describe('stream', () => {
    const ok = response({ text: '', finishReason: FinishReason.STOP });

    it('yields each chunk as a delta, then end with the finish reason and usage of the last one', async () => {
      const { adapter } = adapterAnswering(ok, [
        response({ text: 'Desde ' }),
        response({ text: 'Nueva causa.', finishReason: FinishReason.MAX_TOKENS }),
      ]);

      await expect(collect(adapter.stream(request))).resolves.toEqual([
        { type: 'delta', text: 'Desde ' },
        { type: 'delta', text: 'Nueva causa.' },
        { type: 'end', outcome: 'TRUNCATED', usage: { inputTokens: 1200, outputTokens: 40, cachedInputTokens: 1000 } },
      ]);
    });

    it('a prompt blocked in the first chunk ends REFUSED with no text', async () => {
      const { adapter } = adapterAnswering(ok, [response({ blockReason: 'SAFETY' })]);

      await expect(collect(adapter.stream(request))).resolves.toEqual([
        expect.objectContaining({ type: 'end', outcome: 'REFUSED' }),
      ]);
    });

    it('a failure to start or in the middle becomes AssistantUnavailableError', async () => {
      await expect(
        collect(adapterAnswering(new ApiError({ message: 'x', status: 429 })).adapter.stream(request)),
      ).rejects.toMatchObject({ code: 'ASSISTANT_UNAVAILABLE', reason: 'RATE_LIMITED' });

      const midway = adapterAnswering(ok, [response({ text: 'Uno ' }), new TypeError('socket hang up')]);
      await expect(collect(midway.adapter.stream(request))).rejects.toMatchObject({ reason: 'NETWORK' });
    });

    it('joins the caller signal with the timeout', async () => {
      const { adapter, calls } = adapterAnswering(ok, [ok]);
      const controller = new AbortController();

      await collect(adapter.stream({ ...request, signal: controller.signal }));
      controller.abort();

      expect(calls[0].config?.abortSignal?.aborted).toBe(true);
    });
  });

  it('refuses to start without a key or with a silly timeout', () => {
    expect(() => GeminiLlmAdapter.create({ apiKey: ' ', timeoutMs: 30_000 })).toThrow(/GEMINI_API_KEY/);
    expect(() => GeminiLlmAdapter.create({ apiKey: 'k', timeoutMs: 10 })).toThrow(/ASSISTANT_TIMEOUT_MS/);
  });
});
