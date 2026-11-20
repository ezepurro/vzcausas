import { useMutation } from '@tanstack/react-query'

import { askHelpAssistant } from '@/features/assistant/api/assistant.api'

/**
 * Preguntarle al asistente. Es una mutación y no una consulta: cada pregunta
 * es un pedido nuevo, no se cachea ni se reintenta, y no toca la caché de
 * ningún otro recurso (el asistente no escribe nada).
 */
export function useAskHelpAssistant() {
    return useMutation({ mutationFn: askHelpAssistant })
}
