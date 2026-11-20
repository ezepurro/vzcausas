import { Inject, Injectable } from '@nestjs/common';
import { AssistantProfile, HELP_PROFILE } from '../../domain/profiles/assistant-profile';
import { ASSISTANT_QUOTA, AssistantQuotaPort } from '../../domain/ports/assistant-quota.port';
import { HELP_MANUAL, HelpManualPort } from '../../domain/ports/help-manual.port';
import { CompletionOutcome, LLM_PORT, LlmPort, LlmRequest, LlmUsage } from '../../domain/ports/llm.port';
import { AssistantReply } from '../../domain/value-objects/assistant-reply.vo';
import { Conversation, ConversationTurn } from '../../domain/value-objects/conversation.vo';
import { HelpManual } from '../../domain/value-objects/help-manual.vo';
import { StreamingAnswer } from '../../domain/value-objects/streaming-answer.vo';

export type AskHelpAssistantCommand = {
  userId: number;
  turns: readonly ConversationTurn[];
  /** Cancels the call to the model (a closed stream). */
  signal?: AbortSignal;
};

export type AskHelpAssistantResult = {
  reply: AssistantReply;
  usage: LlmUsage;
};

/** What a streamed answer sends: text as it arrives, then the authoritative reply. */
export type HelpStreamEvent =
  | { readonly type: 'delta'; readonly text: string }
  | { readonly type: 'done'; readonly reply: AssistantReply };

/**
 * `POST /help/assistant` (`docs/experimental/asistente/PROPUESTA_CONTRATO.md`
 * §2): answers a question about how to use the app, from the user manual. Two
 * ways of delivering the same answer: whole (`execute`) or piece by piece
 * (`stream`).
 *
 * Coordinates and decides nothing: the conversation decides whether there is
 * a question to answer, the quota whether this user may ask now, the profile
 * what the model is told, and the reply what of the model's text reaches the
 * client. Reads no data of the firm (no case, client or lawyer), which is why
 * the answer does not depend on who asks (RN11 has nothing to filter).
 *
 * Order: content validation, then the quota, then the model. A request that
 * fails validation is not charged; one that reaches the model is, even if the
 * provider then fails, so retrying in a loop cannot hammer it.
 */
@Injectable()
export class AskHelpAssistant {
  constructor(
    @Inject(HELP_MANUAL) private readonly manualSource: HelpManualPort,
    @Inject(LLM_PORT) private readonly llm: LlmPort,
    @Inject(ASSISTANT_QUOTA) private readonly quota: AssistantQuotaPort,
    @Inject(HELP_PROFILE) private readonly profile: AssistantProfile,
  ) {}

  async execute(command: AskHelpAssistantCommand): Promise<AskHelpAssistantResult> {
    const { manual, request } = await this.prepare(command);
    const completion = await this.llm.complete(request);

    return {
      reply: AssistantReply.fromModel(completion.text, completion.outcome, manual),
      usage: completion.usage,
    };
  }

  /**
   * The same answer as it is generated. Nothing runs until the first event is
   * asked for, so validation, quota and a provider that fails to start all
   * surface on that first `next()`: the HTTP adapter waits for it before
   * sending headers, and those errors still answer as JSON.
   *
   * The text goes through `StreamingAnswer`, so the sources line never leaks;
   * the closing `done` carries the authoritative reply.
   */
  async *stream(command: AskHelpAssistantCommand): AsyncGenerator<HelpStreamEvent> {
    const { manual, request } = await this.prepare(command);

    let answer = StreamingAnswer.start();
    let outcome: CompletionOutcome = 'COMPLETED';

    for await (const event of this.llm.stream(request)) {
      if (event.type === 'end') {
        outcome = event.outcome;
        continue;
      }
      const step = answer.append(event.text);
      answer = step.answer;
      if (step.emit) yield { type: 'delta', text: step.emit };
    }

    yield { type: 'done', reply: answer.finish(outcome, manual) };
  }

  private async prepare(command: AskHelpAssistantCommand): Promise<{ manual: HelpManual; request: LlmRequest }> {
    const conversation = Conversation.create(command.turns);
    const manual = await this.manualSource.load();

    this.quota.consume(command.userId);

    return {
      manual,
      request: {
        model: this.profile.model,
        system: this.profile.instructions(manual),
        turns: conversation.turns,
        maxOutputTokens: this.profile.maxOutputTokens,
        signal: command.signal,
      },
    };
  }
}
