import { useQuery } from '@tanstack/react-query'
import { getProceduralAct } from './proceduralActs.api'
import { proceduralActKeys } from './proceduralActs.keys'

/**
 * El acto que se abre para modificarlo (HU28), con
 * `GET /cases/{caseId}/procedural-acts/{actId}` (D-85).
 *
 * No sale con ids inválidos: la página ya muestra que la dirección no
 * corresponde a ningún acto.
 */
export function useProceduralAct(caseId: number, actId: number) {
    return useQuery({
        queryKey: proceduralActKeys.detail(caseId, actId),
        queryFn: () => getProceduralAct(caseId, actId),
        enabled: Number.isInteger(caseId) && caseId > 0 && Number.isInteger(actId) && actId > 0,
    })
}
