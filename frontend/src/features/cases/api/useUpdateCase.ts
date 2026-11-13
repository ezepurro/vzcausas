import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpdateCaseBody } from '@/features/cases/types/case'
import { updateCase } from './cases.api'
import { casesKeys } from './cases.keys'
import { invalidateCaseCounters } from './invalidateCaseCounters'

/**
 * Modificar causa (HU19).
 *
 * El servidor devuelve la causa ya cambiada: con eso se reemplaza el detalle
 * en el momento. Además se vuelve a pedir (CA-19.8): cambiar el responsable
 * cambia quién registra los actos, y la carpeta puede haberse movido o
 * renombrado en Drive (D-104). Invalidar `detail(id)` refresca también la
 * línea de vida, que cuelga de él.
 *
 * Los listados se invalidan todos: el SAC, la carátula, el cliente y el
 * responsable se ven en cualquier página y entran en sus filtros.
 */
export function useUpdateCase(caseId: number) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (body: UpdateCaseBody) => updateCase(caseId, body),
        onSuccess: (updated) => {
            queryClient.setQueryData(casesKeys.detail(caseId), updated)
            //Se invalidan para que se recarguen al momento de hacer 
            // la edicion asi ya aparecen actualizadas las causas
            queryClient.invalidateQueries({ queryKey: casesKeys.detail(caseId) })
            queryClient.invalidateQueries({ queryKey: casesKeys.lists() })
            // Cambiar el responsable o las calificaciones mueve sus contadores.
            invalidateCaseCounters(queryClient)
        },
    })
}