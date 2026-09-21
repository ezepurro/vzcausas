import axios from 'axios'
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
}

function fallbackMessage(status: number): string {
    return FALLBACK_MESSAGES[status] ?? (status >= 500 ? 'Error del servidor. Intentá de nuevo en unos minutos.'
        : 'Ocurrió un error inesperado.'
    )
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

    const {status, data} = error.response
    const parsed = parseErrorBody(data)

    if (parsed) {
        return new ApiError(status, parsed.message, parsed.code, parsed.details)
    }

    // El backend respondió con un error, pero sin nada legible adentro.
    return new ApiError(status, fallbackMessage(status))
}
export const http = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? '/api',
    timeout:15000,
    headers: {'Content-Type': 'application/json'}
})
/**
 * Qué hacer cuando el backend dice que no hay sesión válida.
 *
 * Lo registra el proveedor de sesión al montarse. `shared/api` no sabe qué
 * significa cerrar sesión ni a dónde navegar después: sólo avisa.
 */
let onUnauthenticated: (() => void) | null = null

export function setUnauthenticatedHandler(handler: (() => void) | null): void {
    onUnauthenticated = handler
}

http.interceptors.response.use(
    response => response,
    (error: unknown) => {
        const apiError = toApiError(error)

        /* Se compara el CÓDIGO y no el 401 pelado, porque hay dos errores
           distintos con ese mismo estado: `UNAUTHENTICATED` es "tu sesión no
           sirve", pero `INVALID_CREDENTIALS` es "te equivocaste al entrar", y
           ese no tiene que cerrar nada —si no, cada intento fallido de login
           dispararía un cierre de sesión que no existe—. */
        if (apiError.is('UNAUTHENTICATED')) onUnauthenticated?.()

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

