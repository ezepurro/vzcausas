import { useQuery } from '@tanstack/react-query'
import { getCaseCover } from './cases.api'
import { casesKeys } from './cases.keys'

/**
 * La hoja de carátula en PDF (HU24), para la "Vista previa" de "Generar
 * expediente".
 *
 * - Sólo se pide con la vista previa abierta (`enabled`).
 * - `staleTime: 0` y `gcTime: 0`: el backend la arma en cada pedido con los
 *   datos vigentes de la causa (D-94), y un PDF no vale la pena guardarlo
 *   en memoria después de cerrar la vista previa.
 * - Sin reintentos, como la lista de documentos.
 */
export function useCaseCover(caseId: number, enabled: boolean) {
    return useQuery({
        queryKey: casesKeys.cover(caseId),
        queryFn: () => getCaseCover(caseId, 'inline'),
        enabled,
        staleTime: 0,
        gcTime: 0,
        retry: false,
    })
}
