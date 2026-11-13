import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DeleteCaseBody } from '@/features/cases/types/caseDeletion'
import { deleteCase } from './cases.api'
import { casesKeys } from './cases.keys'
import { invalidateCaseCounters } from './invalidateCaseCounters'

/**
 * Dar de baja la causa (HU21).
 *
 * El detalle se REMUEVE, no se invalida: invalidarlo dispararía un GET de la
 * causa recién dada de baja, que responde 404 (D-97). Remover `detail(id)` se
 * lleva también la línea de vida, que cuelga de él.
 *
 * Los listados se invalidan todos: la causa sale de cualquiera de ellos.
 */
export function useDeleteCase(caseId: number) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationKey: casesKeys.mutation(caseId, 'delete'),
        mutationFn: (body: DeleteCaseBody | undefined) => deleteCase(caseId, body),
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: casesKeys.detail(caseId) })
            queryClient.invalidateQueries({ queryKey: casesKeys.lists() })
            invalidateCaseCounters(queryClient)
        },
    })
}