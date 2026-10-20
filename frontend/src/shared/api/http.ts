import axios, { type InternalAxiosRequestConfig } from 'axios'
import { ApiError } from './ApiError'

/**
 * Parseo de los errores de la API.
 *
 * El contrato (`docs/api contract v1.md` §4.2) fija una sola forma para
 * todas las respuestas de error:
 *
 * ```json
 * { "error": { "code": "...", "message": "...", "details": null } }
 * ```
 *
 * Antes este archivo aceptaba las tres formas que suelen salir de un
 * middleware de Express/Nest (`message`, `error`, `errors`) porque el
 * formato no estaba definido. Ahora sí lo está, así que se parsea eso y
 * queda una sola red de seguridad —un `message` suelto en la raíz— para el
 * caso de que algún endpoint todavía no haya migrado. Esa red **no** es un
 * formato soportado: si aparece, hay que corregir el backend.
 */

/** Lo que se logró sacar del cuerpo del error. */
interface ParsedError {
    message: string
    code: string | null
    details: Record<string, string> | null
}

/**
 * `details` sólo se acepta como objeto plano campo → mensaje, que es lo que
 * define el contrato. Cualquier otra cosa (un arreglo, un objeto anidado) se
 * descarta en vez de mostrarse mal.
 */
function parseDetails(value: unknown): Record<string, string> | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null

    const details: Record<string, string> = {}
    for (const [field, message] of Object.entries(value)) {
        if (typeof message === 'string' && message.trim() !== '') details[field] = message
    }
    return Object.keys(details).length > 0 ? details : null
}

function parseErrorBody(body: unknown): ParsedError | null {
    if (typeof body !== 'object' || body === null) return null
    const root = body as Record<string, unknown>

    // Forma estándar: { error: { code, message, details } }
    if (typeof root.error === 'object' && root.error !== null) {
        const envelope = root.error as Record<string, unknown>
        const message = typeof envelope.message === 'string' ? envelope.message.trim() : ''
        if (message !== '') {
            return {
                message,
                code: typeof envelope.code === 'string' && envelope.code.trim() !== ''
                    ? envelope.code
                    : null,
                details: parseDetails(envelope.details),
            }
        }
    }

    /*
     * Un `message` en la raíz. Cubre dos casos:
     *
     * 1. El 401 de POST /auth/login, que el contrato define aparte como
     *    { statusCode, error: "Unauthorized", message } — el único error sin
     *    el envoltorio, y sin código.
     * 2. La red de seguridad del comentario de arriba.
     *
     * En los dos el código queda en null: no hay ninguno que leer, y no se
     * inventa uno para no hacerle creer a una pantalla que el backend lo mandó.
     */
    if (typeof root.message === 'string' && root.message.trim() !== '') {
        return { message: root.message.trim(), code: null, details: null }
    }

    return null
}

/** Mensajes para cuando el backend no manda ninguno. */
const FALLBACK_MESSAGES: Record<number, string> = {
    400: 'Los datos enviados no son válidos.',
    401: 'Tu sesión expiró. Volvé a iniciar sesión.',
    403: 'No tenés permiso para realizar esta acción.',
    404: 'No encontramos lo que buscabas.',
    409: 'Ese registro ya existe o está siendo utilizado.',
    422: 'No se pudo completar la operación.',
    429: 'Demasiadas peticiones. Esperá un momento antes de reintentar.',
}

/**
 * El `429` siempre trae `Retry-After` en segundos (V3 §4, Límite de
 * frecuencia). Headers HTTP son case-insensitive y axios ya los normaliza a
 * minúscula, así que alcanza con un nombre.
 */
function parseRetryAfter(headers: unknown): number | null {
    if (typeof headers !== 'object' || headers === null) return null
    const raw = (headers as Record<string, unknown>)['retry-after']
    const seconds = Number(raw)
    return typeof raw !== 'undefined' && Number.isFinite(seconds) && seconds > 0 ? seconds : null
}

function fallbackMessage(status: number): string {
    return FALLBACK_MESSAGES[status] ?? (status >= 500 ? 'Error del servidor. Intentá de nuevo en unos minutos.'
        : 'Ocurrió un error inesperado.'
    )
}

/**
 * Con `responseType: 'blob'` (la descarga de un modelo formal, V4 §3.10)
 * axios no convierte la respuesta, tampoco la de error: el JSON del error
 * llega adentro de un Blob y `parseErrorBody` no lo puede leer. Se lee acá,
 * antes de armar el `ApiError`, para que el error se vea como el de
 * cualquier otro pedido (`code`, `message` y `details` del contrato).
 */
async function readBlobErrorBody(error: unknown): Promise<void> {
    if (!axios.isAxiosError(error) || !error.response) return
    const { data } = error.response
    if (!(data instanceof Blob)) return
    try {
        error.response.data = JSON.parse(await data.text())
    } catch {
        // No era JSON: queda como estaba y toApiError usa el mensaje genérico.
    }
}

