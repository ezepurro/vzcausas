import { useMutation } from '@tanstack/react-query'

import { streamHelpAssistant, type StreamOptions } from '@/features/assistant/api/assistant.api'
import type { AskHelpBody } from '@/features/assistant/types/assistant'

export interface AskHelpVariables extends StreamOptions {
    body: AskHelpBody
}

/**
 * Preguntarle al asistente, con la respuesta en streaming. Es una mutación y
 * no una consulta: cada pregunta es un pedido nuevo, no se cachea ni se
 * reintenta, y no toca la caché de ningún otro recurso (el asistente no
 * escribe nada).
 */
export function useAskHelpAssistant() {
    return useMutation({
        mutationFn: ({ body, onDelta, signal }: AskHelpVariables) => streamHelpAssistant(body, { onDelta, signal }),
    })
}
