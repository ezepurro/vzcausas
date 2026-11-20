import { AssistantReply } from './assistant-reply.vo';
import { HelpManual } from './help-manual.vo';
import { StreamingAnswer } from './streaming-answer.vo';

const manual = HelpManual.create([
  { id: 'causas-registrar', title: 'Registrar una causa', body: 'Con Nueva causa.' },
]);

/** Feeds the chunks one by one and returns what was sent, chunk by chunk, and the final state. */
function feed(chunks: string[]) {
  let answer = StreamingAnswer.start();
  const emitted: string[] = [];
  for (const chunk of chunks) {
    const step = answer.append(chunk);
    answer = step.answer;
    emitted.push(step.emit);
  }
  return { answer, emitted, sent: emitted.join('') };
}

describe('StreamingAnswer (C8 while streaming)', () => {
  it('sends ordinary text as soon as it arrives', () => {
    const { emitted } = feed(['Desde **Nueva', ' causa**,', ' en el menú.']);

    expect(emitted).toEqual(['Desde **Nueva', ' causa**,', ' en el menú.']);
  });

  it('never sends the sources line, even split across chunks', () => {
    const { sent, answer } = feed(['Desde Nueva causa.\n', 'FUEN', 'TES: causas-', 'registrar']);

    expect(sent).toBe('Desde Nueva causa.');
    expect(sent).not.toContain('FUENTES');
    expect(answer.finish('COMPLETED', manual).sources).toEqual([
      { id: 'causas-registrar', title: 'Registrar una causa' },
    ]);
  });

  it('holds a line that starts like FUENTES and lets it go when it turns out to be text', () => {
    const { emitted } = feed(['Primero.\nFue', 'ra de eso, nada más.']);

    expect(emitted).toEqual(['Primero.', '\nFuera de eso, nada más.']);
  });

  it('holds blank lines before a possible sources line, and releases them with the next text', () => {
    const { emitted } = feed(['Uno.\n\n', 'Dos.']);

    expect(emitted).toEqual(['Uno.', '\n\nDos.']);
  });

  it('a "Fuentes:" line followed by more text was part of the answer: it goes out', () => {
    const { sent } = feed(['FUENTES: perfiles\n', 'Y algo más.']);

    expect(sent).toBe('FUENTES: perfiles\nY algo más.');
  });

  it('finish gives the authoritative answer: refusal and truncation included', () => {
    const { answer } = feed(['Primero andá a']);

    expect(answer.finish('TRUNCATED', manual).answer).toBe(`Primero andá a\n\n${AssistantReply.TRUNCATION_NOTICE}`);
    expect(answer.finish('REFUSED', manual).answer).toBe(AssistantReply.REFUSAL_ANSWER);
  });
});
