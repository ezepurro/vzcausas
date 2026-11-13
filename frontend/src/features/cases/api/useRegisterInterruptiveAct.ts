import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateInterruptiveActBody } from '@/features/cases/types/interruptiveAct'
import { createInterruptiveAct } from './interruptiveActs.api'
import { refreshCaseAfterAct } from './refreshCaseAfterAct'
import { casesKeys } from './cases.keys'

/**
 * Registro de un acto interruptivo (HU31).
 *
 * Reinicia la prescripción de la causa, que el backend recalcula en cada
 * lectura: por eso se vuelve a pedir el detalle (V4 §3.9), con su línea de
 * vida. Los listados se invalidan porque la alerta de prescripción puede
 * cambiar. La mutación termina recién cuando llegaron la causa y la línea de
 * vida nuevas (`refreshCaseAfterAct`): así el modal se cierra con la barra de
 * prescripción ya reiniciada.
 */
export function useRegisterInterruptiveAct(caseId: number) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationKey: casesKeys.mutation(caseId, 'registerInterruptiveAct'),
        mutationFn: (body: CreateInterruptiveActBody) => createInterruptiveAct(caseId, body),
        onSuccess: () => refreshCaseAfterAct(queryClient, caseId),
    })
}
