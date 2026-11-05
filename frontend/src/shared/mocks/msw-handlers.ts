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
import { resolveRequest, ROUTE_TABLE, type HttpMethod, type MockForm, type MockRequest } from './handlers';

/* ------------------------------------------------------------------ */
/* Configuración                                                       */
/* ------------------------------------------------------------------ */

export interface MockOptions {
    /**
     * Demora artificial de cada respuesta, en milisegundos. Sirve para ver
     * los estados de carga; 0 responde lo más rápido que pueda.
     *
     * Con `[min, max]` cada pedido tarda un valor al azar dentro del rango,
     * como contra un servidor desplegado: así se ven respuestas que llegan
     * desordenadas y estados de carga de duración variable.
     */
    latencyMs: Latency;
    /**
     * Demora propia de algunas rutas, que gana sobre `latencyMs`. La clave es
     * `MÉTODO /ruta` tal como está en `ROUTE_TABLE` (`'GET /cases/:caseId'`);
     * lo que no esté en el perfil usa `latencyMs`. `null`: todas iguales.
     */
    latencyProfile: LatencyProfile | null;
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

/** Una demora fija o un rango `[min, max]`, en milisegundos. */
export type Latency = number | readonly [min: number, max: number];

/** Demora por ruta: `'GET /cases/:caseId'` → demora. */
export type LatencyProfile = Readonly<Record<string, Latency>>;

/**
 * Perfil `realistic`: lo que tardaría cada endpoint contra el backend
 * desplegado, para ver qué pantallas sufren la demora.
 *
 * **Son estimaciones, no mediciones**: el contrato no fija tiempos. El orden
 * sí sale de lo que hace el backend: lo que pasa por Google Drive (documentos,
 * carpeta, modelos, carátula y expediente en PDF) es lo más lento; los
 * tableros agregan sobre toda la cartera; la causa, su línea de vida y la
 * vista previa del plazo calculan en cada lectura (prescripción, días
 * hábiles). El login verifica la contraseña con hash, que es lento a
 * propósito. El resto (catálogos, listados chicos, altas simples) usa
 * `latencyMs`.
 */
export const REALISTIC_LATENCY: LatencyProfile = {
    // Sesión
    'POST /auth/login': [400, 900],
    'POST /auth/refresh': [150, 400],
    // Causas: se calculan en cada lectura
    'GET /cases': [300, 800],
    'GET /cases/:caseId': [250, 600],
    'GET /cases/:caseId/timeline': [250, 600],
    'GET /cases/:caseId/procedural-acts/deadline-preview': [150, 400],
    'POST /cases/:caseId/procedural-acts': [400, 900],
    'PATCH /cases/:caseId/procedural-acts/:actId': [400, 900],
    // El alta y la modificación pueden crear, renombrar o mover la carpeta
    'POST /cases': [1200, 2500],
    'PATCH /cases/:caseId': [800, 1800],
    // Tableros (reporting)
    'GET /dashboards/lawyer': [800, 1600],
    'GET /dashboards/administrator': [900, 1800],
    // Google Drive
    'POST /cases/:caseId/folder': [1500, 3500],
    'GET /cases/:caseId/documents': [1200, 2500],
    'GET /cases/:caseId/documents/:documentId/file': [1500, 3500],
    'POST /document-templates': [1500, 3000],
    'GET /document-templates/:templateId/file': [1000, 2500],
    // PDF armados por el backend
    'GET /cases/:caseId/cover': [1200, 2500],
    'POST /cases/:caseId/case-files': [3000, 6000],
};

/** Los perfiles que se pueden pedir por `VITE_MOCK_LATENCY_PROFILE`. */
const LATENCY_PROFILES: Readonly<Record<string, LatencyProfile>> = {
    realistic: REALISTIC_LATENCY,
};

const options: MockOptions = {
    latencyMs: 300,
    latencyProfile: null,
    log: true,
    forceFailure: null,
    passthrough: [],
};

/** Cambia la configuración en caliente. Devuelve cómo quedó. */
export function configureMocks(changes: Partial<MockOptions>): MockOptions {
    Object.assign(options, changes);
    return { ...options };
}

/** La demora de un pedido: la fija o una al azar dentro del rango. */
function pickLatency(latency: Latency): number {
    if (typeof latency === 'number') return latency;
    const [min, max] = latency;
    return Math.round(min + Math.random() * Math.max(0, max - min));
}

/**
 * La demora que corresponde a una ruta de `ROUTE_TABLE`: la del perfil, si la
 * tiene, y si no `latencyMs`.
 */
export function latencyFor(method: HttpMethod, routePath: string, current: MockOptions = options): Latency {
    return current.latencyProfile?.[`${method} ${routePath}`] ?? current.latencyMs;
}

/**
 * Lee el perfil de `VITE_MOCK_LATENCY_PROFILE` (hoy, sólo `"realistic"`).
 * Devuelve `undefined` si no está o no se conoce, y ahí no hay perfil.
 */
export function latencyProfileFromEnv(raw: string | undefined): LatencyProfile | undefined {
    const name = raw?.trim().toLowerCase();
    return name ? LATENCY_PROFILES[name] : undefined;
}

/**
 * Lee la demora de `VITE_MOCK_LATENCY`: `"800"` es fija y `"400-1500"`, un
 * rango. Devuelve `undefined` si no está o no se entiende, y ahí queda el
 * default.
 */
export function latencyFromEnv(raw: string | undefined): Latency | undefined {
    const match = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(raw ?? '');
    if (!match) return undefined;
    const min = Number(match[1]);
    return match[2] === undefined ? min : [min, Math.max(min, Number(match[2]))];
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

/** Bytes → string de un carácter por byte, para poder cortar por posición. */
function bytesToBinary(bytes: Uint8Array): string {
    let out = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return out;
}

/** Un trozo cortado de `bytesToBinary` → texto, leyéndolo como UTF-8. */
function binaryToText(binary: string): string {
    return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

/**
 * Un cuerpo `multipart/form-data` (V4: modelos formales y adjuntos). De cada
 * archivo se guarda el nombre, el tamaño y el tipo: el contenido no le
 * importa al servidor falso.
 *
 * Se lee a mano y no con `request.formData()`: en los tests, el parser de Node
 * no reconoce los `File` de jsdom y revienta. Así anda igual en el navegador y
 * en Node.
 */
async function readForm(request: Request): Promise<MockForm> {
    const form: MockForm = { fields: {}, files: {} };
    const header = request.headers.get('Content-Type') ?? '';
    const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(header);
    if (!match) return form;

    const boundary = `--${(match[1] ?? match[2]).trim()}`;
    const binary = bytesToBinary(new Uint8Array(await request.arrayBuffer()));

    for (const rawPart of binary.split(boundary).slice(1)) {
        if (rawPart.startsWith('--')) break; // el cierre del formulario
        const part = rawPart.replace(/^\r\n/, '').replace(/\r\n$/, '');
        const split = part.indexOf('\r\n\r\n');
        if (split < 0) continue;

        const headers = binaryToText(part.slice(0, split));
        const content = part.slice(split + 4);
        const name = /name="([^"]*)"/i.exec(headers)?.[1];
        if (name === undefined) continue;

        const fileName = /filename="([^"]*)"/i.exec(headers)?.[1];
        if (fileName !== undefined) {
            const type = /Content-Type:\s*([^\r\n]+)/i.exec(headers)?.[1]?.trim() ?? '';
            form.files[name] = { name: fileName, size: content.length, type };
        } else {
            (form.fields[name] ??= []).push(binaryToText(content));
        }
    }
    return form;
}

