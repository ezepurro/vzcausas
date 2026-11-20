import { ApiError } from '@/shared/api/ApiError'
import type { ChatEntry, HelpMessage } from '@/features/assistant/types/assistant'

/** Cuántos mensajes viajan como máximo en cada pedido (propuesta §2). */
export const MAX_MESSAGES_PER_REQUEST = 20

/**
 * La conversación que se manda: los últimos 20 mensajes, sin las fuentes ni
 * el `id` de pantalla. Si quedara empezando con una respuesta del asistente,
 * se saca: el asistente no necesita contexto a medias, y así la pregunta
 * siempre es la última (lo que exige el backend).
 */
export function toRequestMessages(entries: readonly ChatEntry[]): HelpMessage[] {
    const recent = entries.slice(-MAX_MESSAGES_PER_REQUEST)
    const start = recent.findIndex((entry) => entry.role === 'user')
    return (start === -1 ? [] : recent.slice(start)).map(({ role, content }) => ({ role, content }))
}

/**
 * El texto para mostrar cuando la pregunta falla. Discrimina por `code`, como
 * pide el contrato (§5.2): `429` dice cuánto esperar, `502` que el asistente no
 * está, y el resto usa el mensaje del servidor.
 */
export function errorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.code === 'TOO_MANY_REQUESTS') {
            const seconds = error.retryAfterSeconds
            return seconds
                ? `Hiciste muchas preguntas seguidas. Probá de nuevo en ${seconds} segundos.`
                : error.message
        }
        if (error.code === 'ASSISTANT_UNAVAILABLE' || error.isNetworkError) {
            return 'El asistente no está disponible en este momento. Intentá de nuevo en unos minutos.'
        }
        return error.message
    }
    return 'No se pudo enviar la pregunta. Intentá de nuevo.'
}
