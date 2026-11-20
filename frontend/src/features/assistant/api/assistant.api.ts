import { ApiError } from '@/shared/api/ApiError'
import { http, TOKEN_KEY } from '@/shared/api/http'
import type { AskHelpBody, HelpAnswer } from '@/features/assistant/types/assistant'

/**
 * Demo del asistente de ayuda: sólo existe si `VITE_ASSISTANT_ENABLED` vale
 * `true`. Sin la variable no hay botón ni pedido, y la app es la de siempre
 * (ver `features/assistant/CAMBIOS.md`).
 */
export const ASSISTANT_ENABLED = import.meta.env.VITE_ASSISTANT_ENABLED === 'true'

const PATH = '/help/assistant'

/**
 * El modelo puede tardar más que los 15 s por defecto de `http`; el backend
 * corta a los 30 s (`ASSISTANT_TIMEOUT_MS`), así que el cliente espera un poco
 * más para recibir su `502` en vez de cortar antes.
 */
const ASSISTANT_TIMEOUT_MS = 45_000

/** `POST /help/assistant` en JSON (propuesta §2). Devuelve lo que viene en `data`. */
export async function askHelpAssistant(body: AskHelpBody): Promise<HelpAnswer> {
    const res = await http.post<{ data: HelpAnswer }>(PATH, body, { timeout: ASSISTANT_TIMEOUT_MS })
    return res.data.data
}

export interface StreamOptions {
    /** Cada fragmento de texto, a medida que llega. */
    onDelta: (text: string) => void
    /** Corta el pedido (por ejemplo, al cerrar el panel). */
    signal?: AbortSignal
}

/**
 * `POST /help/assistant` en streaming (`Accept: text/event-stream`, propuesta
 * §2). Llama a `onDelta` con cada fragmento y devuelve la respuesta definitiva
 * del evento `done`, que manda sobre lo que se fue mostrando.
 *
 * **La única excepción a "siempre `http`"** (`frontend/CLAUDE.md`): axios no
 * transmite por partes en el navegador. Para no duplicar la renovación de la
 * sesión, un `401` se reintenta por `http` en JSON, que ya la resuelve (y
 * cierra la sesión si no se puede). El resto de los errores se convierte en
 * `ApiError` con el mismo sobre que usa `http`.
 */
export async function streamHelpAssistant(body: AskHelpBody, { onDelta, signal }: StreamOptions): Promise<HelpAnswer> {
    const token = localStorage.getItem(TOKEN_KEY)
    let res: Response
    try {
        res = await fetch(endpointUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
            signal,
        })
    } catch (error) {
        if (signal?.aborted) throw error
        throw new ApiError(0, 'Error de red. Verificá tu conexión a internet.')
    }

    if (res.status === 401) return askHelpAssistant(body)
    if (!res.ok) throw await errorFromResponse(res)
    if (!res.body) throw new ApiError(0, 'El navegador no pudo leer la respuesta.')

    return readEvents(res.body, onDelta)
}

/** Misma base que `http` (`VITE_API_URL` o `/api`), como URL absoluta para `fetch`. */
function endpointUrl(): string {
    const base = http.defaults.baseURL ?? '/api'
    return new URL(`${base}${PATH}`, window.location.href).toString()
}

/** Un error anterior al primer evento llega en JSON, con el sobre del contrato (§5.2). */
async function errorFromResponse(res: Response): Promise<ApiError> {
    const retryAfter = Number(res.headers.get('retry-after'))
    const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null
    try {
        const { error } = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } }
        const details =
            error?.details && typeof error.details === 'object' && !('retryAfterSeconds' in error.details)
                ? (error.details as Record<string, string>)
                : null
        return new ApiError(
            res.status,
            error?.message ?? 'Ocurrió un error inesperado.',
            error?.code ?? null,
            details,
            retryAfterSeconds,
        )
    } catch {
        return new ApiError(res.status, 'Ocurrió un error inesperado.', null, null, retryAfterSeconds)
    }
}

/** Lee los eventos SSE (`event:` + `data:`, separados por una línea en blanco). */
async function readEvents(stream: ReadableStream<Uint8Array>, onDelta: (text: string) => void): Promise<HelpAnswer> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    for (;;) {
        const { value, done } = await reader.read()
        if (value) buffer += decoder.decode(value, { stream: true })

        let boundary = buffer.indexOf('\n\n')
        while (boundary !== -1) {
            const block = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            const result = handleEvent(block, onDelta)
            if (result) return result
            boundary = buffer.indexOf('\n\n')
        }

        if (done) throw new ApiError(0, 'La respuesta del asistente se cortó. Intentá de nuevo.')
    }
}

/** Procesa un evento. Devuelve la respuesta con `done`; con `error`, lo lanza. */
function handleEvent(block: string, onDelta: (text: string) => void): HelpAnswer | null {
    let event = 'message'
    let data = ''
    for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data += line.slice(5).trim()
    }
    if (!data) return null
    const payload = JSON.parse(data)

    if (event === 'delta') onDelta(payload.text)
    if (event === 'done') return payload as HelpAnswer
    if (event === 'error') {
        throw new ApiError(payload.code === 'ASSISTANT_UNAVAILABLE' ? 502 : 500, payload.message, payload.code)
    }
    return null
}