function isMultipart(request: Request): boolean {
    return (request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('multipart/form-data');
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

/** La ruta de `ROUTE_TABLE` que atendió el pedido: de ahí sale su demora. */
type Route = (typeof ROUTE_TABLE)[number];

async function resolver({ request }: { request: Request }, route: Route) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);

    // Antes que nada: si la ruta está delegada al backend real, no se toca
    // el cuerpo (leerlo lo consumiría y el request saldría vacío).
    if (isPassthrough(path)) {
        if (options.log) console.info(`[mock] ${request.method} ${path} → backend real`);
        return passthrough();
    }

    const latency = pickLatency(latencyFor(route.method, route.path));
    if (latency > 0) await delay(latency);

    if (options.forceFailure === 'network') {
        if (options.log) console.info(`[mock] ${request.method} ${path} → error de red forzado`);
        // `HttpResponse.error()` es un fallo de red: no hay respuesta, que es
        // lo que `http.ts` traduce a `ApiError` con status 0.
        return HttpResponse.error();
    }

    const multipart = isMultipart(request);
    const mockRequest: MockRequest = {
        method: request.method.toUpperCase() as HttpMethod,
        path,
        query: url.searchParams,
        body: multipart ? undefined : await readBody(request),
        form: multipart ? await readForm(request) : undefined,
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
        const took = latency > 0 ? ` (${latency} ms)` : '';
        console.info(`[mock] ${mockRequest.method} ${path}${query ? `?${query}` : ''} → ${result.status}${took}`);
    }

    if (result.file) {
        // Las respuestas exitosas que no son JSON: un archivo (V4 §5.1, V5 §3.12).
        return new HttpResponse(result.file.content, {
            status: result.status,
            headers: {
                'Content-Type': result.file.contentType,
                'Content-Disposition': `${result.file.disposition ?? 'attachment'}; filename="${result.file.fileName}"`,
            },
        });
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
export const handlers: RequestHandler[] = ROUTE_TABLE.map((route) =>
    http[route.method.toLowerCase() as Lowercase<HttpMethod>](`*${route.path}`, (info) => resolver(info, route)),
);

/** `true` si el `.env` pide mocks (`VITE_USE_MOCKS=true`). */
export function mocksEnabledByEnv(): boolean {
    return import.meta.env.VITE_USE_MOCKS === 'true';
}
