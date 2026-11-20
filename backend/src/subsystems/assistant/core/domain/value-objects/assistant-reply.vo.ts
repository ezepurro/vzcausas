import { CompletionOutcome } from '../ports/llm.port';
import { HelpManual, ManualSource } from './help-manual.vo';

/**
 * What the client receives: `{ answer, sources }` (proposal §2).
 *
 * Built from the raw text of the model and never trusted as is:
 * - the sources line is cut out of the answer, so it never reaches the user;
 * - every id is checked against the manual, so `sources` never names a
 *   section that does not exist, whatever the model wrote.
 */
export class AssistantReply {
  /** Fixed answer when the model declines (proposal §2, "Respuesta que el modelo no quiso dar"). */
  static readonly REFUSAL_ANSWER =
    'No puedo ayudarte con eso. Puedo responder preguntas sobre cómo usar VZ Causas.';

  /** Appended when the answer hit the output cap (proposal §2, "Respuesta cortada"). */
  static readonly TRUNCATION_NOTICE =
    '(La respuesta quedó cortada. Probá con una pregunta más concreta.)';

  /**
   * The sources line the instructions ask for, as the last line of the answer:
   * `FUENTES: causas-registrar, prescripcion`. Tolerates the small variations a
   * model produces (case, bold markers) so a cosmetic slip does not leak the
   * line into the answer.
   */
  private static readonly SOURCES_LINE = /^\**\s*fuentes\s*:?\**\s*:?\s*(.*?)\**\s*$/i;

  private constructor(
    readonly answer: string,
    readonly sources: readonly ManualSource[],
  ) {}

  static fromModel(text: string, outcome: CompletionOutcome, manual: HelpManual): AssistantReply {
    if (outcome === 'REFUSED') return AssistantReply.refusal();

    const { body, ids } = AssistantReply.splitSourcesLine(text);
    if (body.length === 0) return AssistantReply.refusal();

    const sources = AssistantReply.resolveSources(ids, manual);
    const answer = outcome === 'TRUNCATED' ? `${body}\n\n${AssistantReply.TRUNCATION_NOTICE}` : body;
    return new AssistantReply(answer, sources);
  }

  static refusal(): AssistantReply {
    return new AssistantReply(AssistantReply.REFUSAL_ANSWER, []);
  }

  /**
   * Only the **last** non-empty line counts as the sources line. A line that
   * starts with "Fuentes:" in the middle of the answer is part of the answer.
   */
  private static splitSourcesLine(text: string): { body: string; ids: string[] } {
    const lines = text.trimEnd().split(/\r?\n/);
    const last = lines[lines.length - 1] ?? '';
    const match = AssistantReply.SOURCES_LINE.exec(last.trim());

    if (!match) return { body: text.trim(), ids: [] };

    const ids = match[1]
      .split(/[,;]/)
      .map((id) => id.trim().replace(/^[[`*]+|[\]`*.]+$/g, ''))
      .filter((id) => id.length > 0);
    return { body: lines.slice(0, -1).join('\n').trim(), ids };
  }

  /** Known ids only, without repeats, in the order the model named them. */
  private static resolveSources(ids: readonly string[], manual: HelpManual): ManualSource[] {
    const sources: ManualSource[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const source = manual.sourceFor(id);
      if (source) sources.push(source);
    }
    return sources;
  }
}
