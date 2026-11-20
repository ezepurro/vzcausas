import { Body, Controller, HttpStatus, Logger, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { DomainError } from '@shared/domain/domain-error';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import {
  AskHelpAssistant,
  AskHelpAssistantCommand,
  HelpStreamEvent,
} from '../../../core/application/use-cases/ask-help-assistant.use-case';
import { AskHelpAssistantRequestDto } from '../dtos/ask-help-assistant.request.dto';
import { EventStreamWriter } from '../event-stream/event-stream.writer';
import { AssistantReplyHttpMapper } from '../mappers/assistant-reply-http.mapper';

/**
 * `POST /help/assistant` (`docs/experimental/asistente/PROPUESTA_CONTRATO.md`
 * §2). Any authenticated user: no `@RequirePermissions`, as the proposal
 * requires no role. `200` and not `201`: nothing is created.
 *
 * Two answers for the same request, chosen by `Accept`:
 * - JSON (`{ data: { answer, sources } }`), the default;
 * - `text/event-stream`: `delta` events with the text as it is generated and
 *   one `done` with `{ answer, sources }`, the authoritative reply.
 *
 * Takes the raw response (`@Res()`) because a stream cannot be a return value.
 * Errors thrown before anything is written still go through the global filter
 * and answer as JSON with their status.
 */
@Controller({ path: 'help/assistant', version: ['1'] })
export class HelpAssistantController {
  private readonly logger = new Logger('HelpAssistantController');

  constructor(private readonly askHelpAssistant: AskHelpAssistant) {}

  @Post()
  async ask(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AskHelpAssistantRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const command: AskHelpAssistantCommand = {
      userId: user.userId,
      turns: dto.messages.map(({ role, content }) => ({ role, content })),
    };

    if (EventStreamWriter.isRequested(req)) {
      await this.stream(command, res);
      return;
    }

    const { reply } = await this.askHelpAssistant.execute(command);
    res.status(HttpStatus.OK).json({ data: AssistantReplyHttpMapper.toResponse(reply) });
  }

  private async stream(command: AskHelpAssistantCommand, res: Response): Promise<void> {
    // If the client goes away, stop asking the model.
    const cancel = new AbortController();
    res.on('close', () => cancel.abort());

    const events = this.askHelpAssistant.stream({ ...command, signal: cancel.signal });
    // Validation, quota and a provider that fails to start throw here, before
    // any header is sent: the filter answers them as JSON (proposal §2).
    const first = await events.next();

    const writer = new EventStreamWriter(res);
    writer.open();
    try {
      if (!first.done) this.write(writer, first.value);
      for await (const event of events) {
        if (cancel.signal.aborted) break;
        this.write(writer, event);
      }
    } catch (error) {
      // Headers are gone: the error travels as an event, with the same code
      // and message as the JSON answer (proposal §2).
      if (!(error instanceof DomainError)) this.logger.error(`stream failed: ${String(error)}`);
      if (!cancel.signal.aborted) writer.send('error', this.toErrorEvent(error));
    } finally {
      writer.close();
    }
  }

  private write(writer: EventStreamWriter, event: HelpStreamEvent): void {
    if (event.type === 'delta') writer.send('delta', { text: event.text });
    else writer.send('done', AssistantReplyHttpMapper.toResponse(event.reply));
  }

  private toErrorEvent(error: unknown): { code: string; message: string } {
    if (error instanceof DomainError) return { code: error.code, message: error.message };
    return { code: 'INTERNAL_SERVER_ERROR', message: 'Ocurrió un error interno inesperado.' };
  }
}