function toApiError(error: unknown): ApiError {
    // Un error que no sea de axios, un bug nuestro
    if (!axios.isAxiosError(error)) {
        return new ApiError(0, 'Ocurrió un error inesperado en la aplicación.');
    }

    //Backend caido, sin red, timeout
    if  (!error.response) {
        const message = error.code === 'ECONNABORTED' ? 'El servidor tardó demasiado en responder. Intentá de nuevo en unos minutos.' : 'Error de red. Verificá tu conexión a internet.';
        return new ApiError(0, message);
    }

    const {status, data, headers} = error.response
    const parsed = parseErrorBody(data)
    const retryAfterSeconds = parseRetryAfter(headers)

    if (parsed) {
        return new ApiError(status, parsed.message, parsed.code, parsed.details, retryAfterSeconds)
    }

    // El backend respondió con un error, pero sin nada legible adentro.
    return new ApiError(status, fallbackMessage(status), null, null, retryAfterSeconds)
}
export const http = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? '/api',
    timeout:15000,
    headers: {'Content-Type': 'application/json'}
})
/**
 * Qué hacer cuando ya no hay forma de seguir con esta sesión.
 *
 * Lo registra el proveedor de sesión al montarse. `shared/api` no sabe qué
 * significa cerrar sesión ni a dónde navegar después: sólo avisa.
 */
let onUnauthenticated: (() => void) | null = null

export function setUnauthenticatedHandler(handler: (() => void) | null): void {
    onUnauthenticated = handler
}

/**
 * Cómo renovar el token de acceso. Devuelve `true` si lo consiguió.
 *
 * También lo registra el proveedor de sesión. Acá no se sabe qué endpoint
 * hay que llamar ni dónde se guarda el token: eso es del módulo de
 * autenticación. Lo que sí es de acá es *cuándo* hace falta renovar y cómo
 * evitar hacerlo diez veces a la vez.
 */
let renewSession: (() => Promise<boolean>) | null = null

export function setRenewHandler(handler: (() => Promise<boolean>) | null): void {
    renewSession = handler
}

/**
 * La renovación en curso, si hay una.
 *
 * Es lo que evita la tormenta: si una pantalla dispara cinco pedidos y los
 * cinco vuelven con el token vencido, se renueva **una sola vez** y los otros
 * cuatro esperan ese mismo resultado. No es un lujo: el backend rota el token
 * de renovación en cada uso y, si le llega uno ya usado, da por robada la
 * sesión y la revoca entera. Renovar de a cinco sería echarse solo.
 */
let renewalInFlight: Promise<boolean> | null = null

function renewOnce(): Promise<boolean> {
    if (renewalInFlight === null) {
        renewalInFlight = (renewSession?.() ?? Promise.resolve(false)).finally(() => {
            renewalInFlight = null
        })
    }
    return renewalInFlight
}

/**
 * Renueva ahora, sin esperar a que un pedido vuelva con el token vencido.
 *
 * Lo usa el proveedor de sesión para traer los roles actuales al abrir la
 * aplicación. Pasa por la misma puerta que las renovaciones por `401`: si ya
 * hay una en curso, se suma a esa en vez de lanzar otra.
 */
export function renewSessionNow(): Promise<boolean> {
    return renewOnce()
}

/** Marca en el pedido para no reintentarlo más de una vez. */
interface RetriableConfig extends InternalAxiosRequestConfig {
    vzRetried?: boolean
}

/**
 * Pedidos que no se renuevan ni se reintentan.
 *
 * - `/auth/refresh`: es la renovación misma; renovarla giraría para siempre.
 * - `/auth/logout`: el usuario se está yendo. Renovar la sesión para después
 *   cerrarla es gastar la única renovación que queda al pedo.
 */
const NON_RENEWABLE_PATHS = ['/auth/refresh', '/auth/logout']

http.interceptors.response.use(
    response => response,
    async (error: unknown) => {
        await readBlobErrorBody(error)
        const apiError = toApiError(error)

        /* Se compara el CÓDIGO y no el 401 pelado, porque hay dos errores
           distintos con ese mismo estado: `UNAUTHENTICATED` es "tu token no
           sirve", pero `INVALID_CREDENTIALS` es "te equivocaste al entrar", y
           ese no tiene que disparar nada —si no, cada intento fallido de
           login intentaría renovar una sesión que no existe—. */
        if (!apiError.is('UNAUTHENTICATED')) {
            return Promise.reject(apiError)
        }

        const config = axios.isAxiosError(error)
            ? (error.config as RetriableConfig | undefined)
            : undefined

        /* Tres razones para no intentar renovar:
           - no hay pedido que reintentar;
           - el que falló no admite renovación (ver arriba);
           - ya se reintentó una vez y volvió a fallar. */
        const renewable =
            config !== undefined &&
            !NON_RENEWABLE_PATHS.some((path) => config.url?.includes(path)) &&
            config.vzRetried !== true

        if (renewable && (await renewOnce())) {
            config.vzRetried = true
            // El interceptor de pedido vuelve a correr y toma el token nuevo.
            return http.request(config)
        }

        // No se pudo renovar: se acabó la sesión de verdad.
        onUnauthenticated?.()
        return Promise.reject(apiError)
    }
);
http.interceptors.request.use(
    config => {
        const token = getToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    }
);


/**
 * Clave del token de sesión en el almacenamiento del navegador.
 *
 * Se exporta para que tenga un solo dueño: quien escribe el token es
 * `features/auth/utils/sessionStorage.ts`, y si la clave estuviera copiada en
 * los dos lados, el día que cambie va a cambiar en uno solo.
 *
 * Acá se lee y nada más. La política de la sesión —cuándo se guarda, cuándo
 * se borra, cuánto dura— es del módulo de autenticación: `shared/api` no
 * tiene por qué saber que existe un login.
 */
export const TOKEN_KEY = 'vz.token'

function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
}

