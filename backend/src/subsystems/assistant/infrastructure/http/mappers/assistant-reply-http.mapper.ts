import { AssistantReply } from '../../../core/domain/value-objects/assistant-reply.vo';
import { HelpAssistantResponseDto } from '../dtos/help-assistant.response.dto';

/** Domain → HTTP for the help assistant. Copies field by field: no domain object leaks into the response. */
export class AssistantReplyHttpMapper {
  static toResponse(reply: AssistantReply): HelpAssistantResponseDto {
    return {
      answer: reply.answer,
      sources: reply.sources.map(({ id, title }) => ({ id, title })),
    };
  }
}
