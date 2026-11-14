import type { QueryClient } from '@tanstack/react-query'
import { clientKeys } from '@/features/clients'
import { lawyerKeys } from '@/features/lawyers'
import { legalQualificationKeys, proceduralStateKeys } from '@/features/legal-params'

/**
 * Marca viejos los listados que cuentan causas: la carga de cada abogado
 * (`activeCases`), las causas activas de cada cliente y de cada calificación,
 * y las causas de cada estado procesal (`caseCount`).
 *
 * Los calcula el backend y cambian cada vez que una causa se registra, se
 * modifica, se da de baja o cambia de estado. Sin esto, "Abogados", "Clientes",
 * "Estados y plazos" y "Calificaciones legales" mostraban el número de antes
 * durante el minuto que dura la caché.
 *
 * `refetchType: 'none'`: sólo se marcan. Varios de estos listados están
 * montados en la pantalla que guarda (los selects del alta) y no muestran el
 * contador: volver a pedirlos ahí serían pedidos de más. Se piden de nuevo
 * cuando se entra a la pantalla que sí lo muestra.
 */
export function invalidateCaseCounters(queryClient: QueryClient): void {
    for (const queryKey of [
        lawyerKeys.lists(),
        clientKeys.lists(),
        legalQualificationKeys.lists(),
        proceduralStateKeys.lists(),
    ]) {
        queryClient.invalidateQueries({ queryKey, refetchType: 'none' })
    }
}
