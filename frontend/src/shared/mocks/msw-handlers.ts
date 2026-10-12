/**
 * Capa MSW: traduce entre el `Request`/`Response` de la plataforma y el
 * servidor falso de `handlers.ts`.
 *
 * Acá **no hay lógica de negocio**. Todo lo que decide qué responde cada
 * endpoint vive en `handlers.ts`, que es una función pura y no sabe de MSW.
 * Este archivo sólo:
 *
 * 1. normaliza la url (saca el prefijo `/api`, `/v1` o `/api/v1`),
 * 2. deja pasar al backend real lo que esté en `passthrough`,
 * 3. aplica latencia y fallos forzados,
 * 4. convierte `{ status, body }` en una `HttpResponse`.
 *
 * Los mismos handlers se usan en el navegador (`browser.ts`, service worker)
 * y en Node (`server.ts`, para los tests).
 */

import { delay, http, passthrough, HttpResponse, type RequestHandler } from 'msw';
import { BASE_PATH, errorBody } from './contract';
import { resolveRequest, ROUTE_TABLE, type HttpMethod, type MockRequest } from './handlers';

/* ------------------------------------------------------------------ */
/* Configuración                                                       */
/* ------------------------------------------------------------------ */

export interface MockOptions {
    /**
     * Demora artificial de cada respuesta, en milisegundos. Sirve para ver
     * los estados de carga; 0 responde lo más rápido que pueda.
     */
    latencyMs: number;
    /** Loguea cada pedido en la consola con método, ruta y código. */
    log: boolean;
    /**
     * Fuerza el fallo de **todos** los pedidos, para probar el manejo de
     * errores sin tocar los handlers:
     *
     * - un número: responde con ese código HTTP;
     * - `'network'`: simula backend caído (`ApiError.isNetworkError`);
     * - `null`: comportamiento normal.
     */
    forceFailure: number | 'network' | null;
    /**
     * Rutas que **no** se mockean: salen al backend real.
     *
     * Es la razón de ser de MSW acá. A medida que el backend publica
     * endpoints, se los saca del mock de a uno sin tocar el resto:
     *
     * ```ts
     * configureMocks({ passthrough: ['/lawyers', /^\/auth\//] })
     * ```
     *
     * Se compara contra la ruta ya normalizada (sin prefijo, sin query).
     * Un string matchea exacto o como prefijo de segmento: `'/users'`
     * también cubre `/users/15`.
     */
    passthrough: (string | RegExp)[];
}

const options: MockOptions = {
    latencyMs: 300,
    log: true,
    forceFailure: null,
    passthrough: [],
};

/** Cambia la configuración en caliente. Devuelve cómo quedó. */
export function configureMocks(changes: Partial<MockOptions>): MockOptions {
    Object.assign(options, changes);
    return { ...options };
}

/** La configuración actual, para un panel de debug o un test. */
export function mockOptions(): MockOptions {
    return { ...options };
}

/* ------------------------------------------------------------------ */
/* Normalización                                                       */
/* ------------------------------------------------------------------ */

/**
 * Prefijos que se descartan antes de pasarle la ruta al servidor falso.
 *
 * El contrato define la base `/api/v1`, pero `http.ts` usa
 * `VITE_API_URL ?? '/api'`. Aceptando las tres formas, el mock funciona
 * tanto si las features piden `/users` como `/v1/users` o `/api/v1/users`.
 */
const PREFIXES = [BASE_PATH, '/api', '/v1'];

export function normalizePath(pathname: string): string {
    // Se recorta en bucle, no una sola vez: si `baseURL` ya es `/api` y la
    // feature pide `/api/v1/users`, la url queda `/api/api/v1/users` y hay
    // que sacar los tres prefijos. Ninguna ruta del contrato se llama `api`
    // ni `v1`, así que no hay riesgo de comerse un recurso real.
    let path = pathname.replace(/\/+$/, '');
    let trimmed = true;
    while (trimmed) {
        trimmed = false;
        for (const prefix of PREFIXES) {
            if (path === prefix) {
                path = '';
                trimmed = true;
                break;
            }
            if (path.startsWith(`${prefix}/`)) {
                path = path.slice(prefix.length);
                trimmed = true;
                break;
            }
        }
    }
    return path === '' ? '/' : path;
}

