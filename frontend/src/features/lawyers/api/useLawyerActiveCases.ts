/**
 * Las causas activas del abogado, para el reparto de la baja (HU15, CA-15.2).
 *
 * Activa es la causa vigente que no está en un estado terminal (V6 §4). El
 * listado de causas trae también las terminales y el estado de cada una no
 * dice si es terminal: se cruza con los estados procesales de cada fuero,
 * como hace `isInTerminalState` de `proceedings` (que no publica nada).
 */

import { useQuery } from '@tanstack/react-query'

import { useProceduralStates, type ProceduralState } from '@/features/legal-params'
import { listLawyerCases } from '@/features/lawyers/api/lawyers.api'
import { lawyerKeys } from '@/features/lawyers/api/lawyers.keys'
import type { LawyerCase } from '@/features/lawyers/types/lawyerDeletion'

/** Los estados de un fuero entran en una página: son pocos. */
const STATES_LIMIT = 100

/** `true` si la causa está en un estado terminal ("Archivada", "Prescripta"). */
export function isTerminalCase(c: LawyerCase, states: readonly ProceduralState[]): boolean {
    const id = c.currentState.proceduralStateId
    if (id === null) return false
    return states.some((s) => s.id === id && s.terminal)
}

export function useLawyerActiveCases(lawyerId: number) {
    const casesQuery = useQuery({
        queryKey: lawyerKeys.cases(lawyerId),
        queryFn: () => listLawyerCases(lawyerId),
        // El reparto tiene que salir de lo que hay ahora (CA-15.10).
        staleTime: 0,
    })
    const criminal = useProceduralStates({ jurisdiction: 'CRIMINAL', page: 1, limit: STATES_LIMIT })
    const administrative = useProceduralStates({ jurisdiction: 'ADMINISTRATIVE', page: 1, limit: STATES_LIMIT })
    const amparo = useProceduralStates({ jurisdiction: 'AMPARO', page: 1, limit: STATES_LIMIT })

    const statesQueries = [criminal, administrative, amparo]
    const states = statesQueries.flatMap((q) => q.data?.data ?? [])
    const all = [casesQuery, ...statesQueries]

    const isPending = all.some((q) => q.isPending)
    const failed = all.find((q) => q.isError)

    const cases = isPending ? [] : (casesQuery.data ?? []).filter((c) => !isTerminalCase(c, states))

    return {
        cases,
        isPending,
        isError: failed !== undefined,
        error: failed?.error ?? null,
        isFetching: all.some((q) => q.isFetching),
        /** Vuelve a pedir las causas: tras un `409 LAWYER_HAS_DEPENDENCIES` se rearma el reparto. */
        refetch: () => Promise.all(all.map((q) => q.refetch())),
    }
}
