import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { CLOCK, ClockPort } from '../../../src/shared/domain/clock.port';
import { ASSISTANT_QUOTA } from '../../../src/subsystems/assistant/core/domain/ports/assistant-quota.port';
import { LLM_PORT } from '../../../src/subsystems/assistant/core/domain/ports/llm.port';
import { UsageLimits } from '../../../src/subsystems/assistant/core/domain/value-objects/usage-limits.vo';
import { InMemoryAssistantQuota } from '../../../src/subsystems/assistant/infrastructure/persistence/in-memory/in-memory-assistant-quota';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { FakeLlm } from '../../shared/fakes/llm.fake';
import { startTestApp, stopTestApp } from '../../shared/harness/test-app';

/*
 * Asistente de ayuda (demo). Contrato: docs/experimental/asistente/PROPUESTA_CONTRATO.md §2.
 * Escrito desde `.claude/plans/tests-asistente-ayuda.md`, no desde el código.
 *
 * Ningún test llama a Gemini: `LLM_PORT` es `FakeLlm`. El cupo por usuario se
 * baja a 3 por minuto para poder probarlo; por eso cada test usa su propio
 * `userId` y no se pisan. Las variantes de las fuentes, de la negativa y del
 * cupo están en los specs unitarios; acá queda la forma del contrato, cada
 * `code` una vez y el recorrido completo por HTTP. El 401 sin token está en
 * `test/smoke/app.int.spec.ts`.
 */

const URL = '/api/v1/help/assistant';
const PER_MINUTE = 3;

const ask = (content = '¿Dónde registro una causa?') => ({ messages: [{ role: 'user', content }] });

