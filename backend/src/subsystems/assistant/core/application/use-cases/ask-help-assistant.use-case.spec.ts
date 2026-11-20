import { ValidationError } from '@shared/domain/domain-error';
import { AssistantUnavailableError, TooManyAssistantRequestsError } from '../../domain/errors/assistant.errors';
import { LlmCompletion } from '../../domain/ports/llm.port';
import { AssistantReply } from '../../domain/value-objects/assistant-reply.vo';
import { AskHelpAssistant } from './ask-help-assistant.use-case';
import { FakeLlmPort, RecordingQuota, StaticManual, testManual, testProfile } from './test-support/assistant-fakes';

function setup(next: Partial<LlmCompletion> | Error = {}) {
  const llm = new FakeLlmPort(next);
  const quota = new RecordingQuota();
  const useCase = new AskHelpAssistant(new StaticManual(), llm, quota, testProfile);
  return { useCase, llm, quota };
}

const question = [{ role: 'user' as const, content: '¿Dónde registro una causa?' }];

describe('AskHelpAssistant', () => {
  it('C6 — sends the manual in the instructions and the conversation as is', async () => {
    const { useCase, llm } = setup();
    const turns = [
      { role: 'user' as const, content: 'Hola' },
      { role: 'assistant' as const, content: '¿En qué te ayudo?' },
      ...question,
    ];

    await useCase.execute({ userId: 7, turns });

    expect(llm.requests).toEqual([
      {
        model: 'modelo-de-prueba',
        system: `REGLAS\n${testManual.render()}`,
        turns,
        maxOutputTokens: 700,
      },
    ]);
  });

  it('C1/C7 — returns the answer and the resolved sources', async () => {
    const { useCase } = setup();

    const { reply } = await useCase.execute({ userId: 7, turns: question });

    expect(reply.answer).toBe('Respuesta.');
    expect(reply.sources).toEqual([{ id: 'causas-registrar', title: 'Registrar una causa' }]);
  });

  it('C9 — a refusal becomes the fixed answer', async () => {
    const { useCase } = setup({ outcome: 'REFUSED' });

    const { reply } = await useCase.execute({ userId: 7, turns: question });

    expect(reply).toMatchObject({ answer: AssistantReply.REFUSAL_ANSWER, sources: [] });
  });

  it('C10 — a truncated answer ends with the notice', async () => {
    const { useCase } = setup({ text: 'Primero', outcome: 'TRUNCATED' });

    const { reply } = await useCase.execute({ userId: 7, turns: question });

    expect(reply.answer).toBe(`Primero\n\n${AssistantReply.TRUNCATION_NOTICE}`);
  });

  it('C5/C15 — an invalid conversation is rejected before the quota and the model', async () => {
    const { useCase, llm, quota } = setup();

    await expect(
      useCase.execute({ userId: 7, turns: [{ role: 'assistant', content: 'Hola' }] }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(quota.consumedBy).toEqual([]);
    expect(llm.requests).toEqual([]);
  });

  it('C13 — over the quota, the model is never called', async () => {
    const { useCase, llm, quota } = setup();
    quota.rejectWith = new TooManyAssistantRequestsError(30);

    await expect(useCase.execute({ userId: 7, turns: question })).rejects.toBeInstanceOf(
      TooManyAssistantRequestsError,
    );
    expect(llm.requests).toEqual([]);
  });

  it('C11 — a provider failure propagates as is, and the question was charged', async () => {
    const { useCase, quota } = setup(new AssistantUnavailableError('TIMEOUT'));

    await expect(useCase.execute({ userId: 7, turns: question })).rejects.toBeInstanceOf(
      AssistantUnavailableError,
    );
    expect(quota.consumedBy).toEqual([7]);
  });
});
