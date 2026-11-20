import { ValidationError } from '@shared/domain/domain-error';

export type TurnRole = 'user' | 'assistant';

export interface ConversationTurn {
  readonly role: TurnRole;
  readonly content: string;
}

/**
 * The conversation the client sends with every question (proposal §2): the
 * server keeps no history, so this is all the assistant knows of what was
 * said before.
 *
 * The shape (1 to 20 turns, known roles, 1 to 2000 characters) is checked by
 * the request DTO, as every `400` of form is. What is left here is the one
 * rule about the conversation as a whole: it has to end with the user's
 * question, otherwise there is nothing to answer.
 */
export class Conversation {
  private constructor(readonly turns: readonly ConversationTurn[]) {}

  static create(turns: readonly ConversationTurn[]): Conversation {
    if (turns.length === 0) {
      throw Conversation.invalid('Debe incluir entre 1 y 20 mensajes.');
    }
    if (turns[turns.length - 1].role !== 'user') {
      throw Conversation.invalid('El último mensaje debe ser del usuario.');
    }
    return new Conversation(turns.map(({ role, content }) => ({ role, content })));
  }

  /** The proposal's `400`, with the problem under `details.messages`. */
  private static invalid(message: string): ValidationError {
    return new ValidationError('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
      messages: message,
    });
  }
}
