import { CompletionOutcome } from '../ports/llm.port';
import { AssistantReply } from './assistant-reply.vo';
import { HelpManual } from './help-manual.vo';

/**
 * An answer that is still arriving from the model, piece by piece (proposal
 * §2, "Respuesta en streaming").
 *
 * The rule it keeps: **the sources line never reaches the client**, not even
 * for an instant. Text goes out as soon as it arrives, except the tail that
 * could still turn out to be that line: a last line that is empty or starts
 * like "FUENTES", and the blank or sources-looking lines right before it. As
 * soon as the tail is known to be ordinary text, it goes out too.
 *
 * Immutable, like the other value objects: `append` returns the next state and
 * what to send. When the model is done, `finish` builds the same
 * `AssistantReply` the non-streaming answer gets, which is the authoritative
 * text (refusal and truncation included).
 */
export class StreamingAnswer {
  private constructor(
    /** Everything the model has written so far. */
    private readonly text: string,
    /** How much of `text` has already been sent. */
    private readonly sent: number,
  ) {}

  static start(): StreamingAnswer {
    return new StreamingAnswer('', 0);
  }

  append(chunk: string): { answer: StreamingAnswer; emit: string } {
    const text = this.text + chunk;
    const safeEnd = Math.max(this.sent, StreamingAnswer.safeEnd(text));
    return { answer: new StreamingAnswer(text, safeEnd), emit: text.slice(this.sent, safeEnd) };
  }

  finish(outcome: CompletionOutcome, manual: HelpManual): AssistantReply {
    return AssistantReply.fromModel(this.text, outcome, manual);
  }

  /** Up to where the text can be sent without risking the sources line. */
  private static safeEnd(text: string): number {
    const lines = text.split('\n');
    const last = lines.pop() ?? '';

    // A last line that is ordinary text means nothing before it is held.
    if (!AssistantReply.couldBecomeSourcesLine(last)) return text.length;

    // The line break before it is held too: if the line turns out to be the
    // sources line, the answer ends without a dangling break.
    let end = Math.max(0, text.length - last.length - (lines.length > 0 ? 1 : 0));
    // Blank or sources-looking lines right before it are held with it.
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.trim() !== '' && !AssistantReply.isSourcesLine(line)) break;
      end -= line.length + 1;
    }
    return end;
  }
}
