import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateInterruptiveActBody } from '@/features/cases/types/interruptiveAct'
import { createInterruptiveAct } from './interruptiveActs.api'
import { casesKeys } from './cases.keys'

/**
 * Registro de un acto interruptivo (HU31).
 *
 * Reinicia la prescripción de la causa, que el backend recalcula en cada
 * lectura: por eso se vuelve a pedir el detalle (V4 §3.9). Invalidar el
 * detalle arrastra también la línea de vida, que cuelga de su clave. Los
 * listados se invalidan porque la alerta de prescripción puede cambiar.
 */
export function useRegisterInterruptiveAct(caseId: number) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (body: CreateInterruptiveActBody) => createInterruptiveAct(caseId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: casesKeys.detail(caseId) })
            queryClient.invalidateQueries({ queryKey: casesKeys.lists() })
        },
    })
}
