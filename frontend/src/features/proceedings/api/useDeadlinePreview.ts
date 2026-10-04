import { useQuery } from '@tanstack/react-query'
import type { DeadlinePreviewParams } from '@/features/proceedings/types/proceduralAct'
import { getDeadlinePreview } from './proceduralActs.api'
import { proceduralActKeys } from './proceduralActs.keys'

/**
 * El vencimiento que tendría el acto, sin registrarlo (V3 D-20).
 *
 * `params` en `null` = todavía no hay qué calcular (falta el estado o una
 * fecha, o el estado es escrito a mano): la consulta no sale.
 *
 * Sin `keepPreviousData` a propósito: mientras recalcula, el panel dice
 * "Calculando…" en vez de mostrar una fecha que ya no corresponde a lo cargado.
 */
export function useDeadlinePreview(caseId: number, params: DeadlinePreviewParams | null) {
    return useQuery({
        // Con `params` en null la consulta no sale; la clave sólo tiene que ser estable.
        queryKey: params ? proceduralActKeys.preview(caseId, params) : proceduralActKeys.previews(caseId),
        queryFn: () => getDeadlinePreview(caseId, params as DeadlinePreviewParams),
        enabled: params !== null,
    })
}
