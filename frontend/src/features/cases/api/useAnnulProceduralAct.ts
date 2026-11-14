import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AnnulProceduralActBody } from '@/features/cases/types/proceduralActAnnulment'
import { annulProceduralAct } from './proceduralActs.api'
import { casesKeys } from './cases.keys'
import { refreshCaseAfterAct } from './refreshCaseAfterAct'

/** El acto y el cuerpo viajan juntos: `useMutation` pasa un solo valor a `mutationFn`. */
export interface AnnulProceduralActArgs {
    actId: number
    body: AnnulProceduralActBody | undefined
}

/**
 * Anular un acto procesal (HU29).
 *
 * Anular un acto cambia el estado y el vencimiento de la causa, y hasta la
 * reabre o la devuelve a "Iniciada" (D-99, CA-29.3 a 29.5). Como el registro
 * y la modificación, la mutación queda pendiente hasta que llegaron la causa
 * y la línea de vida nuevas (`refreshCaseAfterAct`), que además invalida los
 * listados y los contadores (CA-29.11).
 *
 * Lo que `proceedings` guardó del acto (`proceduralActKeys.detail`) no se
 * toca: `cases` no puede nombrar esa clave, y el acto ya no se ofrece en
 * ninguna pantalla para abrirlo.
 */
export function useAnnulProceduralAct(caseId: number) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationKey: casesKeys.mutation(caseId, 'annulProceduralAct'),
        mutationFn: ({ actId, body }: AnnulProceduralActArgs) => annulProceduralAct(caseId, actId, body),
        // Queda pendiente hasta que llega la causa nueva: ver `refreshCaseAfterAct`.
        onSuccess: () => refreshCaseAfterAct(queryClient, caseId),
    })
}
