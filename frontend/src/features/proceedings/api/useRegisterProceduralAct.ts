import { useMutation, useQueryClient } from '@tanstack/react-query'
import { casesKeys } from '@/features/cases'
import type { CreateProceduralActBody } from '@/features/proceedings/types/proceduralAct'
import { registerProceduralAct } from './proceduralActs.api'

/**
 * Registro de un acto procesal (HU26).
 *
 * El acto se aplica a la causa en el momento (V3 D-13): cambia su estado y su
 * plazo abierto. Por eso se invalidan el detalle de la causa —al que se vuelve
 * después de guardar— y todos los listados de causas.
 *
 * No se siembra un detalle del acto: no existe `GET` de un acto en este
 * sprint, así que esa entrada no tendría quién la lea.
 */
export function useRegisterProceduralAct(caseId: number) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (body: CreateProceduralActBody) => registerProceduralAct(caseId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: casesKeys.detail(caseId) })
            queryClient.invalidateQueries({ queryKey: casesKeys.lists() })
        },
    })
}