describe('POST /help/assistant', () => {
  let app: INestApplication;
  const llm = new FakeLlm();

  beforeAll(async () => {
    app = await startTestApp((b) =>
      b
        .overrideProvider(LLM_PORT)
        .useValue(llm)
        .overrideProvider(ASSISTANT_QUOTA)
        .useFactory({
          factory: (clock: ClockPort) =>
            new InMemoryAssistantQuota(clock, UsageLimits.create({ perMinute: PER_MINUTE, perDay: 60 })),
          inject: [CLOCK],
        }),
    );
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(() => llm.reset());

  const post = (body: unknown, userId: number, roles: TestRole[] = ['LAWYER']) =>
    request(app.getHttpServer())
      .post(URL)
      .set(loginAs({ userId, roles }))
      .send(body as object);

  describe('pregunta y respuesta', () => {
    it('C1/C6 — 200 con la forma exacta, y al modelo le llega el manual y la conversación', async () => {
      const turns = [
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: '¿En qué te ayudo?' },
        { role: 'user', content: '  ¿Dónde registro una causa?  ' },
      ];

      const data = expectData<{ answer: string; sources: { id: string; title: string }[] }>(
        await post({ messages: turns }, 101),
        200,
      );

      expect(Object.keys(data).sort()).toEqual(['answer', 'sources']);
      expect(data).toEqual({
        answer: 'Desde **Nueva causa**, en el menú lateral.',
        sources: [{ id: 'causas-registrar', title: 'Registrar una causa' }],
      });
      expect(llm.requests).toHaveLength(1);
      expect(llm.requests[0].system).toContain('### [causas-registrar] Registrar una causa');
      // El contenido llega recortado (proposal §2: sin espacios en los extremos).
      expect(llm.requests[0].turns).toEqual([
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: '¿En qué te ayudo?' },
        { role: 'user', content: '¿Dónde registro una causa?' },
      ]);
    });

    it.each<[TestRole[], number]>([
      [['ADMINISTRATOR'], 102],
      [['LAWYER'], 103],
      [['SECRETARY'], 104],
    ])('C2 — %j puede usarlo', async (roles, userId) => {
      expectData(await post(ask(), userId, roles), 200);
    });

    it('C9 — si el modelo se niega, 200 con el texto fijo y sin fuentes', async () => {
      llm.answerNext({ text: '', outcome: 'REFUSED' });

      expect(expectData(await post(ask(), 105), 200)).toEqual({
        answer: 'No puedo ayudarte con eso. Puedo responder preguntas sobre cómo usar VZ Causas.',
        sources: [],
      });
    });
  });

  describe('validación', () => {
    it.each<[string, unknown, Record<string, string>]>([
      ['sin messages', {}, { messages: 'Debe incluir entre 1 y 20 mensajes.' }],
      ['messages vacío', { messages: [] }, { messages: 'Debe incluir entre 1 y 20 mensajes.' }],
      [
        'más de 20 mensajes',
        { messages: Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' })) },
        { messages: 'Debe incluir entre 1 y 20 mensajes.' },
      ],
      ['rol desconocido', { messages: [{ role: 'system', content: 'x' }] }, { 'messages.0.role': 'Debe ser user o assistant.' }],
      ['contenido que no es texto', { messages: [{ role: 'user', content: 42 }] }, { 'messages.0.content': 'Debe tener entre 1 y 2000 caracteres.' }],
      ['contenido en blanco', { messages: [{ role: 'user', content: '   ' }] }, { 'messages.0.content': 'Debe tener entre 1 y 2000 caracteres.' }],
      [
        'contenido de 2001 caracteres',
        { messages: [{ role: 'user', content: 'a'.repeat(2001) }] },
        { 'messages.0.content': 'Debe tener entre 1 y 2000 caracteres.' },
      ],
    ])('C4 — %s → 400 con details exacto', async (_case, body, details) => {
      const res = await post(body, 201);

      expectError(res, 400, 'VALIDATION_ERROR', Object.keys(details));
      expect(res.body.error).toEqual({ code: 'VALIDATION_ERROR', message: 'Los datos enviados no son válidos.', details });
      expect(llm.requests).toEqual([]);
    });

    it('C5 — si el último mensaje no es del usuario, 400 y el modelo no se llama', async () => {
      const res = await post(
        { messages: [{ role: 'user', content: 'Hola' }, { role: 'assistant', content: 'Hola' }] },
        202,
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos.',
        details: { messages: 'El último mensaje debe ser del usuario.' },
      });
      expect(llm.requests).toEqual([]);
    });
  });

  describe('proveedor caído', () => {
    it('C11 — 502 ASSISTANT_UNAVAILABLE con el texto del contrato', async () => {
      llm.failNext();

      const res = await post(ask(), 301);

      expectError(res, 502, 'ASSISTANT_UNAVAILABLE');
      expect(res.body.error.message).toBe(
        'El asistente no está disponible en este momento. Intentá de nuevo en unos minutos.',
      );
    });
  });

  describe('límite por usuario', () => {
    it('C14 — pasado el cupo, 429 con Retry-After igual a details.retryAfterSeconds', async () => {
      for (let i = 0; i < PER_MINUTE; i++) expectData(await post(ask(), 401), 200);

      const res = await post(ask(), 401);

      // `expectError` solo admite `details` de texto (validación): el 429 se mira a mano.
      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Hiciste muchas preguntas seguidas. Esperá un momento antes de volver a preguntar.',
          details: { retryAfterSeconds: expect.any(Number) },
        },
      });
      const wait = res.body.error.details.retryAfterSeconds;
      expect(Number.isInteger(wait) && wait >= 1 && wait <= 60).toBe(true);
      expect(res.headers['retry-after']).toBe(String(wait));
      expect(llm.requests).toHaveLength(PER_MINUTE);
      // Otro usuario no se ve afectado.
      expectData(await post(ask(), 402), 200);
    });

    it('C15 — los pedidos inválidos no gastan cupo', async () => {
      for (let i = 0; i < PER_MINUTE + 2; i++) {
        expect((await post({ messages: [] }, 403)).status).toBe(400);
      }

      for (let i = 0; i < PER_MINUTE; i++) expectData(await post(ask(), 403), 200);
    });
  });

  describe('streaming (F4, Accept: text/event-stream)', () => {
    /** Pide en streaming y devuelve el cuerpo crudo y los eventos ya separados. */
    async function postStream(body: unknown, userId: number) {
      const res = await request(app.getHttpServer())
        .post(URL)
        .set(loginAs({ userId, roles: ['LAWYER'] }))
        .set('Accept', 'text/event-stream')
        .send(body as object)
        .buffer(true)
        .parse((response, done) => {
          let raw = '';
          response.setEncoding('utf8');
          response.on('data', (chunk: string) => (raw += chunk));
          response.on('end', () => done(null, raw));
        });
      const isStream = /text\/event-stream/.test(res.headers['content-type'] ?? '');
      const events =
        isStream && typeof res.body === 'string'
          ? res.body
              .split('\n\n')
              .filter((block: string) => block.trim())
              .map((block: string) => {
                const [eventLine, dataLine] = block.split('\n');
                return { event: eventLine.replace('event: ', ''), data: JSON.parse(dataLine.replace('data: ', '')) };
              })
          : [];
      return { res, events };
    }

    it('manda el texto en deltas, nunca la línea FUENTES, y cierra con done { answer, sources }', async () => {
      const { res, events } = await postStream(ask(), 501);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/event-stream/);
      const deltas = events.filter((e) => e.event === 'delta');
      expect(deltas.length).toBeGreaterThan(1);
      expect(deltas.map((e) => e.data.text).join('')).toBe('Desde **Nueva causa**, en el menú lateral.');
      expect(events[events.length - 1]).toEqual({
        event: 'done',
        data: {
          answer: 'Desde **Nueva causa**, en el menú lateral.',
          sources: [{ id: 'causas-registrar', title: 'Registrar una causa' }],
        },
      });
    });

    it('lo que falla antes de empezar responde JSON con su código: 400 y 502', async () => {
      const invalid = await postStream({ messages: [] }, 502);
      expect(invalid.res.status).toBe(400);
      expect(invalid.res.headers['content-type']).toMatch(/application\/json/);

      llm.failNext();
      const unavailable = await postStream(ask(), 503);
      expect(unavailable.res.status).toBe(502);
      expect(unavailable.res.headers['content-type']).toMatch(/application\/json/);
    });

    it('si el proveedor falla en el medio, después de los deltas llega un evento error', async () => {
      llm.failStreamAfter(2);

      const { res, events } = await postStream(ask(), 504);

      expect(res.status).toBe(200);
      expect(events.filter((e) => e.event === 'delta')).toHaveLength(2);
      expect(events[events.length - 1]).toEqual({
        event: 'error',
        data: {
          code: 'ASSISTANT_UNAVAILABLE',
          message: 'El asistente no está disponible en este momento. Intentá de nuevo en unos minutos.',
        },
      });
    });
  });
});
