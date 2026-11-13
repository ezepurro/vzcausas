import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Case, CreateCaseBody } from '@/features/cases/types/case'
import { createCase } from './cases.api'
import { casesKeys } from './cases.keys'
import { invalidateCaseCounters } from './invalidateCaseCounters'

/**
 * Alta de causa (HU18).
 *
 * Siembra el detalle con lo que devolvió el servidor, porque el alta navega
 * justo a esa pantalla: así el detalle se ve de entrada, sin un segundo viaje.
 * E invalida todos los listados, no sólo la página en pantalla: una causa nueva
 * cambia cualquiera de ellos.
 */
export function useCreateCase() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (body: CreateCaseBody) => createCase(body),
        onSuccess: (created: Case) => {
            queryClient.setQueryData(casesKeys.detail(created.id), created)
            queryClient.invalidateQueries({ queryKey: casesKeys.lists() })
            invalidateCaseCounters(queryClient)
        },
    })
}
