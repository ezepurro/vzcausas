import { HelpManual } from './help-manual.vo';
import { AssistantReply } from './assistant-reply.vo';

const manual = HelpManual.create([
  { id: 'causas-registrar', title: 'Registrar una causa', body: 'Con Nueva causa.' },
  { id: 'perfiles', title: 'Perfiles y permisos', body: 'Tres perfiles.' },
]);

describe('AssistantReply (C7, C8, C9, C10)', () => {
  it('C7/C8 — takes the sources from the last line and cuts it out of the answer', () => {
    const reply = AssistantReply.fromModel(
      'Desde **Nueva causa**.\n\nFUENTES: causas-registrar, perfiles',
      'COMPLETED',
      manual,
    );

    expect(reply.answer).toBe('Desde **Nueva causa**.');
    expect(reply.sources).toEqual([
      { id: 'causas-registrar', title: 'Registrar una causa' },
      { id: 'perfiles', title: 'Perfiles y permisos' },
    ]);
  });

  it('C7 — drops ids that are not sections of the manual, and repeats', () => {
    const reply = AssistantReply.fromModel(
      'Respuesta.\nFUENTES: inventada, perfiles, perfiles',
      'COMPLETED',
      manual,
    );

    expect(reply.sources).toEqual([{ id: 'perfiles', title: 'Perfiles y permisos' }]);
  });

  it('C7 — tolerates case, bold markers and bracketed ids', () => {
    const reply = AssistantReply.fromModel(
      'Respuesta.\n**Fuentes:** [perfiles], `causas-registrar`.',
      'COMPLETED',
      manual,
    );

    expect(reply.answer).toBe('Respuesta.');
    expect(reply.sources.map((s) => s.id)).toEqual(['perfiles', 'causas-registrar']);
  });

  it('C7 — no sources line: sources empty, answer untouched', () => {
    const reply = AssistantReply.fromModel('Solo la respuesta.', 'COMPLETED', manual);

    expect(reply).toMatchObject({ answer: 'Solo la respuesta.', sources: [] });
  });

  it('C7 — an empty sources line means no sources, and is still cut out', () => {
    const reply = AssistantReply.fromModel('El manual no lo cubre.\nFUENTES:', 'COMPLETED', manual);

    expect(reply).toMatchObject({ answer: 'El manual no lo cubre.', sources: [] });
  });

  it('C7 — a "Fuentes:" line that is not the last one belongs to the answer', () => {
    const text = 'FUENTES: perfiles\nY algo más.';
    const reply = AssistantReply.fromModel(text, 'COMPLETED', manual);

    expect(reply).toMatchObject({ answer: text, sources: [] });
  });

  it('C9 — a refusal is the fixed answer with no sources, whatever the text', () => {
    const reply = AssistantReply.fromModel('texto parcial\nFUENTES: perfiles', 'REFUSED', manual);

    expect(reply).toMatchObject({ answer: AssistantReply.REFUSAL_ANSWER, sources: [] });
  });

  it('C9 — an answer that is only the sources line is treated as a refusal', () => {
    const reply = AssistantReply.fromModel('FUENTES: perfiles', 'COMPLETED', manual);

    expect(reply).toMatchObject({ answer: AssistantReply.REFUSAL_ANSWER, sources: [] });
  });

  it('C10 — a truncated answer keeps its text and ends with the notice', () => {
    const reply = AssistantReply.fromModel('Primero andá a', 'TRUNCATED', manual);

    expect(reply.answer).toBe(`Primero andá a\n\n${AssistantReply.TRUNCATION_NOTICE}`);
    expect(reply.sources).toEqual([]);
  });
});
