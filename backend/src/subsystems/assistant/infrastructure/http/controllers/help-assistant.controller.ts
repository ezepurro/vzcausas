import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { AskHelpAssistant } from '../../../core/application/use-cases/ask-help-assistant.use-case';
import { AskHelpAssistantRequestDto } from '../dtos/ask-help-assistant.request.dto';
import { HelpAssistantResponseDto } from '../dtos/help-assistant.response.dto';
import { AssistantReplyHttpMapper } from '../mappers/assistant-reply-http.mapper';

/**
 * `POST /help/assistant` (`docs/experimental/asistente/PROPUESTA_CONTRATO.md`
 * §2). Any authenticated user: no `@RequirePermissions`, as the proposal
 * requires no role. `200` and not `201`: nothing is created.
 */
@Controller({ path: 'help/assistant', version: ['1'] })
export class HelpAssistantController {
  constructor(private readonly askHelpAssistant: AskHelpAssistant) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async ask(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AskHelpAssistantRequestDto,
  ): Promise<{ data: HelpAssistantResponseDto }> {
    const { reply } = await this.askHelpAssistant.execute({
      userId: user.userId,
      turns: dto.messages.map(({ role, content }) => ({ role, content })),
    });
    return { data: AssistantReplyHttpMapper.toResponse(reply) };
  }
}
