import { http } from '@/shared/api/http'
import type { AskHelpBody, HelpAnswer } from '@/features/assistant/types/assistant'

/**
 * Demo del asistente de ayuda: sólo existe si `VITE_ASSISTANT_ENABLED` vale
 * `true`. Sin la variable no hay botón ni pedido, y la app es la de siempre
 * (ver `features/assistant/CAMBIOS.md`).
 */
export const ASSISTANT_ENABLED = import.meta.env.VITE_ASSISTANT_ENABLED === 'true'

/**
 * El modelo puede tardar más que los 15 s por defecto de `http`; el backend
 * corta a los 30 s (`ASSISTANT_TIMEOUT_MS`), así que el cliente espera un poco
 * más para recibir su `502` en vez de cortar antes.
 */
const ASSISTANT_TIMEOUT_MS = 45_000

/** `POST /help/assistant` (propuesta §2). Devuelve lo que viene en `data`. */
export async function askHelpAssistant(body: AskHelpBody): Promise<HelpAnswer> {
    const res = await http.post<{ data: HelpAnswer }>('/help/assistant', body, {
        timeout: ASSISTANT_TIMEOUT_MS,
    })
    return res.data.data
}
