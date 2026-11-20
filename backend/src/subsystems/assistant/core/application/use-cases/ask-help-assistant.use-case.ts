import { Inject, Injectable } from '@nestjs/common';
import { AssistantProfile, HELP_PROFILE } from '../../domain/profiles/assistant-profile';
import { ASSISTANT_QUOTA, AssistantQuotaPort } from '../../domain/ports/assistant-quota.port';
import { HELP_MANUAL, HelpManualPort } from '../../domain/ports/help-manual.port';
import { LLM_PORT, LlmPort, LlmUsage } from '../../domain/ports/llm.port';
import { AssistantReply } from '../../domain/value-objects/assistant-reply.vo';
import { Conversation, ConversationTurn } from '../../domain/value-objects/conversation.vo';

export type AskHelpAssistantCommand = {
  userId: number;
  turns: readonly ConversationTurn[];
};

export type AskHelpAssistantResult = {
  reply: AssistantReply;
  usage: LlmUsage;
};

/**
 * `POST /help/assistant` (`docs/experimental/asistente/PROPUESTA_CONTRATO.md`
 * §2): answers a question about how to use the app, from the user manual.
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
    const conversation = Conversation.create(command.turns);
    const manual = await this.manualSource.load();

    this.quota.consume(command.userId);

    const completion = await this.llm.complete({
      model: this.profile.model,
      system: this.profile.instructions(manual),
      turns: conversation.turns,
      maxOutputTokens: this.profile.maxOutputTokens,
    });

    return {
      reply: AssistantReply.fromModel(completion.text, completion.outcome, manual),
      usage: completion.usage,
    };
  }
}
