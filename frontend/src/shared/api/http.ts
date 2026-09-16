import axios from 'axios'
import { ApiError } from './ApiError'

/** Forma del Cuerpo de error que devuelve Nest por Defecto,. 
 * Dejamos los campos opcionales 
 * para que no reviente en caso de que el back cambie */
interface NestErrorBody {
    statusCode?: number
    message?: string | string[]
    error?: string
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
    const body = data as NestErrorBody | undefined
    const rawMessage = body?.message
    if (Array.isArray(rawMessage) && rawMessage.length > 0) {
    return new ApiError(status, rawMessage[0], rawMessage)
    }

    if (typeof rawMessage === 'string' && rawMessage.trim() !== '') {
        return new ApiError(status, rawMessage)
    }

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
