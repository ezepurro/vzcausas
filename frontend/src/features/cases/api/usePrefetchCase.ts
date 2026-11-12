import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getCase, getCaseTimeline } from './cases.api'
import { casesKeys } from './cases.keys'

/**
 * Pide de antemano lo que el detalle de una causa muestra primero: la causa y
 * su línea de vida. Se llama cuando el usuario apunta a "Ver detalle" (mouse
 * encima o foco con el teclado): el click suele llegar unos cientos de
 * milisegundos después, y ese tiempo ya queda ganado.
 *
 * - Usa las mismas claves que `useCase` y `useCaseTimeline`: el detalle lee
 *   lo que esto trajo, y si el pedido todavía está en vuelo, lo espera en vez
 *   de mandar otro.
 * - Lo que ya está en la caché y no está viejo no se vuelve a pedir
 *   (`staleTime` del `queryClient`): pasar el mouse varias veces no repite
 *   pedidos.
 * - Los documentos no: dependen de la carpeta (CA-38.5) y leerlos pasa por
 *   Drive, que es lo más lento. Pedirlos por pasar el mouse sería caro.
 * - Si falla, no pasa nada: el detalle lo vuelve a pedir y muestra el error.
 */
export function usePrefetchCase() {
    const queryClient = useQueryClient()

    return useCallback(
        (caseId: number) => {
            void queryClient.prefetchQuery({ queryKey: casesKeys.detail(caseId), queryFn: () => getCase(caseId) })
            void queryClient.prefetchQuery({
                queryKey: casesKeys.timeline(caseId),
                queryFn: () => getCaseTimeline(caseId),
            })
        },
        [queryClient],
    )
}
