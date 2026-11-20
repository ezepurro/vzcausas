import { ValidationError } from '@shared/domain/domain-error';
import { Conversation } from './conversation.vo';

describe('Conversation (C5)', () => {
  it('keeps the turns in order when the last one is the user’s', () => {
    const conversation = Conversation.create([
      { role: 'user', content: '¿Dónde registro una causa?' },
      { role: 'assistant', content: 'Con Nueva causa.' },
      { role: 'user', content: '¿Y sin SAC?' },
    ]);

    expect(conversation.turns.map((t) => t.role)).toEqual(['user', 'assistant', 'user']);
  });

  it('C5 — rejects a conversation that ends with the assistant', () => {
    const act = () =>
      Conversation.create([
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: 'Hola, ¿en qué te ayudo?' },
      ]);

    expect(act).toThrow(ValidationError);
    try {
      act();
    } catch (error) {
      expect(error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos.',
        details: { messages: 'El último mensaje debe ser del usuario.' },
      });
    }
  });

  it('rejects an empty conversation with the same text as the DTO', () => {
    expect(() => Conversation.create([])).toThrow(
      expect.objectContaining({ details: { messages: 'Debe incluir entre 1 y 20 mensajes.' } }),
    );
  });
});
