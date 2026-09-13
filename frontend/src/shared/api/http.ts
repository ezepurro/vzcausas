import axios from 'axios'
import { ApiError } from './ApiError'

/**
 * Forma del cuerpo de error que manda el backend.
 *
 * Todos los campos son opcionales A PROPÓSITO. El backend es Express, que
 * no tiene un formato propio de error: lo define su middleware, así que
 * acá se aceptan las tres formas que se usan habitualmente y, si no llega
 * ninguna, se muestra el mensaje por defecto según el código HTTP. De esta
 * manera un cambio de formato del backend no rompe el front: en el peor
 * caso se pierde el detalle del mensaje.
 *
 * Cuando el equipo de backend fije el formato definitivo, se documenta en
 * src/api-contract/ y este parser se puede simplificar.
 */
interface ApiErrorBody {
    /** Un mensaje suelto, o la lista de errores de validación. */
    message?: string | string[]
    /** Alternativa a `message`; la usan varios middlewares de Express. */
    error?: string
    /** Errores de validación, como texto o como objeto por campo. */
    errors?: Array<string | { message?: string; msg?: string; field?: string; path?: string }>
}

/** Normaliza a lista: descarta lo que no sea texto con contenido. */
function toList(value: string | string[] | undefined): string[] {
    if (typeof value === 'string') return value.trim() === '' ? [] : [value]
    if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.trim() !== '')
    return []
}

/**
 * Saca del cuerpo los mensajes legibles, en orden de preferencia:
 * `message`, después `error` y por último `errors`. El primero de la lista
 * es el que se muestra; el resto queda en `details` para las pantallas que
 * quieran mostrar el error campo por campo.
 */
function extractMessages(body: ApiErrorBody | undefined): string[] {
    if (!body) return []

    const fromMessage = toList(body.message)
    if (fromMessage.length > 0) return fromMessage

    const fromError = toList(body.error)
    if (fromError.length > 0) return fromError

    return (body.errors ?? [])
        .map((item) => {
            if (typeof item === 'string') return item
            const text = item.message ?? item.msg
            if (!text) return ''
            // "sac: Requerido" se entiende mejor que "Requerido" suelto.
            const field = item.field ?? item.path
            return field ? `${field}: ${text}` : text
        })
        .filter((text) => text.trim() !== '')
}
/** Mensajes para cuando el backend no manda ninguno. */
const FALLBACK_MESSAGES: Record<number, string> = {
    400: 'Los datos enviados no son válidos.',
    401: 'Tu sesión expiró. Volvé a iniciar sesión.',
    403: 'No tenés permiso para realizar esta acción.',
    404: 'No encontramos lo que buscabas.',
    409: 'Ese registro ya existe o está siendo utilizado.',
    422: 'Los datos enviados no son válidos.',
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
    const messages = extractMessages(data as ApiErrorBody | undefined)

    if (messages.length > 0) {
        return new ApiError(status, messages[0], messages)
    }

    // El backend respondió con un error, pero sin nada legible adentro.
    return new ApiError(status, fallbackMessage(status))
}
export const http = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? '/api',
    timeout:15000,
    headers: {'Content-Type': 'application/json'}
})
http.interceptors.response.use(
    response => response,
    (error:unknown) => Promise.reject(toApiError(error)) 
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


/**LA FUNCION OBTENER TOKEN HOY EN DIA DEVUELVE NULL, MAS ADELANTE VA A FUNCIONAR */
function getToken(): string | null {
    return null
}