function isPassthrough(path: string): boolean {
    return options.passthrough.some((rule) =>
        typeof rule === 'string' ? path === rule || path.startsWith(`${rule}/`) : rule.test(path),
    );
}

function readToken(headers: Headers): string | undefined {
    const raw = headers.get('Authorization');
    if (!raw) return undefined;
    const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
    return match ? match[1] : undefined;
}

async function readBody(request: Request): Promise<unknown> {
    const text = await request.text();
    if (text.trim() === '') return undefined;
    try {
        return JSON.parse(text);
    } catch {
        // Un cuerpo que no es JSON llega tal cual; los handlers lo ignoran.
        return text;
    }
}

/* ------------------------------------------------------------------ */
/* Resolver                                                            */
/* ------------------------------------------------------------------ */

async function resolver({ request }: { request: Request }) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);

    // Antes que nada: si la ruta está delegada al backend real, no se toca
    // el cuerpo (leerlo lo consumiría y el request saldría vacío).
    if (isPassthrough(path)) {
        if (options.log) console.info(`[mock] ${request.method} ${path} → backend real`);
        return passthrough();
    }

    if (options.latencyMs > 0) await delay(options.latencyMs);

    if (options.forceFailure === 'network') {
        if (options.log) console.info(`[mock] ${request.method} ${path} → error de red forzado`);
        // `HttpResponse.error()` es un fallo de red: no hay respuesta, que es
        // lo que `http.ts` traduce a `ApiError` con status 0.
        return HttpResponse.error();
    }

    const mockRequest: MockRequest = {
        method: request.method.toUpperCase() as HttpMethod,
        path,
        query: url.searchParams,
        body: await readBody(request),
        token: readToken(request.headers),
    };

    const result =
        typeof options.forceFailure === 'number'
            ? {
                  status: options.forceFailure,
                  body: errorBody('INTERNAL_SERVER_ERROR', 'Fallo forzado por el mock (configureMocks).'),
              }
            : resolveRequest(mockRequest);

    if (options.log) {
        const query = url.searchParams.toString();
        console.info(`[mock] ${mockRequest.method} ${path}${query ? `?${query}` : ''} → ${result.status}`);
    }

    if (result.status === 204 || result.body === null) {
        return new HttpResponse(null, { status: 204 });
    }
    return HttpResponse.json(result.body, { status: result.status, headers: result.headers });
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Los endpoints que el mock intercepta, derivados de la tabla de rutas de
 * `handlers.ts`.
 *
 * **Son la misma lista a propósito.** Antes esto era un arreglo escrito a
 * mano que tenía que coincidir con `ROUTES`, con un comentario advirtiendo
 * que si se desincronizaban el pedido salía a la red sin ningún error
 * visible. La advertencia no alcanzó: faltaba `POST /auth/refresh`, así que
 * la renovación del token nunca se simuló ni en dev ni en los E2E. Ahora la
 * ruta se declara una sola vez, al lado de su handler.
 *
 * Lo que no esté en la tabla no se toca (`onUnhandledRequest: 'bypass'`), así
 * que el HMR de Vite, las fuentes y los assets siguen andando.
 *
 * `*` al principio hace que el patrón matchee cualquier origen y cualquier
 * prefijo, así el mismo handler sirve para `/users`, `/api/users` y
 * `/api/v1/users` sin registrar una variante por cada uno.
 */
export const handlers: RequestHandler[] = ROUTE_TABLE.map(({ method, path }) =>
    http[method.toLowerCase() as Lowercase<HttpMethod>](`*${path}`, resolver),
);

/** `true` si el `.env` pide mocks (`VITE_USE_MOCKS=true`). */
export function mocksEnabledByEnv(): boolean {
    return import.meta.env.VITE_USE_MOCKS === 'true';
}
