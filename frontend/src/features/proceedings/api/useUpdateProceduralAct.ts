import { useMutation, useQueryClient } from '@tanstack/react-query'
import { casesKeys } from '@/features/cases'
import type { UpdateProceduralActBody } from '@/features/proceedings/types/proceduralAct'
import { updateProceduralAct } from './proceduralActs.api'
import { proceduralActKeys } from './proceduralActs.keys'

/**
 * Modificación de un acto procesal (HU28).
 *
 * Corregir un acto puede cambiar el estado y el vencimiento de la causa, y
 * hasta cerrarla o reabrirla (D-99). Como en el registro, se invalidan el
 * detalle de la causa —que arrastra su línea de vida— y todos los listados de
 * causas. El acto se reemplaza con lo que devolvió el servidor.
 */
export function useUpdateProceduralAct(caseId: number, actId: number) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (body: UpdateProceduralActBody) => updateProceduralAct(caseId, actId, body),
        onSuccess: (updated) => {
            queryClient.setQueryData(proceduralActKeys.detail(caseId, actId), updated)
            queryClient.invalidateQueries({ queryKey: casesKeys.detail(caseId) })
            queryClient.invalidateQueries({ queryKey: casesKeys.lists() })
        },
    })
}
