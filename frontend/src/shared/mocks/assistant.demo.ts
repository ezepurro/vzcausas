import { delay, http, HttpResponse, type RequestHandler } from 'msw';

/**
 * Mock de la demo del asistente de ayuda (`POST /help/assistant`,
 * `docs/experimental/asistente/PROPUESTA_CONTRATO.md` §2).
 *
 * **Fuera de `ROUTES` a propósito:** `tests/unit/contract/endpoints.test.ts`
 * exige que todo lo de `ROUTES` exista en `docs/openapi`, y la demo no toca el
 * contrato oficial. `browser.ts` lo registra sólo con `VITE_ASSISTANT_ENABLED`,
 * y los tests lo enchufan con `server.use(...assistantDemoHandlers)`.
 *
 * No hay modelo: contesta frases fijas según palabras de la pregunta, con las
 * mismas secciones (`id`) que el manual borrador del backend.
 */

interface CannedAnswer {
    keywords: RegExp;
    answer: string;
    sources: { id: string; title: string }[];
}

const CANNED: CannedAnswer[] = [
    {
        keywords: /causa|sac|registrar/i,
        answer:
            'Podés registrar la causa desde **Nueva causa**, en el menú lateral. El número de SAC es opcional: si todavía no lo tenés, la causa queda sin fecha de inicio hasta que lo cargues.',
        sources: [{ id: 'causas-registrar', title: 'Registrar una causa' }],
    },
    {
        keywords: /acto|plazo|venc/i,
        answer:
            'El acto procesal lo registra el abogado responsable desde el detalle de la causa, con **Registrar acto procesal**. El plazo sale solo de la tabla del fuero.',
        sources: [{ id: 'actos-procesales', title: 'Registrar, modificar y anular actos procesales' }],
    },
    {
        keywords: /contraseñ|clave|ingres/i,
        answer:
            'Para cambiar la contraseña, usá **Cambiar contraseña**, junto a tu nombre al pie del menú lateral.',
        sources: [{ id: 'ingreso', title: 'Ingresar, cerrar sesión y cambiar la contraseña' }],
    },
];

const NOT_COVERED = 'El manual no cubre esa pregunta. Probá con otra forma de decirlo.';

/** Cuerpo de error del contrato, escrito a mano: `ASSISTANT_UNAVAILABLE` no está en `ErrorCode` (V6). */
const errorResponse = (status: number, code: string, message: string, details: unknown = null) =>
    HttpResponse.json({ error: { code, message, details } }, { status });

export const assistantDemoHandlers: RequestHandler[] = [
    http.post('*/help/assistant', async ({ request }) => {
        if (!request.headers.get('authorization')) {
            return errorResponse(401, 'UNAUTHENTICATED', 'La autenticación es requerida.');
        }

        const body = (await request.json()) as { messages?: { role: string; content: string }[] };
        const last = body.messages?.[body.messages.length - 1];
        if (!last || last.role !== 'user') {
            return errorResponse(400, 'VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                messages: 'El último mensaje debe ser del usuario.',
            });
        }

        const match = CANNED.find((canned) => canned.keywords.test(last.content));
        const data = match ? { answer: match.answer, sources: match.sources } : { answer: NOT_COVERED, sources: [] };

        if (request.headers.get('accept')?.includes('text/event-stream')) {
            return eventStream(data.answer.split(/(?<= )/).map((text) => ['delta', { text }] as const), ['done', data]);
        }

        await delay(600);
        return HttpResponse.json({ data });
    }),
];

type SseEvent = readonly [event: string, data: unknown];

/**
 * Una respuesta SSE que manda los eventos de a uno, con una pausa corta entre
 * cada uno, como el streaming real (propuesta §2).
 */
function eventStream(events: readonly SseEvent[], last: SseEvent): HttpResponse<ReadableStream> {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
        async start(controller) {
            for (const [event, data] of [...events, last]) {
                await delay(40);
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            }
            controller.close();
        },
    });
    return new HttpResponse(body, { headers: { 'Content-Type': 'text/event-stream' } });
}

/** Respuestas de error de la propuesta, para los tests (`server.use(...)`). */
export const assistantDemoErrors = {
    unavailable: () =>
        http.post('*/help/assistant', () =>
            errorResponse(
                502,
                'ASSISTANT_UNAVAILABLE',
                'El asistente no está disponible en este momento. Intentá de nuevo en unos minutos.',
            ),
        ),
    tooManyRequests: (retryAfterSeconds: number) =>
        http.post('*/help/assistant', () =>
            HttpResponse.json(
                {
                    error: {
                        code: 'TOO_MANY_REQUESTS',
                        message: 'Hiciste muchas preguntas seguidas. Esperá un momento antes de volver a preguntar.',
                        details: { retryAfterSeconds },
                    },
                },
                { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
            ),
        ),
    /** El streaming arranca y el proveedor se cae en el medio: un `delta` y después `error`. */
    failsMidway: () =>
        http.post('*/help/assistant', () =>
            eventStream(
                [['delta', { text: 'Para registrar ' }]],
                [
                    'error',
                    {
                        code: 'ASSISTANT_UNAVAILABLE',
                        message: 'El asistente no está disponible en este momento. Intentá de nuevo en unos minutos.',
                    },
                ],
            ),
        ),
};
